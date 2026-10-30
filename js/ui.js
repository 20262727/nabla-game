(()=>{
let gid=0, G=newGame(), ME=0, MODE='cpu', NET=null, inbox=[], pendingSync=null, sel=[], msg='', err=false, busy=false, stuck=false, discMode=false, seq=0, shown=-1, dealt=-1;
let SETUP={count:2,win:'last',time:0};   // CPU-mode setup
const $=id=>document.getElementById(id);
const CATC={basis:'var(--basis)',calc:'var(--calc)',alg:'var(--alg)',lim:'var(--lim)'};
const myHand=()=>G.hands[ME]||[];
const selCards=()=>sel.map(i=>myHand()[i]);
const kind=()=>kindOf(selCards());
const meAlive=()=>!!(G.players[ME]&&G.players[ME].alive);
const myTurn=()=>G.turn===ME&&!G.over&&!busy&&meAlive();
const nm=s=>s===ME?'あなた':(G.players[s]?G.players[s].name:'?');
const tx=t=>String(t).replace(/⟦(\d)⟧/g,(m,s)=>nm(+s));
const face=c=>{const d=CARDS[c];return d.sub?`${d.face}<sub>${d.sub}</sub>`:d.face;};
const calm=()=>{try{return matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(e){return false;}};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let MYNAME='';try{MYNAME=localStorage.getItem('nablaName')||'';}catch(e){}
const myName=()=>(MYNAME||'').trim().slice(0,10)||'プレイヤー';
function cardInner(cd){const d=CARDS[cd];
  return `<span class="f${d.face.replace(/<[^>]+>/g,'').length>3&&!d.sub?' sm':''}">${d.face}</span>${d.sub?`<span class="s">${d.sub}</span>`:''}<span class="n">${d.nm}</span>`;}

function hintText(){
  if(G.over)return '';
  if(!meAlive())return 'あなたは脱落しました。最後まで観戦できます。';
  if(busy)return G.turn===ME?'計算中…':`${nm(G.turn)} の番です…`;
  if(G.turn!==ME)return G.players[G.turn].kind==='cpu'?`${nm(G.turn)} が考えています…`:`${nm(G.turn)} がカードを出すのを待っています…`;
  if(discMode)return '捨てるカードを選んでください。';
  if(!sel.length)return stuck?'出せる操作がありません。「手詰まり」で 1 枚捨ててください。':'カードを場の基底へドラッグ（タップで選んでもOK）';
  switch(kind()){
    case 'add':return '追加する場の「＋ ここに追加」をタップしてください。';
    case 'side':return `${selCards()[0]==='lap'?'Δ':'∇'} をかける場の基底を、どれか 1 つタップしてください。`;
    case 'stack':return `対象の基底をタップ（${sel.length} 回${selCards()[0]==='dx'?'微分':'積分'}）。同じカードを選び足すと回数が増えます。`;
    case 'needfn':return '掛ける・割る関数カードの上に重ねる（ドラッグ）か、タップで選んでください。';
    case 'needop':return '0 は × と組み合わせて使います。× のカードに重ねてください。';
    default:return '対象の基底をタップしてください。';
  }
}
function sideHTML(s,tgB,k){
  const p=G.players[s],L=G.fields[s];
  const backs=s===ME?'':`<span class="backs" id="backs-${s}">${G.hands[s].map((_,i)=>`<span class="back" id="back-${s}-${i}"></span>`).join('')}</span>`;
  const tags=(p.kind==='cpu'?'<span class="tag">CPU</span>':'')+(!p.alive?'<span class="tag outtag">脱落</span>':'');
  let b=L.length?L.map((e,i)=>`<span class="slot"><span class="up"><button class="bz${tgB?' tg':''}" id="bz-${s}-${i}" data-side="${s}" data-i="${i}"${tgB?'':' tabindex="-1" aria-disabled="true"'}>${H(e)}</button></span></span>`).join('')
    :`<span class="empty0">${p.alive?'基底なし':'脱落（0 次元）'}</span>`;
  if(k==='add'&&p.alive)b+=`<button class="drop" id="drop-${s}" data-side="${s}">＋ ここに追加</button>`;
  return `<section class="side${s===ME?' mine':''}${G.turn===s&&!G.over?' turn':''}${p.alive?'':' out'}" id="side-${s}" data-seat="${s}">
    <div class="sh"><span class="pname">${s===ME?'あなた':esc(p.name)}の場</span>${tags} ${backs}<span class="dim">次元 <b id="dim-${s}">${L.length}</b></span></div>
    <div class="bases" id="bases-${s}">${b}</div></section>`;
}
const opponents=()=>{const o=[];for(let k=1;k<G.n;k++)o.push((ME+k)%G.n);return o;};
function render(){
  $('turnInfo').textContent=G.over?'ゲーム終了':G.turn===ME&&meAlive()?`あなたの番（${G.turnNo+1} 手目）`:`${nm(G.turn)} の番`;
  $('deckN').textContent=G.deck.length;
  const layers=n=>{const k=Math.min(10,Math.ceil(n/6));let s='';for(let j=0;j<k;j++)s+=`<i style="transform:translateZ(${j*1.3}px)"></i>`;return {s,z:k*1.3+.5};};
  {const L=layers(G.deck.length);$('deckStack').innerHTML=L.s+(G.deck.length?`<div class="top" style="transform:translateZ(${L.z}px)"><b>${G.deck.length}</b></div>`:'');}
  {const n=G.grave.length,L=layers(Math.max(0,n-1));let top='';
   if(n){const c=G.grave[n-1],d=CARDS[c];const t=d.face.replace(/<[^>]+>/g,'');
     top=`<div class="top" style="--c:${CATC[d.cat]};transform:translateZ(${L.z}px) rotate(${((n*37)%9)-4}deg)"><span class="tf${t.length>3||d.sub?' sm':''}">${d.face}</span>${d.sub?`<span class="ts">${d.sub}</span>`:''}</div>`;}
   $('graveStack').innerHTML=L.s+top;$('graveN').textContent=n;}
  const k=myTurn()?kind():null;
  const tgB=['side','stack','muldiv','unary'].includes(k);
  const opp=opponents();
  const oe=$('opps');oe.style.setProperty('--n',Math.max(1,opp.length));oe.className='opps n'+opp.length;
  oe.innerHTML=opp.map(s=>sideHTML(s,tgB,k)).join('');
  $('mineSlot').innerHTML=sideHTML(ME,tgB,k);
  const c=$('calc');
  if(!G.last){if(shown!==0){c.innerHTML='<div class="hd">ここに計算の途中経過が出ます。</div>';shown=0;}}
  else if(G.last.id!==shown){shown=G.last.id;const l=G.last;
    c.innerHTML=`<div class="hd">${esc(nm(l.who))}${l.cs.length?` が <b>${l.cs.map(face).join(' ')}</b> を使用`:''}</div>`+
      l.steps.map((s,i)=>`<div class="ln" style="--i:${i}">${tx(s)}</div>`).join('')+
      ((G.lastOut||[]).length?`<div class="ln" style="--i:${l.steps.length}"><b class="gone">脱落：${G.lastOut.map(s=>esc(nm(s))).join('・')}</b></div>`:'');}
  const hn=$('hint');if(err)hn.innerHTML=msg;else hn.textContent=hintText();hn.classList.toggle('err',err);
  $('hand').innerHTML=myHand().map((cd,i)=>{
    const cls=(sel.includes(i)?' sel':'')+(discMode?' disc':'');
    return `<button class="cd${cls}" id="cd-${i}" data-i="${i}" style="--c:${CATC[CARDS[cd].cat]}"${myTurn()?'':' aria-disabled="true"'} aria-pressed="${sel.includes(i)}">${cardInner(cd)}</button>`;}).join('');
  layoutHand();
  fitTable();
  const sb=$('stuckBtn');sb.hidden=!(myTurn()&&stuck);sb.textContent=discMode?'取消':'手詰まり：1枚捨てる';
  $('clearSel').disabled=!sel.length;
  $('over').hidden=!G.over;
  document.body.classList.toggle('modal-any',!!G.over||$('rules').open);
  $('toLobby').hidden=!(G.over&&MODE==='online'&&NET&&NET.role==='host');
  if(G.over){const w=G.over.win;$('overT').textContent=w===ME?'あなたの勝ち':w>=0?`${nm(w)} の勝ち`:'引き分け';$('overS').textContent=overText(G.over,nm);}
  reqUI();drawClock();
}

/* ---------- animation ---------- */
const layer=()=>$('fxLayer');
/* ---------- heavy FX: particles, shockwaves, shake, flash, impact text ---------- */
let FXON=true;try{FXON=localStorage.getItem('nablaFx')!=='off';}catch(e){}
const fxOn=()=>FXON&&!calm();
const cv=$('fxCanvas'),cx2=cv.getContext('2d');
let parts=[],rings=[],raf=0,dpr=1;
function sizeCv(){dpr=Math.min(2,window.devicePixelRatio||1);cv.width=innerWidth*dpr;cv.height=innerHeight*dpr;cv.style.width=innerWidth+'px';cv.style.height=innerHeight+'px';}
sizeCv();addEventListener('resize',sizeCv);
const tok=n=>{try{return getComputedStyle(document.documentElement).getPropertyValue(n).trim()||'#c93a4e';}catch(e){return '#c93a4e';}};
const colOf=cat=>tok({basis:'--basis',calc:'--calc',alg:'--alg',lim:'--lim'}[cat]||'--lim');
const GLYPH=['∂','∇','∫','Δ','0','∞','x','√','e','π','Σ','lim'];
function loop(){
  cx2.setTransform(dpr,0,0,dpr,0,0);cx2.clearRect(0,0,innerWidth,innerHeight);
  cx2.globalCompositeOperation='lighter';
  parts=parts.filter(p=>p.life>0);rings=rings.filter(r=>r.life>0);
  for(const r of rings){r.life-=1/60;const t=1-r.life/r.max;const rad=r.r0+(r.r1-r.r0)*(1-Math.pow(1-t,3));
    cx2.globalAlpha=Math.max(0,r.life/r.max);cx2.strokeStyle=r.c;cx2.lineWidth=r.w*(1-t)+1;
    cx2.beginPath();cx2.arc(r.x,r.y,rad,0,Math.PI*2);cx2.stroke();}
  for(const p of parts){p.life-=1/60;p.vx*=p.drag;p.vy=p.vy*p.drag+p.g;const ox=p.x,oy=p.y;p.x+=p.vx;p.y+=p.vy;p.rot+=p.vr;
    const a=Math.max(0,Math.min(1,p.life/p.max*1.4));cx2.globalAlpha=a;
    if(p.kind==='spark'){cx2.strokeStyle=p.c;cx2.lineWidth=p.s;cx2.lineCap='round';cx2.beginPath();cx2.moveTo(ox-p.vx*1.5,oy-p.vy*1.5);cx2.lineTo(p.x,p.y);cx2.stroke();}
    else if(p.kind==='dot'){cx2.fillStyle=p.c;cx2.beginPath();cx2.arc(p.x,p.y,p.s*a+.5,0,Math.PI*2);cx2.fill();}
    else{cx2.save();cx2.globalCompositeOperation='source-over';cx2.translate(p.x,p.y);cx2.rotate(p.rot);cx2.fillStyle=p.c;
      cx2.font=`700 ${p.s}px "STIX Two Text",serif`;cx2.textAlign='center';cx2.textBaseline='middle';cx2.fillText(p.t,0,0);cx2.restore();}}
  cx2.globalAlpha=1;cx2.globalCompositeOperation='source-over';
  if(parts.length||rings.length)raf=requestAnimationFrame(loop);else{raf=0;cx2.clearRect(0,0,innerWidth,innerHeight);}
}
const kick=()=>{if(!raf)raf=requestAnimationFrame(loop);};
function burst(x,y,c,n,spd,opt={}){
  if(!fxOn())return;
  for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,v=spd*(.3+Math.random()*.9);const life=.35+Math.random()*(opt.life||.5);
    parts.push({kind:opt.kind||(Math.random()<.7?'spark':'dot'),x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-(opt.up||0),g:opt.g??.18,drag:opt.drag??.94,
      s:opt.s||(1.5+Math.random()*2.5),c:Array.isArray(c)?c[i%c.length]:c,life,max:life,rot:0,vr:0});}
  kick();
}
function glyphs(x,y,c,n,spd){
  if(!fxOn())return;
  for(let i=0;i<n;i++){const a=-Math.PI/2+(Math.random()*2-1)*1.4,v=spd*(.5+Math.random()*.7);const life=.7+Math.random()*.6;
    parts.push({kind:'glyph',t:GLYPH[Math.floor(Math.random()*GLYPH.length)],x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,g:.32,drag:.985,
      s:14+Math.random()*16,c:Array.isArray(c)?c[i%c.length]:c,life,max:life,rot:(Math.random()*2-1),vr:(Math.random()*2-1)*.2});}
  kick();
}
function ring(x,y,c,r1,w=6,dur=.5,r0=4){if(!fxOn())return;rings.push({x,y,c,r0,r1,w,life:dur,max:dur});kick();}
function shakeFx(px,ms){
  if(!fxOn())return;const n=Math.max(4,Math.round(ms/40)),kf=[];
  for(let i=0;i<n;i++){const f=1-i/n;kf.push({transform:`translate(${(Math.random()*2-1)*px*f}px,${(Math.random()*2-1)*px*f}px) rotate(${(Math.random()*2-1)*px*.06*f}deg)`});}
  kf.push({transform:'none'});document.querySelector('.wrap').animate(kf,{duration:ms,easing:'ease-out'});
}
function flashFx(c,peak=.35,ms=260){
  if(!fxOn())return;const f=$('fxFlash');f.style.background=c;
  f.animate([{opacity:peak},{opacity:0}],{duration:ms,easing:'ease-out'});
}
function slam(text,c,x,y,big){
  if(!fxOn())return;const el=document.createElement('div');el.className='slam'+(big?' big':'');el.textContent=text;el.style.color=c;
  el.style.left=x+'px';el.style.top=y+'px';layer().appendChild(el);
  el.animate([{transform:'translate(-50%,-50%) scale(3) rotate(-8deg)',opacity:0},{transform:'translate(-50%,-50%) scale(.9) rotate(-4deg)',opacity:1,offset:.18},
    {transform:'translate(-50%,-50%) scale(1.05) rotate(-4deg)',opacity:1,offset:.3},{transform:'translate(-50%,-62%) scale(1) rotate(-4deg)',opacity:1,offset:.75},
    {transform:'translate(-50%,-80%) scale(1.1) rotate(-4deg)',opacity:0}],{duration:big?1300:850,easing:'ease-out',fill:'forwards'}).finished.then(()=>el.remove(),()=>el.remove());
}
const mid=r=>({x:r.left+r.width/2,y:r.top+r.height/2});
function trail(el,c){
  if(!fxOn())return;let on=true;
  const tick=()=>{if(!on||!el.isConnected)return;const p=mid(el.getBoundingClientRect());
    for(let i=0;i<3;i++)parts.push({kind:Math.random()<.5?'dot':'spark',x:p.x+(Math.random()*2-1)*10,y:p.y+(Math.random()*2-1)*10,vx:(Math.random()*2-1)*1.2,vy:(Math.random()*2-1)*1.2+.5,g:.05,drag:.92,s:2+Math.random()*2.5,c,life:.4,max:.4,rot:0,vr:0});
    kick();requestAnimationFrame(tick);};
  requestAnimationFrame(tick);return()=>{on=false;};
}
function impactFx(rect,cat,wide){
  if(!fxOn())return;const c=colOf(cat),p=mid(rect);
  burst(p.x,p.y,[c,'#fff6d6'],wide?50:30,wide?9:7);ring(p.x,p.y,c,wide?Math.max(rect.width*.7,160):90,wide?10:7,.45);
  shakeFx(wide?9:5,wide?320:200);
}
function destroyFx(rect,reason,k){
  if(!fxOn())return;const c=tok('--gone'),p=mid(rect);
  const hot=['#ffe08a','#ff9a3c',c,'#fff'];
  burst(p.x,p.y,hot,90,13,{life:.8});burst(p.x,p.y,hot,40,5,{kind:'dot',s:5,g:.25,life:.6});
  glyphs(p.x,p.y,[c,tok('--ink')],12,9);
  ring(p.x,p.y,'#ffcf6b',170,12,.55);setTimeout(()=>ring(p.x,p.y,c,260,6,.6,30),90);
  flashFx(reason==='div'?'#ffd36b':c,.32,280);shakeFx(16,480);
  slam(reason==='div'?'発散 ∞！':reason==='dep'?'線形従属！':'ゼロ！',reason==='div'?'#e08a12':c,p.x,p.y-10-k*34,false);
}
function finaleFx(win){
  if(!fxOn())return;const W=innerWidth,Hh=innerHeight;
  if(win===ME){
    const cs=[tok('--basis'),tok('--calc'),tok('--alg'),tok('--lim'),'#ffd36b'];
    for(let i=0;i<6;i++)setTimeout(()=>{const x=W*(.15+Math.random()*.7),y=Hh*(.2+Math.random()*.4);burst(x,y,cs,70,11,{life:.9});glyphs(x,y,cs,14,10);ring(x,y,cs[i%5],180,8,.6);},i*220);
    flashFx('#fff3c4',.4,500);slam('Q.E.D.',tok('--basis'),W/2,Hh*.42,true);
  }else if(win>=0){
    flashFx(tok('--gone'),.5,700);shakeFx(22,700);
    for(let i=0;i<3;i++)setTimeout(()=>glyphs(W*Math.random(),-10,[tok('--gone'),tok('--ink')],16,3),i*160);
    slam(G.players[ME]&&!G.players[ME].alive?'0 次元…':`${nm(win)} の勝ち`,tok('--gone'),W/2,Hh*.42,true);
  }else slam('引き分け',tok('--ink'),W/2,Hh*.42,true);
}

function flyCard(cd,from,to,delay,fromCpu,dropped){
  const el=document.createElement('div');
  el.className='cd fly';el.style.setProperty('--c',CATC[CARDS[cd].cat]);el.innerHTML=cardInner(cd);
  const w=fromCpu?66:from.width,h=fromCpu?94:from.height;
  const sx=from.left+from.width/2,sy=from.top+from.height/2;
  Object.assign(el.style,{left:(sx-w/2)+'px',top:(sy-h/2)+'px',width:w+'px',height:h+'px'});
  layer().appendChild(el);
  const dx=to.left+to.width/2-sx,dy=to.top+to.height/2-sy;
  const tilt=(Math.random()*2-1)*12;
  const a=dropped?el.animate([
    {transform:'translate(0,0) perspective(700px) rotateX(12deg) scale(1.12)',opacity:1},
    {transform:`translate(${dx*.4}px,${dy*.4-34}px) perspective(700px) rotateX(-25deg) rotateZ(${tilt}deg) scale(1.2)`,opacity:1,offset:.4},
    {transform:`translate(${dx}px,${dy}px) perspective(700px) rotateX(60deg) scale(.7)`,opacity:1,offset:.85},
    {transform:`translate(${dx}px,${dy}px) perspective(700px) rotateX(80deg) scale(.5)`,opacity:0}
  ],{duration:420,delay,easing:'cubic-bezier(.5,0,.7,1)',fill:'both'}):el.animate([
    {transform:`translate(0,0) perspective(700px) rotate(0deg) scale(${fromCpu?.35:1})`+(fromCpu?' rotateY(180deg)':''),opacity:fromCpu?0:1},
    {transform:`translate(${dx*.45}px,${dy*.45-46}px) perspective(700px) rotate(${tilt}deg) rotateX(-20deg) rotateY(${fromCpu?0:-15}deg) scale(1.08)`,opacity:1,offset:.5},
    {transform:`translate(${dx}px,${dy}px) rotate(0deg) scale(.62)`,opacity:1,offset:.86},
    {transform:`translate(${dx}px,${dy}px) rotate(0deg) scale(.4)`,opacity:0}
  ],{duration:620,delay,easing:'cubic-bezier(.3,.7,.3,1)',fill:'both'});
  let stop=null;setTimeout(()=>{stop=trail(el,colOf(CARDS[cd].cat));},delay);
  return a.finished.then(()=>{stop&&stop();el.remove();},()=>{stop&&stop();el.remove();});
}
function pulse(el,color){
  if(!el)return;
  el.animate([{transform:'scale(1)',boxShadow:'0 0 0 0 transparent'},
    {transform:'scale(1.12)',boxShadow:`0 0 0 5px ${color}`,offset:.35},
    {transform:'scale(1)',boxShadow:'0 0 0 0 transparent'}],{duration:380,easing:'ease-out'});
}
function piece(r,html,cls){
  const p=document.createElement('div');p.className='bz shard'+(cls?' '+cls:'');p.innerHTML=html;
  Object.assign(p.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});
  layer().appendChild(p);return p;
}
function shatter(el,diverged,delay){
  if(!el)return Promise.resolve();
  return wait(delay).then(()=>{
    const r=el.getBoundingClientRect(),html=el.innerHTML;
    const crack=el.animate([{background:'var(--paper)'},{background:'var(--gone)',color:'var(--card)'}],{duration:140,fill:'forwards'});
    return crack.finished.then(()=>{
      el.style.visibility='hidden';
      if(diverged){
        const g=piece(r,html,'hot');
        return g.animate([{transform:'translateY(0) scale(1)',opacity:1,filter:'blur(0px)'},
          {transform:'translateY(-14px) scale(1.5)',opacity:1,filter:'blur(0px)',offset:.35},
          {transform:'translateY(-60px) scale(3.2)',opacity:0,filter:'blur(6px)'}],{duration:760,easing:'ease-in',fill:'forwards'})
          .finished.then(()=>g.remove(),()=>g.remove());
      }
      const cols=4,rows=2,ps=[];
      for(let cx=0;cx<cols;cx++)for(let cy=0;cy<rows;cy++){
        const g=piece(r,html,'hot');
        const t=cy*100/rows,b=100-(cy+1)*100/rows,l=cx*100/cols,rt=100-(cx+1)*100/cols;
        g.style.clipPath=`inset(${t}% ${rt}% ${b}% ${l}%)`;
        const ox=((cx+.5)/cols-.5)*2,oy=((cy+.5)/rows-.5)*2;
        const dx=ox*(50+Math.random()*50)+(Math.random()*2-1)*14,dy=oy*(30+Math.random()*30)-20+Math.random()*10;
        const rot=(Math.random()*2-1)*70;
        ps.push(g.animate([{transform:'translate(0,0) rotate(0deg)',opacity:1},
          {transform:`translate(${dx}px,${dy+90}px) rotate(${rot}deg)`,opacity:0}],
          {duration:700+Math.random()*200,easing:'cubic-bezier(.2,.6,.5,1)',fill:'forwards'}).finished.then(()=>g.remove(),()=>g.remove()));
      }
      return Promise.all(ps);
    });
  });
}
function afterRenderFx(fate){
  if(!fate)return;
  fate.ids.forEach((orig,j)=>{
    const el=$(`bz-${fate.side}-${j}`);if(!el)return;
    if(orig==='new')el.animate([{transform:'scale(.3) translateY(-20px)',opacity:0},{transform:'scale(1.12)',opacity:1,offset:.6},{transform:'scale(1)'}],{duration:480,easing:'ease-out'});
    else if(fate.changed.includes(orig)&&!fate.morphed)el.animate([{background:'var(--soft)',transform:'scale(.92)',filter:'blur(2px)'},{transform:'scale(1.06)',filter:'blur(0px)',offset:.6},{background:'var(--paper)',transform:'scale(1)'}],{duration:460,easing:'ease-out'});
  });
}
function dealFx(){
  const ld=G.lastDraw;if(!ld||!ld.n||dealt===seq)return;dealt=seq;
  if(ld.who===ME){const cs=[...document.querySelectorAll('#hand .cd')].slice(-ld.n);
    cs.forEach((el,k)=>el.animate([{transform:'translateY(40px) scale(.8)',opacity:0},{transform:'none',opacity:1}],{duration:380,delay:120+k*90,easing:'ease-out',fill:'backwards'}));}
  else{const bs=[...document.querySelectorAll(`#backs-${ld.who} .back`)].slice(-ld.n);
    bs.forEach((el,k)=>el.animate([{transform:'translateY(-14px)',opacity:0},{transform:'none',opacity:1}],{duration:300,delay:k*80,fill:'backwards'}));}
}

/* ∇ / Δ: every basis on the side is differentiated at the same instant */
function sweepFx(box,c,sym){
  if(!fxOn())return;const r=box.getBoundingClientRect();
  const s=document.createElement('div');s.className='sweep';s.style.setProperty('--c',c);
  Object.assign(s.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});
  s.innerHTML=`<span>${sym}</span>`;layer().appendChild(s);
  s.animate([{opacity:0},{opacity:1,offset:.15},{opacity:1,offset:.7},{opacity:0}],{duration:620,fill:'forwards'}).finished.then(()=>s.remove(),()=>s.remove());
  s.firstChild.animate([{transform:'translateX(-30%) skewX(-12deg)'},{transform:'translateX(130%) skewX(-12deg)'}],{duration:620,easing:'cubic-bezier(.5,0,.3,1)',fill:'forwards'});
}
async function wideMorph(side,box,n,sym,col,fate){
  const els=[...box.querySelectorAll('.bz')];
  const orig=G.fields[side];
  const stages=orig.map(e=>{const out=[];let f=e;for(let k=0;k<n;k++){f=deriv(f);out.push(f);}return out;});
  sweepFx(box,col,sym);
  for(let k=0;k<n;k++){
    await wait(k?170:120);
    els.forEach((el,i)=>{
      el.innerHTML=H(stages[i][k]);
      el.animate([{transform:'scale(1.25)',filter:'blur(3px) brightness(1.8)',boxShadow:`0 0 0 6px ${col}`},
        {transform:'scale(.94)',filter:'blur(0px)',offset:.5},{transform:'scale(1)',boxShadow:'0 0 0 0 transparent'}],{duration:300,easing:'ease-out'});
      if(fxOn()){const p=mid(el.getBoundingClientRect());burst(p.x,p.y,[colOf('calc'),'#fff6d6'],14,5,{life:.3});slam(sym,colOf('calc'),p.x,p.y-26,false);}
    });
  }
  await wait(140);
  const removed=new Set(fate.removed);
  const jobs=[];
  els.forEach((el,i)=>{
    if(removed.has(i)){
      const reason=zeroish(stages[i][n-1])?'zero':'dep';
      destroyFx(el.getBoundingClientRect(),reason,[...removed].indexOf(i));
      jobs.push(shatter(el,false,0));
    }else{
      el.animate([{boxShadow:`0 0 0 0 ${col}`},{boxShadow:`0 0 0 8px ${col}`,offset:.3},{boxShadow:'0 0 0 0 transparent'}],{duration:520,easing:'ease-out'});
      if(fxOn()){const p=mid(el.getBoundingClientRect());ring(p.x,p.y,col,70,5,.4);}
    }
  });
  if(removed.size>1){const p=mid(box.getBoundingClientRect());slam(`${removed.size} 連続消滅！`,tok('--alg'),p.x,p.y-48,false);}
  await Promise.all(jobs);
}
/* ---------- fit to screen (tablet) ---------- */
const fitMode=()=>{try{return matchMedia('(min-width:700px) and (min-height:560px)').matches;}catch(e){return false;}};
let lastFit=1;
function fitTable(){
  const fb=$('fitbox'),sc=$('scene');if(!fb)return;
  if(!fitMode()){if(lastFit!==1){fb.style.transform='';lastFit=1;}return;}
  if(drag&&drag.started)return;
  const tb=$('table');
  if(tb.getAnimations&&tb.getAnimations().length){clearTimeout(fitTable.t);fitTable.t=setTimeout(fitTable,120);return;}
  fb.style.transform='none';fb.style.marginTop='0px';
  const avail=sc.getBoundingClientRect(),t=tb.getBoundingClientRect();
  const top0=t.top-avail.top, needH=(t.bottom-avail.top)+18, needW=t.width+12;
  let s=Math.min(avail.height/needH,avail.width/needW,1.45);
  s=Math.max(.45,s);
  const free=avail.height-needH*s;
  fb.style.marginTop=Math.max(0,free/2)+'px';
  fb.style.transform=`scale(${s})`;lastFit=s;void top0;
}
addEventListener('resize',()=>{fitTable();layoutHand();});
try{document.fonts&&document.fonts.ready.then(()=>{fitTable();layoutHand();});}catch(e){}

/* ---------- 3D hand layout ---------- */
function layoutHand(){
  const hand=$('hand');const cards=[...hand.querySelectorAll('.cd')];const n=cards.length;if(!n)return;
  const W=(hand.clientWidth||360)-24;
  let cw=Math.max(62,Math.min(88,W/4.6));
  if(fitMode()){const hmax=Math.max(130,Math.min(240,innerHeight*(innerWidth/innerHeight>=1.25?.24:.2)));cw=Math.max(62,Math.min((hmax-44)/1.42,W/5.2,130));}
  const ch=Math.round(cw*1.42);
  const ov=n>1?Math.max(-8,(n*cw-W+8)/(n-1)):0;
  const total=n*cw-(n-1)*ov,x0=12+(W-total)/2;
  hand.style.height=(ch+52)+'px';
  cards.forEach((el,i)=>{
    const t=n>1?i-(n-1)/2:0;
    el.style.width=cw+'px';el.style.height=ch+'px';
    el.style.left=(x0+i*(cw-ov))+'px';
    el.style.setProperty('--rot',FLAT?'0deg':(t*2.6)+'deg');
    el.style.setProperty('--arc',FLAT?'0px':(t*t*1.3)+'px');
    el.style.zIndex=10+i;
  });
}
addEventListener('resize',()=>layoutHand());
const hasHover=()=>{try{return matchMedia('(hover:hover)').matches;}catch(e){return false;}};
$('hand').addEventListener('pointermove',e=>{
  if(drag||FLAT||!hasHover())return;const el=e.target.closest('.cd');if(!el)return;
  const r=el.getBoundingClientRect();const px=(e.clientX-r.left)/r.width,py=(e.clientY-r.top)/r.height;
  el.style.setProperty('--ry',((px-.5)*26)+'deg');el.style.setProperty('--rx',((.5-py)*22)+'deg');
  el.style.setProperty('--gx',(px*100)+'%');el.style.setProperty('--gy',(py*100)+'%');
});
$('hand').addEventListener('pointerout',e=>{const el=e.target.closest('.cd');if(el&&!el.contains(e.relatedTarget)){el.style.setProperty('--rx','0deg');el.style.setProperty('--ry','0deg');}});

/* ---------- drag & drop ---------- */
let drag=null, suppressClick=false;
const comboOK=cs=>{const k=kindOf(cs);return !!k;};
$('hand').addEventListener('pointerdown',e=>{
  const b=e.target.closest('.cd');if(!b||!myTurn()||discMode||e.button>0)return;
  drag={i:+b.dataset.i,x0:e.clientX,y0:e.clientY,started:false,pid:e.pointerId};
});
addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.pid)return;
  if(!drag.started){if(Math.hypot(e.clientX-drag.x0,e.clientY-drag.y0)<7)return;startDrag(e);}
  moveDrag(e);
},{passive:true});
addEventListener('pointerup',e=>{if(!drag||e.pointerId!==drag.pid)return;const d=drag;if(d.started){suppressClick=true;setTimeout(()=>suppressClick=false,60);endDrag(e);}drag=null;});
addEventListener('pointercancel',()=>{if(drag&&drag.started)cancelDrag();drag=null;});

function startDrag(e){
  const i=drag.i;
  const group=sel.includes(i)&&comboOK(selCards())?sel.slice():[i];
  sel=group;err=false;render();
  const k=kind();drag.group=group;drag.kind=k;drag.started=true;
  document.body.classList.add('dragging');
  // drop zones
  const zones=[];
  const boxes=()=>document.querySelectorAll('.table .side[data-seat]:not(.out)').forEach(el=>zones.push({el,side:+el.dataset.seat,box:true}));
  if(k==='add'){document.querySelectorAll('.drop').forEach(z=>zones.push({el:z,side:+z.dataset.side}));boxes();}
  else if(k==='side'){document.querySelectorAll('.table .bz').forEach(z=>zones.push({el:z,side:+z.dataset.side}));boxes();}
  else if(k&&k!=='needfn'&&k!=='needop')document.querySelectorAll('.table .bz').forEach(z=>zones.push({el:z,side:+z.dataset.side,i:+z.dataset.i}));
  document.querySelectorAll('#hand .cd').forEach(c=>{const j=+c.dataset.i;if(group.includes(j))return;
    const cand=[...group,j];if(comboOK(cand.map(q=>G.hands[ME][q])))zones.push({el:c,combine:j});});
  zones.forEach(z=>z.el.classList.add(z.box?'dzbox':'dz'));
  drag.zones=zones;
  // ghosts
  drag.ghosts=group.map((gi,k2)=>{
    const src=$(`cd-${gi}`);const r=src.getBoundingClientRect();
    const g=document.createElement('div');g.className='cd ghost';g.style.setProperty('--c',CATC[CARDS[G.hands[ME][gi]].cat]);g.innerHTML=cardInner(G.hands[ME][gi]);
    Object.assign(g.style,{width:src.offsetWidth+'px',height:src.offsetHeight+'px',left:'0px',top:'0px'});
    layer().appendChild(g);src.classList.add('lifted');
    return {g,home:r,ox:e.clientX-(r.left+r.width/2),oy:e.clientY-(r.top+r.height/2),k:k2,w:src.offsetWidth,h:src.offsetHeight};
  });
  drag.px=e.clientX;drag.py=e.clientY;drag.vx=0;drag.vy=0;drag.tilt={x:0,y:0};
  $('hint').textContent=dragHint(k);$('hint').classList.remove('err');
  const tick=()=>{if(!drag||!drag.started)return;
    drag.tilt.x+=(Math.max(-30,Math.min(30,-drag.vy*1.6))-drag.tilt.x)*.25;
    drag.tilt.y+=(Math.max(-30,Math.min(30,drag.vx*1.6))-drag.tilt.y)*.25;
    drag.vx*=.82;drag.vy*=.82;placeGhosts();requestAnimationFrame(tick);};
  requestAnimationFrame(tick);
}
function dragHint(k){
  switch(k){case 'add':return '追加したい場（自分かほかの人）にドロップ';
    case 'side':return `${selCards()[0]==='lap'?'Δ':'∇'} をかける場にドロップ`;
    case 'needfn':return '掛ける・割る関数カードの上に重ねてください';
    case 'needop':return '× のカードの上に重ねてください';
    default:return '対象の基底にドロップ（同じカードに重ねると回数アップ）';}
}
function placeGhosts(){
  const n=drag.ghosts.length;
  const tr=$('table').getBoundingClientRect();const over=drag.py>tr.top&&drag.py<tr.bottom+10;
  const L0=FLAT?0:12,L1=FLAT?0:40;drag.lay=(drag.lay??L0)+((over?L1:L0)-(drag.lay??L0))*.2;
  drag.ghosts.forEach(o=>{
    const x=drag.px-o.w/2+(o.k-(n-1)/2)*14,y=drag.py-o.h/2-o.k*6-26;
    o.g.style.transform=`translate(${x}px,${y}px) perspective(700px) rotateX(${drag.tilt.x+drag.lay}deg) rotateY(${drag.tilt.y}deg) rotateZ(${drag.tilt.y*.3+(o.k-(n-1)/2)*6}deg) scale(1.12)`;
  });
}
function zoneAt(x,y){
  const els=document.elementsFromPoint?document.elementsFromPoint(x,y):[document.elementFromPoint(x,y)];
  for(const el of els){if(!el)continue;const z=drag.zones.find(z=>z.el===el||z.el.contains(el)&&!z.box);if(z)return z;}
  for(const el of els){if(!el)continue;const z=drag.zones.find(z=>z.box&&z.el.contains(el));if(z)return z;}
  return null;
}
function moveDrag(e){
  drag.vx=e.clientX-drag.px;drag.vy=e.clientY-drag.py;drag.px=e.clientX;drag.py=e.clientY;
  placeGhosts();
  const z=zoneAt(e.clientX,e.clientY);
  if(z!==drag.hot){
    if(drag.hot)drag.hot.el.classList.remove('hot','bad');
    drag.hot=z;
    if(z){z.el.classList.add('hot');
      if(z.combine===undefined){const r=simulate(G,ME,selCards(),z.i!==undefined&&drag.kind!=='side'?{side:z.side,i:z.i}:{side:z.side});
        if(!r.ok){z.el.classList.add('bad');$('hint').innerHTML=tx(r.why);$('hint').classList.add('err');}
        else{$('hint').textContent=dragHint(drag.kind);$('hint').classList.remove('err');
          if(fxOn()){const p=mid(z.el.getBoundingClientRect());burst(p.x,p.y,[colOf(CARDS[selCards()[0]].cat)],8,3,{life:.2});}}}
      else{$('hint').textContent='重ねてコンボにする';$('hint').classList.remove('err');}
    }else{$('hint').textContent=dragHint(drag.kind);$('hint').classList.remove('err');}
  }
}
function clearZones(){document.body.classList.remove('dragging');(drag.zones||[]).forEach(z=>z.el.classList.remove('dz','dzbox','hot','bad'));}
function springBack(){
  const gs=drag.ghosts;
  return Promise.all(gs.map(o=>{
    const tx=o.home.left,ty=o.home.top;
    const a=o.g.animate([{transform:o.g.style.transform},{transform:`translate(${tx}px,${ty}px) perspective(700px) rotateX(0deg) rotateY(0deg) scale(1)`}],{duration:280,easing:'cubic-bezier(.3,1.4,.5,1)',fill:'forwards'});
    return a.finished.then(()=>o.g.remove(),()=>o.g.remove());
  })).then(()=>document.querySelectorAll('#hand .cd.lifted').forEach(c=>c.classList.remove('lifted')));
}
function cancelDrag(){clearZones();springBack();}
function endDrag(e){
  const z=drag.hot;clearZones();
  if(!z){springBack().then(()=>render());return;}
  if(z.combine!==undefined){
    sel=[...drag.group,z.combine];
    const p=mid(z.el.getBoundingClientRect());
    springBack().then(()=>{render();if(fxOn()){burst(p.x,p.y,[colOf(CARDS[G.hands[ME][z.combine]].cat),'#fff6d6'],26,6);ring(p.x,p.y,colOf('alg'),60,5,.35);}});
    return;
  }
  const cs=selCards(),k=kind();
  const tg=(k==='side'||k==='add')?{side:z.side}:{side:z.side,i:z.i};
  const r=simulate(G,ME,cs,tg);
  if(!r.ok){err=true;msg=tx(r.why);const gs=drag.ghosts;
    gs.forEach(o=>o.g.animate([{translate:'0 0'},{translate:'-10px 0'},{translate:'10px 0'},{translate:'0 0'}],{duration:220,composite:'add'}));
    springBack().then(()=>render());return;}
  const rects=drag.ghosts.map(o=>{const rr=o.g.getBoundingClientRect();o.g.remove();return rr;});
  runMove(ME,sel.slice(),cs,tg,r,rects);
}


async function runMove(who,idx,cs,tg,r,srcRects){
  const my=gid;busy=true;
  if(MODE==='online'&&(who===ME||(NET&&NET.role==='host'&&G.players[who].kind==='cpu')))netBroadcastMove({t:'move',seat:who,idx,cs,tg:{side:tg.side,i:tg.i},n:G.turnNo});
  $('hint').textContent=hintText();$('hint').classList.remove('err');
  const fate=r.fate;
  if(!calm()){
    const sideBox=$(`bases-${tg.side}`);
    const tEl=tg.i!==undefined?$(`bz-${tg.side}-${tg.i}`):(document.getElementById(`drop-${tg.side}`)||sideBox);
    const to=(tEl||sideBox).getBoundingClientRect();
    const flights=cs.map((cd,k)=>{
      if(who===ME){const src=$(`cd-${idx[k]}`);const fr=srcRects?srcRects[k]:src.getBoundingClientRect();src.style.visibility='hidden';return flyCard(cd,fr,to,k*(srcRects?60:90),false,!!srcRects);}
      const b=$(`back-${who}-${idx[k]}`)||$(`backs-${who}`)||$(`side-${who}`);const fr=b.getBoundingClientRect();if(b.classList.contains('back'))b.style.visibility='hidden';return flyCard(cd,fr,to,k*90,true);
    });
    document.querySelectorAll('.drop').forEach(d=>{if(d!==tEl)d.style.visibility='hidden';});
    await Promise.all(flights);
    if(my!==gid)return;
    const col=CATC[CARDS[cs[0]].cat];
    const cat=CARDS[cs[0]].cat,wide=cs[0]==='nabla'||cs[0]==='lap';
    if(tg.i!==undefined)pulse(tEl,col);
    else if(wide)sideBox.querySelectorAll('.bz').forEach(e=>pulse(e,col));
    impactFx(wide?sideBox.getBoundingClientRect():to,cat,wide||cs.length>1);
    if(wide){
      await wideMorph(tg.side,sideBox,cs[0]==='lap'?2:1,cs[0]==='lap'?'Δ':'∇',col,fate);
      if(my!==gid)return;
      fate.morphed=true;
    }else{
      await wait(260);
      if(my!==gid)return;
    }
    if(!wide&&fate.removed.length){
      const t=r.steps.join(' ');
      const reason=fate.diverged?'div':/線形従属/.test(t)&&!/0 になった|恒等的に 0|= 0 →/.test(t)?'dep':'zero';
      fate.removed.forEach((i,k)=>{const el=$(`bz-${tg.side}-${i}`);if(el)setTimeout(()=>destroyFx(el.getBoundingClientRect(),reason,k),140+k*110);});
      if(fate.removed.length>1)setTimeout(()=>{const p=mid($(`side-${tg.side}`).getBoundingClientRect());slam(`${fate.removed.length} 連続消滅！`,tok('--alg'),p.x,p.y-40,false);},420);
      await Promise.all(fate.removed.map((i,k)=>shatter($(`bz-${tg.side}-${i}`),fate.diverged,k*110)));
      if(my!==gid)return;
    }
  }
  commit(G,who,idx,cs,r);stamp();busy=false;sel=[];err=false;discMode=false;stuck=false;
  render();
  if(!calm()){afterRenderFx(fate);dealFx();outFx();}
  if(G.over)finaleFx(G.over.win);
  afterTurn();
  next();
}
function outFx(){
  (G.lastOut||[]).forEach((s,k)=>{const el=$(`side-${s}`);if(!el)return;const p=mid(el.getBoundingClientRect());
    setTimeout(()=>{slam(s===ME?'脱落…':`${nm(s)} 脱落！`,tok('--gone'),p.x,p.y,false);if(fxOn()){burst(p.x,p.y,[tok('--gone'),'#ffd36b'],50,9);shakeFx(12,380);}},300+k*250);});
}
function stamp(){if(G.last)G.last.id=++seq;}
function isHost(){return MODE==='online'&&NET&&NET.role==='host';}
function next(){
  if(G.over){stopClock();return;}
  const my=gid;
  if(pendingSync){applySync(pendingSync);pendingSync=null;}
  startClock();
  const t=G.turn,p=G.players[t];
  if(t===ME&&meAlive()){setTimeout(()=>{if(my!==gid)return;stuck=!hasLegal(G,ME);render();},30);return;}
  if(p.kind==='cpu'&&(MODE==='cpu'||isHost())){
    busy=true;render();
    setTimeout(()=>{
      if(my!==gid||G.over||G.turn!==t)return;
      const m=chooseMove(G,t);
      if(m)runMove(t,m.idx,m.cs,m.tg,m.r);
      else{if(isHost())netBroadcastMove({t:'discard',seat:t,i:0,n:G.turnNo});discardOne(G,t,0);stamp();busy=false;render();afterTurn();next();}
    },MODE==='cpu'?700:900);
    return;
  }
  busy=false;render();pump();
}
function play(tg){
  if(!myTurn())return;
  const cs=selCards(),k=kind();
  if(k==='side'||k==='add')tg={side:tg.side};
  const r=simulate(G,ME,cs,tg);
  if(!r.ok){err=true;msg=tx(r.why);render();return;}
  runMove(ME,sel.slice(),cs,tg,r);
}
$('hand').addEventListener('click',e=>{
  const b=e.target.closest('.cd');if(!b||!myTurn()||suppressClick)return;
  const i=+b.dataset.i;err=false;
  if(discMode){if(MODE==='online')netBroadcastMove({t:'discard',seat:ME,i,n:G.turnNo});discardOne(G,ME,i);stamp();sel=[];discMode=false;stuck=false;render();if(!calm())dealFx();afterTurn();next();return;}
  if(sel.includes(i))sel=sel.filter(j=>j!==i);
  else{const cand=[...sel,i];sel=kindOf(cand.map(j=>myHand()[j]))?cand:[i];}
  render();
});
document.querySelector('.wrap').addEventListener('click',e=>{
  const b=e.target.closest('.bz.tg,.drop');if(!b)return;
  play({side:+b.dataset.side,i:b.dataset.i===undefined?undefined:+b.dataset.i});
});
$('clearSel').addEventListener('click',()=>{sel=[];err=false;render();});
$('stuckBtn').addEventListener('click',()=>{discMode=!discMode;sel=[];render();});
const fxBtn=$('fxBtn');const fxLabel=()=>{fxBtn.textContent=FXON?'激しいエフェクト：ON':'激しいエフェクト：OFF';fxBtn.setAttribute('aria-pressed',FXON);};
fxLabel();fxBtn.addEventListener('click',()=>{FXON=!FXON;try{localStorage.setItem('nablaFx',FXON?'on':'off');}catch(e){}fxLabel();if(FXON){const p=mid(fxBtn.getBoundingClientRect());burst(p.x,p.y,[tok('--lim'),'#ffd36b'],40,7);}});
/* ---------- view: 2D / 3D ---------- */
let FLAT=false;try{FLAT=localStorage.getItem('nablaView')==='2d';}catch(e){}
function applyView(){
  document.body.classList.toggle('flat',FLAT);
  $('viewBtn').textContent=FLAT?'3D 表示にする':'2D 表示にする';
  layoutHand();fitTable();
}
$('viewBtn').addEventListener('click',()=>{FLAT=!FLAT;try{localStorage.setItem('nablaView',FLAT?'2d':'3d');}catch(e){}applyView();});
function tableIntro(kf,ms){if(!calm()&&!FLAT)$('table').animate(kf,{duration:ms,easing:'cubic-bezier(.2,.8,.2,1)'});}

/* ---------- rule settings UI ---------- */
const OPT={
  count:[[2,'2 人'],[3,'3 人'],[4,'4 人']],
  fill:[['cpu','CPU で埋める'],['none','埋めない（集まった人だけ）']],
  win:[['last','最後の 1 人が勝ち'],['first','先に誰かを倒した人が勝ち']],
  time:[[0,'なし'],[30,'30 秒'],[60,'60 秒'],[90,'90 秒']]};
function ruleBox(el,cfg,{editable,online,minCount=2,onChange}){
  const row=(key,label)=>`<label for="rb-${el.id}-${key}">${label}</label><select id="rb-${el.id}-${key}" data-k="${key}"${editable?'':' disabled'}>${OPT[key].map(([v,t])=>`<option value="${v}"${String(cfg[key])===String(v)?' selected':''}${key==='count'&&v<minCount?' disabled':''}>${t}</option>`).join('')}</select>`;
  el.innerHTML=row('count',online?'最大人数':'人数（あなた＋CPU）')+(online?row('fill','空いた席'):'')+row('win','勝ち方')+row('time','1 手の制限時間');
  if(editable)el.querySelectorAll('select').forEach(s=>s.addEventListener('change',()=>{const k=s.dataset.k;cfg[k]=k==='fill'||k==='win'?s.value:+s.value;onChange&&onChange();}));
}

/* ---------- turn clock ---------- */
const GRACE=6;
let clock=null;
function startClock(){
  let T=G.rule&&G.rule.time;
  if(!T||G.over){stopClock();return;}
  if(window.__TURN_SEC)T=window.__TURN_SEC;
  const p=G.players[G.turn];
  if(!p||p.kind!=='human'){clock=null;drawClock();return;}
  const key=G.turnNo+':'+G.turn;
  if(clock&&clock.key===key)return;
  clock={key,who:G.turn,n:G.turnNo,T,deadline:Date.now()+T*1000,fired:false};
  drawClock();
}
function stopClock(){clock=null;drawClock();}
function drawClock(){
  const el=$('clock');if(!el)return;
  if(!clock||G.over){el.hidden=true;return;}
  const left=Math.max(0,Math.ceil((clock.deadline-Date.now())/1000));
  el.hidden=false;
  el.innerHTML=`<span class="clk-who">${esc(nm(clock.who))}</span> 残り <b>${left}</b> 秒<i style="--p:${left/clock.T}"></i>`;
  el.classList.toggle('warn',left<=10);el.classList.toggle('mine',clock.who===ME);
}
function cancelAnyDrag(){try{if(drag&&drag.started)cancelDrag();}catch(e){}drag=null;}
function timeoutDiscard(who,i,send){
  if(G.over||G.turn!==who)return;
  if(who===ME){cancelAnyDrag();sel=[];discMode=false;}
  const h=G.hands[who];if(!h.length)return;
  if(i===undefined||i<0||i>=h.length)i=Math.floor(Math.random()*h.length);
  if(send&&MODE==='online')netBroadcastMove({t:'discard',seat:who,i,n:G.turnNo,timeout:true});
  discardOne(G,who,i);
  if(G.last)G.last.steps=[`<b class="gone">時間切れ！</b> ${P(who)}は手札を1枚捨てて引いた（${G.rule.time}秒以内に出せなかった）`];
  stamp();stuck=false;render();
  if(!calm()){dealFx();const p=mid($('table').getBoundingClientRect());slam('時間切れ！',tok('--gone'),p.x,p.y,false);shakeFx(8,260);}
  afterTurn();next();
}
setInterval(()=>{
  if(!clock)return;
  if(G.over){stopClock();return;}
  drawClock();
  const now=Date.now();
  if(busy||clock.fired||G.turn!==clock.who)return;
  if(clock.who===ME&&now>=clock.deadline&&!window.__frozen){clock.fired=true;timeoutDiscard(ME,undefined,true);}
  else if(clock.who!==ME&&isHost()&&!inbox.some(m=>m.seat===clock.who)&&now>=clock.deadline+GRACE*1000){clock.fired=true;timeoutDiscard(clock.who,undefined,true);}
},250);

/* ---------- game start / reset ---------- */
function resetUI(){clock=null;gid++;layer().innerHTML='';parts=[];rings=[];sel=[];err=false;busy=false;stuck=false;discMode=false;shown=-1;inbox=[];pendingSync=null;}
function slamTurn(){const p=mid($('table').getBoundingClientRect());slam(G.turn===ME?'あなたが先攻':`${nm(G.turn)} が先攻`,tok(G.turn===ME?'--basis':'--lim'),p.x,p.y,false);}
function startLocal(){
  MODE='cpu';ME=0;resetUI();
  const players=[{name:myName(),kind:'human'}];
  for(let i=1;i<SETUP.count;i++)players.push({name:SETUP.count>2?`CPU${i}`:'CPU',kind:'cpu'});
  G=newGame(players,{win:SETUP.win,time:SETUP.time});G.turn=0;
  hideMenu();render();
  tableIntro([{transform:'rotateX(60deg) scale(.95)'},{transform:'rotateX(30deg)'}],600);
  next();
}
const restart=()=>{
  if(MODE==='online'){
    if(!NET||!(NET.role==='host'||NET.conn)){showMenu();return;}
    const on=!(NET.reqs||[]).includes(ME);
    if(NET.role==='host')hostReq(ME,on);else{netSend({t:'newreq',on});NET.reqs=on?[...(NET.reqs||[]),ME]:(NET.reqs||[]).filter(s=>s!==ME);reqUI();}
    return;
  }
  startLocal();
};
$('newBtn').addEventListener('click',restart);
$('again').addEventListener('click',restart);
$('toLobby').addEventListener('click',()=>{if(isHost()){NET.inGame=false;NET.reqs=[];netAll({t:'tolobby'});showLobby();}});
const humanSeats=()=>G.players.map((p,s)=>p.kind==='human'?s:-1).filter(s=>s>=0);
function reqUI(){
  const nb=$('newBtn'),ag=$('again');
  if(MODE!=='online'||!NET){nb.textContent='新しいゲーム';ag.textContent='もう一度';nb.classList.remove('act','req');netStatus('');return;}
  const reqs=NET.reqs||[],need=humanSeats(),me=reqs.includes(ME),others=reqs.filter(s=>s!==ME);
  nb.textContent=me?'新しいゲームの要求を取り消す':others.length?'新しいゲームに同意する':'新しいゲームを要求';
  ag.textContent=me?'ほかの人の同意を待っています（取り消す）':others.length?'同意して新しいゲームへ':'もう一度（みんなに要求）';
  nb.classList.toggle('act',!!others.length&&!me);nb.classList.toggle('req',me);
  netStatus(reqs.length?`新しいゲームの要求：${reqs.length}/${need.length} 人（${reqs.map(s=>nm(s)).join('・')}）。全員が「新しいゲーム」を押すと始まります。`:'');
}

/* ---------- online: PeerJS star (host relays) ---------- */
function netStatus(t){const el=$('netStatus');el.textContent=t;el.hidden=!t;}
function netSend(m){try{NET&&NET.conn&&NET.conn.open&&NET.conn.send(m);}catch(e){}}
function netAll(m,except){if(!NET||NET.role!=='host')return;NET.members.forEach((mb,i)=>{if(mb.conn&&i!==except){try{mb.conn.open&&mb.conn.send(m);}catch(e){}}});}
function netBroadcastMove(m){if(!NET)return;if(NET.role==='host')netAll(m);else netSend(m);}
function loadPeer(){
  if(window.Peer)return Promise.resolve();
  return new Promise((ok,ng)=>{const s=document.createElement('script');s.src='js/peerjs.min.js?v=1.5.4';s.onload=ok;s.onerror=()=>ng(new Error('nolib'));document.head.appendChild(s);});
}
const CODE_CH='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const mkCode=()=>Array.from({length:5},()=>CODE_CH[Math.floor(Math.random()*CODE_CH.length)]).join('');
const PREFIX='nabla-op-game-';
function netError(e){
  const t=String(e&&(e.type||e.message)||e);
  if(t==='nolib')return 'この画面ではインターネット対戦が使えません。GitHub Pages で公開した版で遊んでください。';
  if(t==='peer-unavailable')return 'その部屋コードの部屋が見つかりません。コードを確かめてください。';
  if(t==='unavailable-id')return '部屋コードが重なりました。もう一度「部屋を作る」を押してください。';
  if(t==='network'||t==='server-error'||t==='socket-error'||t==='socket-closed')return '接続サーバーにつながりませんでした。ネット接続を確かめて、もう一度試してください。';
  if(t==='browser-incompatible')return 'このブラウザはインターネット対戦に対応していません。';
  return '接続に失敗しました（'+t+'）。もう一度試してください。';
}
function closeNet(){if(NET){try{NET.conn&&NET.conn.close();}catch(e){}(NET.members||[]).forEach(m=>{try{m.conn&&m.conn.close();}catch(e){}});try{NET.peer&&NET.peer.destroy();}catch(e){}}NET=null;}
/* host */
async function hostRoom(){
  closeNet();menuView('wait');$('waitMsg').textContent='部屋を作っています…';
  try{await loadPeer();}catch(e){menuErr(netError(e));return;}
  const code=mkCode();
  const peer=new Peer(PREFIX+code,{debug:0});
  NET={peer,role:'host',code,members:[{name:myName(),conn:null}],cfg:{count:2,fill:'cpu',win:'last',time:60},reqs:[],inGame:false};
  peer.on('open',()=>{showLobby();});
  peer.on('error',e=>{if(NET&&NET.peer===peer&&!NET.members.some(m=>m.conn)){menuErr(netError(e));closeNet();}});
  peer.on('connection',conn=>{
    conn.on('data',m=>hostOnData(conn,m));
    conn.on('close',()=>hostLost(conn));
    conn.on('error',()=>{});
  });
}
function seatOf(conn){return NET?NET.members.findIndex(m=>m.conn===conn):-1;}
function hostOnData(conn,m){
  if(!NET||!m||!m.t)return;
  if(m.t==='hello'){
    if(NET.inGame||NET.members.length>=NET.cfg.count){try{conn.send({t:'full',why:NET.inGame?'game':'count'});}catch(e){}setTimeout(()=>{try{conn.close();}catch(e){}},300);return;}
    NET.members.push({name:String(m.name||'プレイヤー').slice(0,10),conn});
    pushLobby();return;
  }
  const s=seatOf(conn);if(s<0)return;
  if(m.t==='move'||m.t==='discard'){
    if(!NET.inGame||m.seat!==s)return;
    netAll(m,s);inbox.push(m);pump();return;
  }
  if(m.t==='newreq'){hostReq(s,!!m.on);return;}
  if(m.t==='needsync'){try{conn.send({t:'sync',st:G});}catch(e){}return;}
}
function hostLost(conn){
  if(!NET)return;const s=seatOf(conn);if(s<0)return;
  const name=NET.members[s].name;
  if(!NET.inGame){NET.members.splice(s,1);pushLobby();return;}
  NET.members[s].conn=null;NET.members[s].gone=true;
  if(G.players[s]&&G.players[s].kind==='human'){G.players[s].kind='cpu';G.players[s].name=name+'（CPU）';}
  NET.reqs=(NET.reqs||[]).filter(x=>x!==s);
  netAll({t:'sync',st:G});netAll({t:'reqs',seats:NET.reqs});
  render();const p=mid($('table').getBoundingClientRect());slam(`${name} が退出`,tok('--muted'),p.x,p.y,false);
  if(!busy&&G.turn===s&&!G.over)next();
}
function lobbyState(){return {code:NET.code,cfg:NET.cfg,members:NET.members.map(m=>({name:m.name}))};}
function pushLobby(){
  if(!NET||NET.role!=='host')return;
  NET.members.forEach((m,i)=>{if(m.conn){try{m.conn.send({t:'lobby',room:lobbyState(),you:i});}catch(e){}}});
  if(!$('mLobby').hidden)renderLobby(lobbyState(),0);
}
function hostStart(){
  if(!NET||NET.role!=='host')return;
  NET.members=NET.members.filter(m=>!m.gone);
  const players=NET.members.map(m=>({name:m.name,kind:'human'}));
  if(NET.cfg.fill==='cpu')for(let i=players.length;i<NET.cfg.count;i++)players.push({name:`CPU${i-NET.members.length+1}`,kind:'cpu'});
  if(players.length<2){$('lobMsg').textContent='2 人以上そろうか、「空いた席：CPU で埋める」にすると始められます。';return;}
  MODE='online';ME=0;resetUI();
  G=newGame(players,{win:NET.cfg.win,time:NET.cfg.time});G.turn=Math.floor(Math.random()*players.length);
  NET.inGame=true;NET.reqs=[];
  NET.members.forEach((m,i)=>{if(m.conn){try{m.conn.send({t:'start',st:G,seat:i});}catch(e){}}});
  beginOnline();
}
function hostReq(s,on){
  const r=new Set(NET.reqs||[]);on?r.add(s):r.delete(s);NET.reqs=[...r].sort();
  netAll({t:'reqs',seats:NET.reqs});reqUI();
  const need=humanSeats();
  if(need.length&&need.every(x=>NET.reqs.includes(x)))hostStart();
}
/* guest */
async function joinRoom(){
  const code=$('codeIn').value.toUpperCase().replace(/[^A-Z0-9]/g,'');
  if(code.length!==5){menuErr('部屋コードは英数字 5 文字です。');return;}
  closeNet();menuView('wait');$('waitMsg').textContent='部屋につないでいます…';
  try{await loadPeer();}catch(e){menuErr(netError(e));return;}
  const peer=new Peer({debug:0});NET={peer,role:'guest',code,reqs:[]};
  peer.on('error',e=>{if(NET&&NET.peer===peer){menuErr(netError(e));closeNet();}});
  peer.on('open',()=>{
    const conn=peer.connect(PREFIX+code,{reliable:true});NET.conn=conn;
    conn.on('data',guestOnData);
    conn.on('close',()=>{if(NET&&NET.conn===conn){closeNet();busy=false;stopClock();showMenu('ホストとの接続が切れました。');}});
    conn.on('error',()=>{});
    const to=setTimeout(()=>{if(NET&&NET.conn===conn&&!conn.open){menuErr('部屋につながりませんでした。部屋コードと、ホストが待機中かを確かめてください。');closeNet();}},15000);
    conn.on('open',()=>{clearTimeout(to);conn.send({t:'hello',name:myName()});});
  });
}
function guestOnData(m){
  if(!m||!m.t||!NET)return;
  if(m.t==='full'){menuErr(m.why==='game'?'その部屋はもう対戦中です。終わるまで待ってください。':'その部屋はもう満員です。');closeNet();return;}
  if(m.t==='lobby'){NET.room=m.room;NET.seat=m.you;if(MODE!=='online'||!NET.inGame)showLobby();else renderLobby(m.room,m.you);return;}
  if(m.t==='tolobby'){NET.inGame=false;NET.reqs=[];showLobby();return;}
  if(m.t==='start'){MODE='online';ME=m.seat;resetUI();G=m.st;NET.inGame=true;NET.reqs=[];beginOnline();return;}
  if(m.t==='reqs'){NET.reqs=m.seats||[];reqUI();
    if(NET.reqs.some(s=>s!==ME)&&!NET.reqs.includes(ME)&&fxOn()){const p=mid($('newBtn').getBoundingClientRect());ring(p.x,p.y,tok('--lim'),70,5,.5);}return;}
  if(m.t==='sync'){if(busy)pendingSync=m.st;else{applySync(m.st);if(!busy)next();}return;}
  if(m.t==='move'||m.t==='discard'){inbox.push(m);pump();}
}
function beginOnline(){
  hideMenu();render();
  tableIntro([{transform:'rotateX(60deg) scale(.95)'},{transform:'rotateX(30deg)'}],600);
  slamTurn();next();
}
const stateKey=st=>JSON.stringify([st.fields,st.hands,st.deck.length,st.turn,st.turnNo,st.players]);
function applySync(st){if(stateKey(st)!==stateKey(G)){const id=G.last&&G.last.id;G=st;if(G.last)G.last.id=id;render();}}
function pump(){
  while(MODE==='online'&&!busy&&inbox.length){
    if(G.over){inbox=[];return;}
    const m=inbox[0];
    if(m.n<G.turnNo){inbox.shift();continue;}
    if(m.n>G.turnNo||m.seat!==G.turn){if(NET&&NET.role==='guest')netSend({t:'needsync'});return;}
    inbox.shift();
    if(m.t==='discard'){
      if(m.timeout){timeoutDiscard(m.seat,m.i,false);return;}
      if(m.seat===ME)continue;
      discardOne(G,m.seat,m.i);stamp();render();if(!calm())dealFx();afterTurn();next();return;
    }
    if(m.seat===ME)continue;
    const tg={side:m.tg.side};if(m.tg.i!==undefined&&m.tg.i!==null)tg.i=m.tg.i;
    const r=simulate(G,m.seat,m.cs,tg);
    if(!r.ok){if(NET.role==='host')netAll({t:'sync',st:G});else netSend({t:'needsync'});return;}
    runMove(m.seat,m.idx,m.cs,tg,r);return;
  }
}
function afterTurn(){if(isHost())netAll({t:'sync',st:G});}

/* ---------- lobby ---------- */
function showLobby(){
  $('menu').hidden=false;document.body.classList.add('modal-menu');stopClock();
  menuView('lobby');
  if(NET&&NET.role==='host')renderLobby(lobbyState(),0);else if(NET&&NET.room)renderLobby(NET.room,NET.seat);
  if(!quizQ)newQuiz();
}
function renderLobby(room,me){
  const host=NET&&NET.role==='host';
  $('lobCode').textContent=room.code;
  const cfg=room.cfg,mem=room.members;
  let html='';
  for(let i=0;i<cfg.count;i++){
    if(i<mem.length)html+=`<div class="seat${i===me?' me':''}"><small>席 ${i+1}${i===0?'・ホスト':''}</small><b>${esc(mem[i].name)}${i===me?'（あなた）':''}</b></div>`;
    else html+=cfg.fill==='cpu'?`<div class="seat cpu"><small>席 ${i+1}</small><b>CPU（自動）</b></div>`:`<div class="seat empty"><small>席 ${i+1}</small><b>空き</b></div>`;
  }
  $('lobSeats').innerHTML=html;
  ruleBox($('lobRules'),host?NET.cfg:cfg,{editable:host,online:true,minCount:Math.max(2,mem.length),onChange:pushLobby});
  const total=cfg.fill==='cpu'?cfg.count:mem.length;
  $('lobStart').hidden=!host;$('lobStart').disabled=total<2;
  $('lobMsg').textContent=host?(total<2?'友だちに部屋コードを伝えてください。2 人以上そろうか、空いた席を CPU で埋めると始められます。':`部屋コードを伝えて待つか、「ゲーム開始」を押してください（${total} 人で対戦）。`)
    :'ホストがゲームを始めるのを待っています。待っている間、クイズで遊べます。';
}
$('lobStart').addEventListener('click',hostStart);
$('lobLeave').addEventListener('click',()=>{closeNet();menuView('top');});
$('lobCopy').addEventListener('click',()=>{const c=$('lobCode').textContent;
  if(navigator.clipboard)navigator.clipboard.writeText(c).then(()=>{$('lobCopy').textContent='コピーしました';setTimeout(()=>$('lobCopy').textContent='コードをコピー',1500);},()=>{});});

/* ---------- waiting-room mini game: calculus quiz ---------- */
let quizQ=null,quizStreak=0,quizBest=0;try{quizBest=+localStorage.getItem('nablaQuizBest')||0;}catch(e){}
const rnd=n=>Math.floor(Math.random()*n),pick=a=>a[rnd(a.length)];
function qTerm(){
  const a=pick([1,1,2,3,4,5]),k=pick([1,1,2,3]);
  const lin=k===1?XX:Mul(N(k),XX);
  return S(pick([
    ()=>Mul(N(a),Pow(XX,F(1+rnd(4)))),
    ()=>Mul(N(a),Fn('sin',lin)),()=>Mul(N(a),Fn('cos',lin)),
    ()=>Fn('exp',lin),()=>Mul(XX,Fn('exp',XX)),()=>Mul(XX,Fn('sin',XX)),()=>Mul(XX,Fn('cos',XX)),
    ()=>Mul(Pow(XX,F(2)),Fn('exp',XX)),()=>Mul(Fn('sin',XX),Fn('cos',XX)),()=>Mul(N(a),Fn('ln',XX)),
    ()=>Mul(Fn('exp',XX),Fn('sin',XX)),()=>Pow(XX,F(1,2)),()=>Pow(XX,F(-1))
  ])());
}
function swapTrig(e){if(!e||typeof e!=='object')return e;if(e.k==='fn'){return {k:'fn',f:e.f==='sin'?'cos':e.f==='cos'?'sin':e.f,a:swapTrig(e.a)};}
  if(e.k==='add'||e.k==='mul')return {k:e.k,a:e.a.map(swapTrig)};if(e.k==='pow')return {k:'pow',b:swapTrig(e.b),e:e.e};return e;}
const same=(a,b)=>zeroish(S(Add(a,Mul(N(-1),b))));
function newQuiz(){
  for(let tries=0;tries<40;tries++){
    let f=qTerm();if(Math.random()<.3)f=S(Add(f,qTerm()));
    const op=Math.random()<.55?'d':'i';
    const ans=op==='d'?deriv(f):integ(f);
    if(!ans||zeroish(ans)||size(ans)>40)continue;
    const cands=[S(Mul(N(-1),ans)),S(Mul(N(2),ans)),S(Mul(N(1,2),ans)),S(swapTrig(ans)),op==='d'?f:deriv(f),op==='d'?deriv(ans):integ(ans),S(Add(ans,Mul(N(-1),swapTrig(ans))))];
    const opts=[ans];
    for(const c of cands){if(!c||zeroish(c)||size(c)>45)continue;if(opts.some(o=>same(o,c)))continue;opts.push(c);if(opts.length===4)break;}
    if(opts.length<4)continue;
    for(let i=opts.length-1;i>0;i--){const j=rnd(i+1);[opts[i],opts[j]]=[opts[j],opts[i]];}
    quizQ={f,op,ans,opts,done:false};renderQuiz();return;
  }
}
function renderQuiz(fb){
  const q=quizQ;if(!q)return;
  const qtext=q.op==='d'?`<span class="fr"><span class="nu">d</span><span class="de">d<i>x</i></span></span>(${H(q.f)}) = ?`:`∫ ${H(q.f)} d<i>x</i> = ?`;
  $('quiz').innerHTML=`<div class="qh"><b>待ち時間クイズ：${q.op==='d'?'微分':'積分'}</b><span>連続正解 <b>${quizStreak}</b>　最高 <b>${quizBest}</b></span></div>
    <div class="qq">${qtext}</div>
    <div class="qa">${q.opts.map((o,i)=>`<button id="qa${i}" data-i="${i}" class="${q.done?(same(o,q.ans)?'ok':i===q.pick?'ng':''):''}"${q.done?' disabled':''}>${H(o)}${q.op==='i'?' + C':''}</button>`).join('')}</div>
    <div class="qf ${fb||''}">${fb==='ok'?'正解！':fb==='ng'?'ざんねん。正しい答えは緑のものです。':'答えを選んでください。'}</div>`;
}
$('quiz').addEventListener('click',e=>{
  const b=e.target.closest('button[data-i]');if(!b||!quizQ||quizQ.done)return;
  const i=+b.dataset.i,ok=same(quizQ.opts[i],quizQ.ans);
  quizQ.done=true;quizQ.pick=i;
  if(ok){quizStreak++;if(quizStreak>quizBest){quizBest=quizStreak;try{localStorage.setItem('nablaQuizBest',quizBest);}catch(e){}}}else quizStreak=0;
  renderQuiz(ok?'ok':'ng');
  if(ok&&fxOn()){const p=mid(b.getBoundingClientRect());burst(p.x,p.y,[tok('--basis'),'#ffd36b'],30,7);}
  setTimeout(()=>{if(!$('mLobby').hidden)newQuiz();},ok?900:2200);
});

/* ---------- menu ---------- */
function menuView(v){
  ['mTop','mOnline','mWait','mJoin','mCpuSetup','mLobby'].forEach(id=>{const e=$(id);if(e)e.hidden=true;});
  $({top:'mTop',online:'mOnline',wait:'mWait',joining:'mWait',cpu:'mCpuSetup',lobby:'mLobby'}[v]).hidden=false;
  $('menuErr').hidden=true;
  document.querySelector('.mcard').classList.toggle('wide',v==='lobby'||v==='cpu');
}
function menuErr(t){menuView('online');$('menuErr').textContent=t;$('menuErr').hidden=false;}
function showMenu(note){closeNet();stopClock();$('menu').hidden=false;document.body.classList.add('modal-menu');menuView('top');$('nameIn').value=MYNAME;if(note){$('menuErr').textContent=note;$('menuErr').hidden=false;}}
function hideMenu(){$('menu').hidden=true;document.body.classList.remove('modal-menu');}
$('nameIn').addEventListener('input',()=>{MYNAME=$('nameIn').value;try{localStorage.setItem('nablaName',MYNAME);}catch(e){}});
$('mCpu').addEventListener('click',()=>{closeNet();menuView('cpu');ruleBox($('cpuRules'),SETUP,{editable:true,online:false,onChange:()=>{try{localStorage.setItem('nablaSetup',JSON.stringify(SETUP));}catch(e){}}});});
try{const s=JSON.parse(localStorage.getItem('nablaSetup')||'null');if(s)SETUP=Object.assign(SETUP,s);}catch(e){}
$('cpuStart').addEventListener('click',()=>startLocal());
$('mNet').addEventListener('click',()=>menuView('online'));
$('mHost').addEventListener('click',hostRoom);
$('mJoinBtn').addEventListener('click',joinRoom);
$('codeIn').addEventListener('keydown',e=>{if(e.key==='Enter')joinRoom();});
document.querySelectorAll('.mBack').forEach(b=>{if(b.id!=='lobLeave')b.addEventListener('click',()=>{closeNet();menuView('top');});});
$('menuBtn').addEventListener('click',()=>showMenu());
$('rules').addEventListener('toggle',()=>document.body.classList.toggle('modal-any',!!G.over||$('rules').open));

render();applyView();
tableIntro([{transform:'rotateX(0deg) translateY(-20px) scale(.92)',opacity:.4},{transform:'rotateX(30deg)',opacity:1}],900);
showMenu();
})();
