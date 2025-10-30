import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import * as cheerio from 'cheerio';
import sanitizeHtml from 'sanitize-html';
import ejs from 'ejs';
import fs from 'fs';
import path from 'path';
import slugify from 'slugify';

// Default feeds include Local News tag feed; override via workflow inputs if desired
const feedEnv = process.env.FEEDS || 'https://www.boston.com/tag/local-news/feed';
const FEEDS = feedEnv.split(',').map(s => s.trim()).filter(Boolean);
const MAX_STORIES = parseInt(process.env.MAX_STORIES || '12', 10);

function absolutify(u, base){ if(!u) return null; try { return new URL(u, base).href } catch { return u } }
function pick($, sels){
  for (const s of sels){
    const el = $(s).first();
    if (el && el.length && el.text().trim()) return el.text().trim();
    if (el && el.length && el.attr && el.attr('content')) return el.attr('content').trim();
  }
  return '';
}

function extractArticle(html, baseUrl){
  const $ = cheerio.load(html);
  $('img').each((_,img)=>{
    const el=$(img);
    const ds=el.attr('data-src')||el.attr('data-original')||el.attr('data-image')||el.attr('data-lazy-src');
    if(ds && !el.attr('src')) el.attr('src', ds);
  });

  const title = pick($,['meta[property="og:title"]','meta[name="twitter:title"]','h1','title']);
  const dek   = pick($,['meta[property="og:description"]','meta[name="description"]','.dek, .subhead, .article__dek']);
  const author= pick($,['meta[name="author"]','[itemprop="author"]','.byline, .c-byline, .article__byline, .byline-name']);
  const pub   = pick($,['meta[property="article:published_time"]','time[datetime]','time']);

  let bodyEl = $('[itemprop="articleBody"]').first();
  if(!bodyEl.length) bodyEl = $('article').first();
  if(!bodyEl.length) bodyEl = $('.article-body, .article__content, .c-article-body, .story-content, .story-body').first();
  if(!bodyEl.length){
    const paras=[]; $('p').each((_,p)=>{ const t=$(p).text().trim(); if(t && t.length>60) paras.push(`<p>${$(p).html()}</p>`); });
    bodyEl = { html: () => paras.join('\n') };
  }
  bodyEl.find && bodyEl.find('a').each((_,a)=>{ const el=$(a); el.attr('href', absolutify(el.attr('href'), baseUrl)); });
  bodyEl.find && bodyEl.find('img').each((_,i)=>{ const el=$(i); el.attr('src', absolutify(el.attr('src'), baseUrl)); });

  const raw = bodyEl.html ? bodyEl.html() : '';
  const clean = sanitizeHtml(raw || '', {
    allowedTags: ['p','h2','h3','strong','em','a','img','ul','ol','li','blockquote','figure','figcaption','br','span','b','i'],
    allowedAttributes: { a:['href','title','target','rel'], img:['src','alt','title','width','height'], span:['class','style'] },
    transformTags: {
      a: (t, attrs) => ({ tagName:'a', attribs:{ href:absolutify(attrs.href, baseUrl), target:'_blank', rel:'noopener noreferrer' } }),
      img: (t, attrs) => ({ tagName:'img', attribs:{ src:absolutify(attrs.src, baseUrl), alt:attrs.alt || '' } })
    },
    allowedSchemes: ['http','https','mailto']
  });

  const hero = $('meta[property="og:image"]').attr('content') ||
               $('meta[name="twitter:image"]').attr('content') ||
               $('figure img').first().attr('src') ||
               $('img').first().attr('src');

  return { title: title || 'Untitled', dek, author, pub, hero: hero ? absolutify(hero, baseUrl) : null, body: clean };
}

async function fetchFeed(url){
  const xml = await axios.get(url, { timeout: 20000 }).then(r => r.data);
  const parser = new XMLParser({ ignoreAttributes:false, attributeNamePrefix:'' });
  const obj = parser.parse(xml);
  const channel = obj.rss?.channel || obj.feed;
  const items = channel.item || channel.entry || [];
  return items.map(it => ({
    title: (it.title && it.title.toString()) || '',
    link: (typeof it.link === 'object' && it.link?.href) || it.link || '',
    pubDate: it.pubDate || it.updated || it.published || '',
    description: it.description || it.summary || ''
  }));
}

async function main(){
  const outDir = path.join('docs','stories');
  fs.mkdirSync(outDir, { recursive: true });

  const template = fs.readFileSync(path.join('templates','story.ejs'),'utf8');
  let manifest = [];
  const manifestPath = path.join(outDir, 'manifest.json');
  try { manifest = JSON.parse(fs.readFileSync(manifestPath,'utf8')); } catch {}

  const seen = new Set(manifest.map(m => m.source));
  let gathered = [];
  for (const feed of FEEDS){
    try {
      const items = await fetchFeed(feed);
      for (const it of items){
        if (!it.link || seen.has(it.link)) continue;
        gathered.push(it);
      }
    } catch (e) {
      console.error('Feed error:', feed, e.message);
    }
  }

  gathered = gathered.slice(0, MAX_STORIES);

  for (const it of gathered){
    try {
      const resp = await axios.get(it.link, { headers:{'User-Agent':'RetroBoston/RSSAction'}, timeout: 20000 });
      const article = extractArticle(resp.data, it.link);
      const slug = (slugify(article.title, { lower:true, strict:true }).slice(0,80) || 'story');
      const rel = `stories/${slug}.html`;
      const html = ejs.render(template, { ...article, sourceUrl: it.link });
      fs.writeFileSync(path.join(outDir, `${slug}.html`), html, 'utf8');

      manifest.unshift({ title: article.title, path: rel, pub: article.pub || it.pubDate || '', dek: article.dek || '', source: it.link });
    } catch (e) {
      console.error('Article error:', it.link, e.message);
    }
  }

  manifest = manifest.slice(0, 200);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log('Built', Math.min(gathered.length, MAX_STORIES), 'stories.');
}

main().catch(e => { console.error(e); process.exit(1); });
