import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as recommender from '../public/recommender.mjs';
const fixture=JSON.parse(fs.readFileSync(new URL('../public/catalog.json',import.meta.url),'utf8'));
const source=fs.readFileSync(new URL('../public/app.mjs',import.meta.url),'utf8').replace(/^import .*?;\n/,'').replace(/\ninit\(\);\s*$/,'');
function app(){
  const nodes=new Map();
  const node=selector=>{if(!nodes.has(selector))nodes.set(selector,{innerHTML:'',textContent:'',style:{},classList:{add(){},remove(){},toggle(){}},setAttribute(){},removeAttribute(){},addEventListener(){},focus(){},querySelector:node,querySelectorAll:()=>[],showModal(){this.open=true;}});return nodes.get(selector);};
  const context=vm.createContext({...recommender,fixture,document:{querySelector:node,querySelectorAll:()=>[]},addEventListener(){},URL,Intl,console,setTimeout,clearTimeout});
  vm.runInContext(source+'\ndataset=fixture;catalog=fixture.titles;',context);
  return {context,node};
}
test('every catalog card and its source dialog render without runtime errors',()=>{
  const {context,node}=app();
  for(const title of fixture.titles){
    vm.runInContext(`spotlight=${JSON.stringify(title.id)};render();showTitleInfo(${JSON.stringify(title.id)});`,context);
    assert.ok(node('#current-card').innerHTML.includes(title.title),title.id);
    assert.ok(node('#info-content').innerHTML.includes('US streaming listings'));
    assert.ok(!node('#info-content').innerHTML.includes('undefined'));
  }
});
test('indirect provider links and thread dates are explicitly labeled',()=>{
  const {context,node}=app();
  vm.runInContext("spotlight='hacks';render();showTitleInfo('hacks');",context);
  assert.ok(node('#current-card').innerHTML.includes('HBO Max · via JustWatch'));
  assert.ok(node('#current-card').innerHTML.includes('Thread Oct 30, 2026'));
  assert.ok(node('#info-content').innerHTML.includes('not an independently verified exact comment timestamp'));
  vm.runInContext('generalInfo();',context);
  assert.ok(node('#info-content').innerHTML.includes('18 hand-curated titles'));
  assert.ok(node('#info-content').innerHTML.includes('21 attributed viewer summaries'));
});
