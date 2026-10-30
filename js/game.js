/* ===== Game rules ===== */
const CARDS={
  b0:{cat:'basis',face:'0',nm:'関数',ex:()=>N(0)},
  b1:{cat:'basis',face:'1',nm:'関数',ex:()=>N(1)},
  bx:{cat:'basis',face:'<i>x</i>',nm:'関数',ex:()=>XX},
  bx2:{cat:'basis',face:'<i>x</i>²',nm:'関数',ex:()=>Pow(XX,F(2))},
  bsin:{cat:'basis',face:'sin <i>x</i>',nm:'関数',ex:()=>Fn('sin',XX)},
  bcos:{cat:'basis',face:'cos <i>x</i>',nm:'関数',ex:()=>Fn('cos',XX)},
  bexp:{cat:'basis',face:'<i>e</i><sup><i>x</i></sup>',nm:'関数',ex:()=>Fn('exp',XX)},
  dx:{cat:'calc',face:'d/d<i>x</i>',nm:'微分'},
  int:{cat:'calc',face:'∫',nm:'積分'},
  nabla:{cat:'calc',face:'∇',nm:'場全体を微分'},
  lap:{cat:'calc',face:'Δ',nm:'場全体を2回微分'},
  mul:{cat:'alg',face:'×',nm:'掛け算'},
  div:{cat:'alg',face:'÷',nm:'割り算'},
  sqrt:{cat:'alg',face:'√',nm:'平方根'},
  log:{cat:'alg',face:'log',nm:'対数'},
  inv:{cat:'alg',face:'<i>f</i>⁻¹',nm:'逆関数'},
  limp:{cat:'lim',face:'lim',sub:'<i>x</i>→+∞',nm:'極限'},
  limm:{cat:'lim',face:'lim',sub:'<i>x</i>→−∞',nm:'極限'},
  lim0:{cat:'lim',face:'lim',sub:'<i>x</i>→0',nm:'極限'},
  liminf:{cat:'lim',face:'liminf',sub:'<i>x</i>→+∞',nm:'下極限'},
  limsup:{cat:'lim',face:'limsup',sub:'<i>x</i>→+∞',nm:'上極限'},
};
const COUNTS={b0:2,b1:2,bx:5,bx2:1,bsin:4,bcos:4,bexp:4,div:5,mul:5,sqrt:5,inv:5,log:5,dx:8,int:8,nabla:10,lap:2,limp:2,limm:2,lim0:2,liminf:1,limsup:1};
const HAND=7, MAXSIZE=140;
const LIMTXT={limp:'lim<sub><i>x</i>→+∞</sub>',limm:'lim<sub><i>x</i>→−∞</sub>',lim0:'lim<sub><i>x</i>→0</sub>',liminf:'liminf<sub><i>x</i>→+∞</sub>',limsup:'limsup<sub><i>x</i>→+∞</sub>'};
/* players are seats 0..n-1. Text uses ⟦s⟧ tokens that the UI turns into "あなた" / a name for each viewer. */
const P=s=>`⟦${s}⟧`;
const alive=st=>st.players.map((p,i)=>p.alive?i:-1).filter(i=>i>=0);
function nextSeat(st,s){for(let k=1;k<=st.n;k++){const t=(s+k)%st.n;if(st.players[t].alive)return t;}return s;}
const isBasis=c=>CARDS[c].cat==='basis';
const VAN='<b class="gone">消滅</b>';

function kindOf(cs){
  if(!cs.length)return null;
  if(cs.length===1){const c=cs[0];
    if(isBasis(c))return c==='b0'?'needop':'add';
    if(c==='nabla'||c==='lap')return 'side';
    if(c==='dx'||c==='int')return 'stack';
    if(c==='mul'||c==='div')return 'needfn';
    return 'unary';}
  if(cs.every(c=>c==='dx')||cs.every(c=>c==='int'))return 'stack';
  if(cs.length===2){const op=cs.find(c=>c==='mul'||c==='div'),fn=cs.find(isBasis);if(op&&fn)return 'muldiv';}
  return null;
}

function cleanup(L,changed,steps){
  const dead=new Set();let lit0=0;
  for(const i of changed){if(zeroish(L[i])){if(L[i].k==='num')lit0++;else steps.push(`${H(L[i])} は恒等的に 0 → ${VAN}`);dead.add(i);}}
  if(lit0)steps.push(`0 になった基底${lit0>1?'（'+lit0+'個）':''}は${VAN}`);
  const order=[...L.keys()].filter(i=>!dead.has(i)&&!changed.includes(i)).concat(changed.filter(i=>!dead.has(i)));
  const kept=[];
  for(const i of order){const ks=kept.map(j=>L[j]);
    if(dependentOn(ks,L[i])){const pal=ks.find(k=>rank([k,L[i]])<2);
      steps.push(`${H(L[i])} は ${pal?H(pal):'他の基底'} と線形従属 → ${VAN}`);dead.add(i);}
    else kept.push(i);}
  if(L.ids)L.ids=L.ids.filter((_,i)=>!dead.has(i));
  const out=L.filter((_,i)=>!dead.has(i));L.length=0;L.push(...out);
}
const fail=why=>({ok:false,why});
function checkResult(r){
  if(size(r)>MAXSIZE)return '式が複雑になりすぎるので、このゲームでは出せません';
  if(!domainOK(r))return '定義域がほとんど空になる操作です（反則）';
  return null;
}

function simulate(st,who,cs,tg){
  const kind=kindOf(cs);
  if(!kind||kind==='needfn'||kind==='needop')return fail('カードの組み合わせが完成していません');
  if(cs.includes('lap')&&st.turnNo===0)return fail('最初のターンは Δ を使えません');
  const side=tg.side;
  if(side===undefined||!st.players[side])return fail('出す場所を選んでください');
  if(!st.players[side].alive)return fail('脱落したプレイヤーの場には出せません');
  const fields=st.fields.map(L=>L.slice());
  const L=fields[side],steps=[];
  L.ids=L.map((_,i)=>i);
  const fate={side,changed:kind==='side'?L.map((_,i)=>i):tg.i!==undefined?[tg.i]:[],diverged:false};
  const done=()=>({ok:true,fields,steps,fate:{...fate,ids:L.ids.slice(),removed:st.fields[side].map((_,i)=>i).filter(i=>!L.ids.includes(i))}});
  const sn=P(side);
  if(kind==='add'){
    const e=S(CARDS[cs[0]].ex());
    if(dependentOn(L,e))return fail(`${H(e)} は${sn}の場の基底と線形従属なので追加できません`);
    L.push(e);L.ids.push('new');steps.push(`${sn}の場に ${H(e)} を追加（次元 ${L.length}）`);
    return done();
  }
  if(kind==='side'){
    const n=cs[0]==='lap'?2:1,sym=cs[0]==='lap'?'Δ':'∇';
    if(!L.length)return fail('その場には基底がありません');
    for(let i=0;i<L.length;i++){let e=L[i];const from=e;
      for(let k=0;k<n;k++)e=deriv(e);
      const bad=checkResult(e);if(bad)return fail(bad);
      L[i]=e;steps.push(`${sym}：${H(from)} → ${H(e)}`);}
    cleanup(L,[...L.keys()],steps);
    return done();
  }
  if(tg.i===undefined||!L[tg.i])return fail('対象の基底を選んでください');
  const i=tg.i;let e=L[i];
  if(kind==='stack'){
    for(const c of cs){const r=c==='dx'?deriv(e):integ(e);
      if(!r)return fail(`${H(e)} の積分は、このゲームの計算機では式で表せません`);
      const bad=checkResult(r);if(bad)return fail(bad);
      steps.push(`${c==='dx'?'d/d<i>x</i>':'∫'}：${H(e)} → ${H(r)}`);e=r;
      if(zeroish(e))break;}
    L[i]=e;cleanup(L,[i],steps);return done();
  }
  if(kind==='muldiv'){
    const op=cs.find(c=>c==='mul'||c==='div'),fc=cs.find(isBasis),g=S(CARDS[fc].ex());
    if(op==='div'&&zeroish(g))return fail('0 では割れません');
    const r=S(op==='mul'?Mul(e,g):Mul(e,Pow(g,F(-1))));
    if(!(op==='mul'&&zeroish(g))){const bad=checkResult(r);if(bad)return fail(bad);}
    steps.push(`${H(e)} ${op==='mul'?'×':'÷'} ${H(g)} = ${H(r)}`);
    L[i]=r;cleanup(L,[i],steps);return done();
  }
  const c=cs[0];
  if(c in LIMTXT){
    const res=limitOf(e,c);
    if(res.bad==='domain')return fail(`${H(e)} はその方向に定義域が続かないので極限を取れません（反則）`);
    if(res.bad)return fail(`${H(e)} の極限は定まりません（反則）`);
    if(res.inf!==undefined){steps.push(`${LIMTXT[c]} ${H(e)} = ${res.inf>0?'+':'−'}∞ → 発散して${VAN}`);L.splice(i,1);L.ids.splice(i,1);fate.diverged=true;return done();}
    const v=approxF(res.val);
    if(fz(v)){steps.push(`${LIMTXT[c]} ${H(e)} = 0 → ${VAN}`);L.splice(i,1);L.ids.splice(i,1);return done();}
    const r=NF(v);steps.push(`${LIMTXT[c]} ${H(e)} = ${H(r)}（定数関数になる）`);
    L[i]=r;cleanup(L,[i],steps);return done();
  }
  let r;
  if(c==='sqrt')r=S(Pow(e,F(1,2)));
  else if(c==='log')r=S(Fn('ln',e));
  else{ if(!hasX(e))return fail('定数関数の逆関数は作れません');
    r=inverse(e);if(!r)return fail(`${H(e)} の逆関数は、このゲームの計算機では式で表せません`);}
  const bad=checkResult(r);if(bad)return fail(bad);
  const lab=c==='sqrt'?'√':c==='log'?'log':'<i>f</i>⁻¹';
  steps.push(`${lab}：${H(e)} → ${H(r)}`);
  L[i]=r;cleanup(L,[i],steps);return done();
}

function enumMoves(st,who,ownAddOnly){
  const h=st.hands[who],moves=[],seen=new Set();
  const sides=alive(st);
  const idxOf=id=>h.map((c,i)=>c===id?i:-1).filter(i=>i>=0);
  const each=(fn)=>{for(const s of sides)for(let j=0;j<st.fields[s].length;j++)fn({side:s,i:j});};
  h.forEach((c,i)=>{
    if(seen.has(c))return;seen.add(c);
    if(isBasis(c)){if(c!=='b0'){moves.push({idx:[i],cs:[c],tg:{side:who}});if(!ownAddOnly)for(const s of sides)if(s!==who)moves.push({idx:[i],cs:[c],tg:{side:s}});}return;}
    if(c==='nabla'||c==='lap'){for(const s of sides)moves.push({idx:[i],cs:[c],tg:{side:s}});return;}
    if(c==='dx'||c==='int'){const all=idxOf(c);for(let k=1;k<=Math.min(all.length,3);k++)each(tg=>moves.push({idx:all.slice(0,k),cs:Array(k).fill(c),tg}));return;}
    if(c==='mul'||c==='div'){const fs=new Set();h.forEach((f,fi)=>{if(isBasis(f)&&!fs.has(f)){fs.add(f);each(tg=>moves.push({idx:[i,fi],cs:[c,f],tg}));}});return;}
    each(tg=>moves.push({idx:[i],cs:[c],tg}));
  });
  return moves;
}

const robC=new Map();
function rob(e){const k=key(e);if(robC.has(k))return robC.get(k);
  let f=e,r=6;
  for(let i=0;i<5;i++){if(!hasX(f)){r=i+1;break;}f=deriv(f);if(size(f)>80){r=5;break;}if(zeroish(f)){r=i+1;break;}}
  if(robC.size>4000)robC.clear();robC.set(k,r);return r;}
function evalFor(st,f,me){
  const strength=L=>L.length?1000*L.length+12*L.reduce((s,e)=>s+rob(e),0):0;
  if(!f[me].length)return -1e6;
  const opps=alive(st).filter(s=>s!==me);
  const sc=opps.map(s=>strength(f[s]));
  const knocked=opps.filter(s=>!f[s].length).length;
  if(st.rule&&st.rule.win==='first'&&knocked)return 1e6;
  if(opps.length&&knocked===opps.length)return 1e6;
  if(!sc.length)return strength(f[me]);
  const sum=sc.reduce((a,b)=>a+b,0),mx=Math.max(...sc),mn=Math.min(...sc);
  const rest=st.rule&&st.rule.win==='first'?2*mn+.3*sum:.6*sum/sc.length+.6*mx;
  return strength(f[me])-rest+3000*knocked;
}
function chooseMove(st,who){
  let best=null;
  for(const m of enumMoves(st,who,true)){
    const r=simulate(st,who,m.cs,m.tg);if(!r.ok)continue;
    const sc=evalFor(st,r.fields,who)-4*(m.cs.length-1)+Math.random()*3;
    if(!best||sc>best.sc)best={...m,sc,r};}
  return best;
}
function hasLegal(st,who){for(const m of enumMoves(st,who,false))if(simulate(st,who,m.cs,m.tg).ok)return true;return false;}

function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
/* players: [{name,kind:'human'|'cpu'}], rule: {win:'last'|'first', time:0|30|60|90} */
function newGame(players,rule){
  players=players||[{name:'あなた',kind:'human'},{name:'CPU',kind:'cpu'}];
  const n=players.length;let deck,hands;
  do{deck=[];for(const k in COUNTS)for(let i=0;i<COUNTS[k];i++)deck.push(k);shuffle(deck);
    hands=players.map(()=>deck.splice(-HAND));}
  while(hands.some(h=>h.every(isBasis)));
  const start=()=>[N(1),XX,Pow(XX,F(2))];
  return {n,players:players.map(p=>({name:p.name,kind:p.kind,alive:true})),rule:Object.assign({win:'last',time:0},rule||{}),
    deck,grave:[],hands,fields:players.map(start),turn:0,turnNo:0,over:null,last:null,lastDraw:null,lastOut:[]};
}
function settle(st,who){
  const out=[];
  st.players.forEach((p,s)=>{if(p.alive&&!st.fields[s].length){p.alive=false;out.push(s);}});
  st.lastOut=out;
  const al=alive(st);
  if(st.rule.win==='first'&&out.some(s=>s!==who)){st.over={win:who,reason:'first',out};return;}
  if(al.length===1){st.over={win:al[0],reason:'last',out};return;}
  if(al.length===0){st.over={win:-1,reason:'none',out};return;}
  if(!st.deck.length){deckOut(st);return;}
}
function commit(st,who,idx,cs,r){
  st.fields=r.fields.map(L=>{const c=L.slice();return c;});
  const h=st.hands[who];
  [...idx].sort((a,b)=>b-a).forEach(i=>st.grave.push(h.splice(i,1)[0]));
  const before=h.length;while(h.length<HAND&&st.deck.length)h.push(st.deck.pop());
  st.lastDraw={who,n:h.length-before};
  st.last={who,cs,steps:r.steps};
  st.turnNo++;
  settle(st,who);
  st.turn=nextSeat(st,who);
}
function deckOut(st){
  const al=alive(st),dims=st.fields.map(L=>L.length);
  const mx=Math.max(...al.map(s=>dims[s]));const top=al.filter(s=>dims[s]===mx);
  st.over={win:top.length===1?top[0]:-1,reason:'deck',dims,top};
}
function overText(o,name){
  if(o.reason==='first')return `${name(o.win)}が${o.out.filter(s=>s!==o.win).map(name).join('・')}の場を 0 次元にしました`;
  if(o.reason==='last')return `最後まで場が残ったのは${name(o.win)}です`;
  if(o.reason==='deck')return `山札が尽きました（次元：${o.dims.map((d,s)=>`${name(s)} ${d}`).join('、')}）`+(o.win<0?`　同点：${o.top.map(name).join('・')}`:'');
  return '全員の場が 0 次元になりました';
}
function discardOne(st,who,i){
  const h=st.hands[who];st.grave.push(h.splice(i,1)[0]);st.lastDraw={who,n:0};if(st.deck.length){h.push(st.deck.pop());st.lastDraw.n=1;}
  st.last={who,cs:[],steps:[`${P(who)}は出せるカードがないので1枚捨てて引いた`]};
  st.turnNo++;
  st.lastOut=[];
  if(!st.deck.length)deckOut(st);
  st.turn=nextSeat(st,who);
}
