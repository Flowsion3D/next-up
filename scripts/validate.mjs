import fs from 'node:fs';
import assert from 'node:assert/strict';
const data=JSON.parse(fs.readFileSync('public/catalog.json','utf8'));
assert.equal(data.region,'US');assert.match(data.asOf,/^\d{4}-\d{2}-\d{2}$/);assert.ok(data.titles.length>=10);
const ids=new Set();
for(const t of data.titles){assert.ok(!ids.has(t.id),`duplicate ${t.id}`);ids.add(t.id);assert.ok(['tv','movie'].includes(t.type));for(const key of ['title','synopsis','metadataSource','imageSource'])assert.ok(t[key],`${t.id}: ${key}`);assert.ok(t.genres.length);assert.ok(fs.existsSync('public/'+t.image.replace(/^\.\//,'')),t.image);assert.ok(t.providers.length);assert.ok(t.socialEvidence.length);for(const p of t.providers){assert.equal(new URL(p.url).protocol,'https:');assert.equal(p.access,'subscription');}for(const e of t.socialEvidence){assert.equal(e.platform,'Reddit');assert.ok(new URL(e.url).hostname.endsWith('reddit.com'));assert.ok(e.summary);assert.match(e.publishedDate,/^\d{4}-\d{2}-\d{2}$/);assert.equal(e.checkedAt,data.asOf);assert.ok(e.author.startsWith('u/'));assert.equal(e.quote,null);}}
const total=fs.readdirSync('public/assets').reduce((n,f)=>n+fs.statSync('public/assets/'+f).size,0);
assert.ok(total<8_000_000,`assets too large ${total}`);
const html=fs.readFileSync('public/index.html','utf8');assert.ok(html.includes('lang="en"'));assert.ok(html.includes('viewport'));assert.ok(html.includes('./app.mjs'));
console.log(`Catalog validated: ${ids.size} titles, ${data.titles.reduce((n,t)=>n+t.socialEvidence.length,0)} Reddit sources, ${(total/1024/1024).toFixed(2)} MB artwork.`);
