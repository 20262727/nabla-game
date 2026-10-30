(()=>{
let gid=0, G=newGame(), sel=[], msg='', err=false, busy=false, stuck=false, discMode=false, seq=0, shown=-1, dealt=-1;
const $=id=>document.getElementById(id);
const CATC={basis:'var(--basis)',calc:'var(--calc)',alg:'var(--alg)',lim:'var(--lim)'};
const selCards=()=>sel.map(i=>G.hands.you[i]);
const kind=()=>kindOf(selCards());
const myTurn=()=>G.turn==='you'&&!G.over&&!busy;
const face=c=>{const d=CARDS[c];return d.sub?`${d.face}<sub>${d.sub}</sub>`:d.face;};
const calm=()=>{try{return matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(e){return false;}};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function cardInner(cd){const d=CARDS[cd];
  return `<span class="f${d.face.replace(/<[^>]+>/g,'').length>3&&!d.sub?' sm':''}">${d.face}</span>${d.sub?`<span class="s">${d.sub}</span>`:''}<span class="n">${d.nm}</span>`;}

function hintText(){
  if(G.over)return '';
  if(busy)return G.turn==='cpu'?'CPU の番です…':'計算中…';
  if(G.turn!=='you')return 'CPU が考えています…';
  if(discMode)return '捨てるカードを選んでください。';
  if(!sel.length)return stuck?'出せる操作がありません。「手詰まり」で 1 枚捨ててください。':'手札からカードを選んでください。';
  switch(kind()){
    case 'add':return '追加する場の「＋ ここに追加」をタップしてください。';
    case 'side':return `${selCards()[0]==='lap'?'Δ':'∇'} をかける場の基底を、どれか 1 つタップしてください。`;
    case 'stack':return `対象の基底をタップ（${sel.length} 回${selCards()[0]==='dx'?'微分':'積分'}）。同じカードを選び足すと回数が増えます。`;
    case 'needfn':return '掛ける・割る関数カードを、手札からもう 1 枚選んでください。';
    case 'needop':return '0 は × と組み合わせて使います。手札の × も選んでください。';
    default:return '対象の基底をタップしてください。';
  }
}
function render(){
  $('turnInfo').textContent=G.over?'ゲーム終了':G.turn==='you'?`あなたの番（${G.turnNo+1} 手目）`:'CPU の番';
  $('deckN').textContent=G.deck.length;
  $('dimCpu').textContent=G.fields.cpu.length;$('dimYou').textContent=G.fields.you.length;
  $('cpuBacks').innerHTML=G.hands.cpu.map((_,i)=>`<span class="back" id="back-${i}"></span>`).join('');
  const k=myTurn()?kind():null;
  const tgB=['side','stack','muldiv','unary'].includes(k);
  for(const side of ['cpu','you']){
    const L=G.fields[side];
    let h=L.length?L.map((e,i)=>`<button class="bz${tgB?' tg':''}" id="bz-${side}-${i}" data-side="${side}" data-i="${i}"${tgB?'':' tabindex="-1" aria-disabled="true"'}>${H(e)}</button>`).join('')
      :'<span class="empty0">基底なし（0 次元）</span>';
    if(k==='add')h+=`<button class="drop" id="drop-${side}" data-side="${side}">＋ ここに追加</button>`;
    $(side==='cpu'?'basesCpu':'basesYou').innerHTML=h;
  }
  const c=$('calc');
  if(!G.last){if(shown!==0){c.innerHTML='<div class="hd">ここに計算の途中経過が出ます。</div>';shown=0;}}
  else if(G.last.id!==shown){shown=G.last.id;const l=G.last;
    c.innerHTML=`<div class="hd">${WHO[l.who]}${l.cs.length?` が <b>${l.cs.map(face).join(' ')}</b> を使用`:''}</div>`+
      l.steps.map((s,i)=>`<div class="ln" style="--i:${i}">${s}</div>`).join('');}
  const hn=$('hint');hn.textContent=err?msg:hintText();hn.classList.toggle('err',err);
  $('hand').innerHTML=G.hands.you.map((cd,i)=>{
    const cls=(sel.includes(i)?' sel':'')+(discMode?' disc':'');
    return `<button class="cd${cls}" id="cd-${i}" data-i="${i}" style="--c:${CATC[CARDS[cd].cat]}"${myTurn()?'':' aria-disabled="true"'} aria-pressed="${sel.includes(i)}">${cardInner(cd)}</button>`;}).join('');
  const sb=$('stuckBtn');sb.hidden=!(myTurn()&&stuck);sb.textContent=discMode?'取消':'手詰まり：1枚捨てる';
  $('clearSel').disabled=!sel.length;
  $('over').hidden=!G.over;
  if(G.over){$('overT').textContent=G.over.win==='you'?'あなたの勝ち':G.over.win==='cpu'?'CPU の勝ち':'引き分け';$('overS').textContent=G.over.why;}
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
  if(win==='you'){
    const cs=[tok('--basis'),tok('--calc'),tok('--alg'),tok('--lim'),'#ffd36b'];
    for(let i=0;i<6;i++)setTimeout(()=>{const x=W*(.15+Math.random()*.7),y=Hh*(.2+Math.random()*.4);burst(x,y,cs,70,11,{life:.9});glyphs(x,y,cs,14,10);ring(x,y,cs[i%5],180,8,.6);},i*220);
    flashFx('#fff3c4',.4,500);slam('Q.E.D.',tok('--basis'),W/2,Hh*.42,true);
  }else if(win==='cpu'){
    flashFx(tok('--gone'),.5,700);shakeFx(22,700);
    for(let i=0;i<3;i++)setTimeout(()=>glyphs(W*Math.random(),-10,[tok('--gone'),tok('--ink')],16,3),i*160);
    slam('0 次元…',tok('--gone'),W/2,Hh*.42,true);
  }else slam('引き分け',tok('--ink'),W/2,Hh*.42,true);
}

function flyCard(cd,from,to,delay,fromCpu){
  const el=document.createElement('div');
  el.className='cd fly';el.style.setProperty('--c',CATC[CARDS[cd].cat]);el.innerHTML=cardInner(cd);
  const w=fromCpu?66:from.width,h=fromCpu?94:from.height;
  const sx=from.left+from.width/2,sy=from.top+from.height/2;
  Object.assign(el.style,{left:(sx-w/2)+'px',top:(sy-h/2)+'px',width:w+'px',height:h+'px'});
  layer().appendChild(el);
  const dx=to.left+to.width/2-sx,dy=to.top+to.height/2-sy;
  const tilt=(Math.random()*2-1)*12;
  const a=el.animate([
    {transform:`translate(0,0) rotate(0deg) scale(${fromCpu?.35:1})`+(fromCpu?' rotateY(90deg)':''),opacity:fromCpu?0:1},
    {transform:`translate(${dx*.45}px,${dy*.45-46}px) rotate(${tilt}deg) scale(1.08)`,opacity:1,offset:.5},
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
  if(ld.who==='you'){const cs=[...document.querySelectorAll('#hand .cd')].slice(-ld.n);
    cs.forEach((el,k)=>el.animate([{transform:'translateY(40px) scale(.8)',opacity:0},{transform:'none',opacity:1}],{duration:380,delay:120+k*90,easing:'ease-out',fill:'backwards'}));}
  else{const bs=[...document.querySelectorAll('#cpuBacks .back')].slice(-ld.n);
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
async function runMove(who,idx,cs,tg,r){
  const my=gid;busy=true;
  $('hint').textContent=hintText();$('hint').classList.remove('err');
  const fate=r.fate;
  if(!calm()){
    const sideBox=$(tg.side==='cpu'?'basesCpu':'basesYou');
    const tEl=tg.i!==undefined?$(`bz-${tg.side}-${tg.i}`):(document.getElementById(`drop-${tg.side}`)||sideBox);
    const to=(tEl||sideBox).getBoundingClientRect();
    const flights=cs.map((cd,k)=>{
      if(who==='you'){const src=$(`cd-${idx[k]}`);const fr=src.getBoundingClientRect();src.style.visibility='hidden';return flyCard(cd,fr,to,k*90,false);}
      const b=$(`back-${idx[k]}`)||$('cpuBacks');const fr=b.getBoundingClientRect();b.style.visibility='hidden';return flyCard(cd,fr,to,k*90,true);
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
      const txt=r.steps.join(' ');
      const reason=fate.diverged?'div':/線形従属/.test(txt)&&!/0 になった|恒等的に 0|= 0 →/.test(txt)?'dep':'zero';
      fate.removed.forEach((i,k)=>{const el=$(`bz-${tg.side}-${i}`);if(el)setTimeout(()=>destroyFx(el.getBoundingClientRect(),reason,k),140+k*110);});
      if(fate.removed.length>1)setTimeout(()=>{const p=mid($(tg.side==='cpu'?'sideCpu':'sideYou').getBoundingClientRect());slam(`${fate.removed.length} 連続消滅！`,tok('--alg'),p.x,p.y-40,false);},420);
      await Promise.all(fate.removed.map((i,k)=>shatter($(`bz-${tg.side}-${i}`),fate.diverged,k*110)));
      if(my!==gid)return;
    }
  }
  commit(G,who,idx,cs,r);stamp();busy=false;sel=[];err=false;discMode=false;stuck=false;
  render();
  if(!calm()){afterRenderFx(fate);dealFx();}
  if(G.over)finaleFx(G.over.win);
  next();
}
function stamp(){if(G.last)G.last.id=++seq;}
function next(){
  if(G.over)return;
  const my=gid;
  if(G.turn==='cpu'){
    busy=true;render();
    setTimeout(()=>{
      if(my!==gid)return;
      const m=chooseMove(G,'cpu');
      if(m)runMove('cpu',m.idx,m.cs,m.tg,m.r);
      else{discardOne(G,'cpu',0);stamp();busy=false;render();next();}
    },700);
  }else setTimeout(()=>{if(my!==gid)return;stuck=!hasLegal(G,'you');render();},30);
}
function play(tg){
  if(!myTurn())return;
  const cs=selCards(),k=kind();
  if(k==='side'||k==='add')tg={side:tg.side};
  const r=simulate(G,'you',cs,tg);
  if(!r.ok){err=true;msg=r.why;render();return;}
  runMove('you',sel.slice(),cs,tg,r);
}
$('hand').addEventListener('click',e=>{
  const b=e.target.closest('.cd');if(!b||!myTurn())return;
  const i=+b.dataset.i;err=false;
  if(discMode){discardOne(G,'you',i);stamp();sel=[];discMode=false;stuck=false;render();if(!calm())dealFx();next();return;}
  if(sel.includes(i))sel=sel.filter(j=>j!==i);
  else{const cand=[...sel,i];sel=kindOf(cand.map(j=>G.hands.you[j]))?cand:[i];}
  render();
});
document.querySelector('.wrap').addEventListener('click',e=>{
  const b=e.target.closest('.bz.tg,.drop');if(!b)return;
  play({side:b.dataset.side,i:b.dataset.i===undefined?undefined:+b.dataset.i});
});
$('clearSel').addEventListener('click',()=>{sel=[];err=false;render();});
$('stuckBtn').addEventListener('click',()=>{discMode=!discMode;sel=[];render();});
const fxBtn=$('fxBtn');const fxLabel=()=>{fxBtn.textContent=FXON?'激しいエフェクト：ON':'激しいエフェクト：OFF';fxBtn.setAttribute('aria-pressed',FXON);};
fxLabel();fxBtn.addEventListener('click',()=>{FXON=!FXON;try{localStorage.setItem('nablaFx',FXON?'on':'off');}catch(e){}fxLabel();if(FXON){const p=mid(fxBtn.getBoundingClientRect());burst(p.x,p.y,[tok('--lim'),'#ffd36b'],40,7);}});
const restart=()=>{gid++;layer().innerHTML='';parts=[];rings=[];G=newGame();sel=[];err=false;busy=false;stuck=false;discMode=false;shown=-1;render();};
$('newBtn').addEventListener('click',restart);
$('again').addEventListener('click',restart);
render();
})();
