export const STORAGE_KEY = 'next-up-choices-v1';
export function emptyState() { return {version:1,votes:{},history:[]}; }
export function normalizeState(value,catalog) {
  const ids = new Set(catalog.map(t=>t.id));
  const state=emptyState();
  if(!value || typeof value!=='object' || value.version!==1) return state;
  if(value.votes && typeof value.votes==='object') for(const [id,vote] of Object.entries(value.votes)) if(ids.has(id) && (vote==='yes'||vote==='no')) state.votes[id]=vote;
  if(Array.isArray(value.history)) state.history=value.history.filter(x=>x && ids.has(x.id) && ['yes','no','clear'].includes(x.vote) && (x.previous===null || ['yes','no'].includes(x.previous))).slice(-300);
  return state;
}
export function affinities(catalog,votes) {
  const scores={};
  for(const title of catalog) {
    const vote=votes[title.id]; if(!vote) continue;
    for(const genre of title.genres||[]) scores[genre]=(scores[genre]||0)+(vote==='yes'?2:-1.5);
  }
  return scores;
}
export function rankTitles(catalog,state,{type='all',provider='all'}={}) {
  const tastes=affinities(catalog,state.votes);
  return catalog.filter(t=>!state.votes[t.id] && (type==='all'||t.type===type) && (provider==='all'||t.providers?.some(p=>p.name===provider))).map((t,index)=>({title:t,score:(t.genres||[]).reduce((a,g)=>a+(tastes[g]||0),0)/Math.sqrt(Math.max(1,(t.genres||[]).length)) + (catalog.length-index)*0.005})).sort((a,b)=>b.score-a.score).map(x=>x.title);
}
export function castVote(state,id,vote) {
  if(!['yes','no'].includes(vote)) return state;
  return {...state,votes:{...state.votes,[id]:vote},history:[...state.history,{id,vote,previous:state.votes[id]||null}].slice(-300)};
}
export function undoVote(state) {
  if(!state.history.length) return state;
  const last=state.history.at(-1),votes={...state.votes};
  if(last.previous) votes[last.id]=last.previous; else delete votes[last.id];
  return {...state,votes,history:state.history.slice(0,-1)};
}
export function reasonFor(title,catalog,state) {
  const saved=catalog.filter(t=>state.votes[t.id]==='yes');
  const similar=saved.map(t=>({t,overlap:t.genres.filter(g=>title.genres.includes(g)).length})).sort((a,b)=>b.overlap-a.overlap)[0];
  return similar?.overlap ? `Because you saved ${similar.t.title}` : 'A conversation worth checking out';
}
