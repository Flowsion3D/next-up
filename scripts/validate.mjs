import fs from 'node:fs';
import assert from 'node:assert/strict';
const data=JSON.parse(fs.readFileSync('public/catalog.json','utf8'));
const isoDate=d=>typeof d==='string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d));
const https=url=>assert.equal(new URL(url).protocol,'https:');
assert.equal(data.region,'US');assert.ok(isoDate(data.asOf));assert.ok(data.titles.length>=10);
const ids=new Set();
for(const t of data.titles){
  assert.ok(!ids.has(t.id),`duplicate ${t.id}`);ids.add(t.id);
  assert.ok(['tv','movie'].includes(t.type));
  for(const key of ['title','synopsis','metadataSource','imageSource'])assert.ok(t[key],`${t.id}: ${key}`);
  https(t.metadataSource);https(t.imageSource);
  assert.ok(t.genres.length);assert.ok(fs.existsSync('public/'+t.image.replace(/^\.\//,'')),t.image);
  assert.ok(t.providers.length);assert.ok(t.socialEvidence.length);assert.ok(t.availabilitySources.length);
  for(const p of t.providers){
    https(p.url);assert.equal(p.access,'subscription');
    if(new URL(p.url).hostname.endsWith('justwatch.com'))assert.equal(p.listingService,'JustWatch');
  }
  for(const a of t.availabilitySources){https(a.url);assert.ok(isoDate(a.checkedAt));assert.ok(a.checkedAt<=data.asOf);}
  for(const e of t.socialEvidence){
    assert.equal(e.platform,'Reddit');assert.ok(['reddit.com','www.reddit.com'].includes(new URL(e.url).hostname));https(e.url);
    assert.ok(e.summary);assert.ok(isoDate(e.publishedDate));assert.ok(isoDate(e.checkedAt));
    assert.ok(e.publishedDate<=e.checkedAt);assert.ok(e.checkedAt<=data.asOf);
    assert.ok(['post','thread','comment'].includes(e.dateScope));assert.ok(e.author.startsWith('u/'));assert.equal(e.quote,null);
    if(e.commentDateLabel && !e.commentPublishedDate){assert.equal(e.dateScope,'post');assert.ok(e.dateNote);}
  }
}
const total=fs.readdirSync('public/assets').reduce((n,f)=>n+fs.statSync('public/assets/'+f).size,0);
assert.ok(total<8_000_000,`assets too large ${total}`);
const html=fs.readFileSync('public/index.html','utf8');assert.ok(html.includes('lang="en"'));assert.ok(html.includes('viewport'));assert.ok(html.includes('./app.mjs'));
console.log(`Catalog validated: ${ids.size} titles, ${data.titles.reduce((n,t)=>n+t.socialEvidence.length,0)} viewer references, ${(total/1024/1024).toFixed(2)} MB assets.`);
