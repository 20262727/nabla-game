/* ===== Nabla engine: rational numbers, expression trees, calculus ===== */
const gcd=(a,b)=>{a=Math.abs(a);b=Math.abs(b);while(b){[a,b]=[b,a%b];}return a||1;};
function F(n,d=1){if(d<0){n=-n;d=-d;}const g=gcd(n,d);return {n:n/g,d:d/g};}
const fadd=(a,b)=>F(a.n*b.d+b.n*a.d,a.d*b.d), fmul=(a,b)=>F(a.n*b.n,a.d*b.d);
const fneg=a=>F(-a.n,a.d), finv=a=>F(a.d,a.n), fval=a=>a.n/a.d;
const fz=a=>a.n===0, fone=a=>a.n===a.d, fint=a=>a.d===1;
function snapF(v,tol){
  for(let d=1;d<=12;d++){const n=Math.round(v*d);if(Math.abs(n/d-v)<=tol*Math.max(1,Math.abs(v)))return F(n,d);}
  return null;
}
function approxF(v){return snapF(v,1e-3)||F(Math.round(v*1000),1000);}

const N=(n,d=1)=>({k:'num',v:F(n,d)}), NF=v=>({k:'num',v}), XX={k:'x'};
const Add=(...a)=>({k:'add',a}), Mul=(...a)=>({k:'mul',a}), Pow=(b,e)=>({k:'pow',b,e}), Fn=(f,a)=>({k:'fn',f,a});

function key(e){switch(e.k){
  case 'num':return e.v.n+'/'+e.v.d; case 'x':return 'x';
  case 'add':return '('+e.a.map(key).join('+')+')';
  case 'mul':return '['+e.a.map(key).join('*')+']';
  case 'pow':return '{'+key(e.b)+'^'+e.e.n+'/'+e.e.d+'}';
  case 'fn':return e.f+'('+key(e.a)+')';}}
const hasX=e=>e.k==='x'||(e.k==='add'||e.k==='mul'?e.a.some(hasX):e.k==='pow'?hasX(e.b):e.k==='fn'?hasX(e.a):false);
function size(e){return e.k==='add'||e.k==='mul'?1+e.a.reduce((s,c)=>s+size(c),0):e.k==='pow'?1+size(e.b):e.k==='fn'?1+size(e.a):1;}

function split(t){
  if(t.k==='num')return [t.v,null];
  if(t.k==='mul'&&t.a[0].k==='num'){const r=t.a.slice(1);return [t.a[0].v,r.length===1?r[0]:{k:'mul',a:r}];}
  return [F(1),t];
}
function mkTerm(c,r){if(fone(c))return r;return r.k==='mul'?{k:'mul',a:[NF(c),...r.a]}:{k:'mul',a:[NF(c),r]};}
function termW(t){const r=split(t)[1];if(!r)return -1;const fs=r.k==='mul'?r.a:[r];let d=0,fn=0;
  for(const f of fs){if(f.k==='x')d+=1;else if(f.k==='pow'&&f.b.k==='x')d+=fval(f.e);else fn=1000;}return fn+d;}
function facR(f){return f.k==='x'||(f.k==='pow'&&f.b.k==='x')?1:f.k==='pow'?2:f.k==='fn'&&f.f==='exp'?3:f.k==='fn'?4:5;}
const cmpTerm=(a,b)=>termW(b)-termW(a)||(key(a)<key(b)?-1:1);
const cmpFac=(a,b)=>facR(a)-facR(b)||(key(a)<key(b)?-1:1);

function S(e){switch(e.k){
  case 'num':case 'x':return e;
  case 'add':{
    const terms=[];for(const c of e.a){const s=S(c);if(s.k==='add')terms.push(...s.a);else terms.push(s);}
    const m=new Map();
    for(const t of terms){const [c,r]=split(t);const k=r?key(r):'#';const o=m.get(k);if(o)o.c=fadd(o.c,c);else m.set(k,{c,r});}
    const out=[];for(const {c,r} of m.values()){if(fz(c))continue;out.push(r?mkTerm(c,r):NF(c));}
    if(!out.length)return N(0);if(out.length===1)return out[0];
    out.sort(cmpTerm);return {k:'add',a:out};
  }
  case 'mul':{
    let c=F(1);const fs=[];
    for(const ch of e.a){const s=S(ch);
      if(s.k==='num')c=fmul(c,s.v);
      else if(s.k==='mul'){for(const g of s.a){if(g.k==='num')c=fmul(c,g.v);else fs.push(g);}}
      else fs.push(s);}
    if(fz(c))return N(0);
    const ai=fs.findIndex(f=>f.k==='add');
    if(ai>=0&&fs[ai].a.length<=12){const others=fs.filter((_,i)=>i!==ai);
      return S({k:'add',a:fs[ai].a.map(t=>({k:'mul',a:[NF(c),t,...others]}))});}
    const m=new Map();const ex=[];
    for(const f of fs){
      if(f.k==='fn'&&f.f==='exp'){ex.push(f.a);continue;}
      let b=f,p=F(1);if(f.k==='pow'){b=f.b;p=f.e;}
      const k=key(b);const o=m.get(k);if(o)o.e=fadd(o.e,p);else m.set(k,{b,e:p});}
    const out=[];
    const push=p=>{if(p.k==='num')c=fmul(c,p.v);else if(p.k==='mul'){for(const g of p.a){if(g.k==='num')c=fmul(c,g.v);else out.push(g);}}else out.push(p);};
    for(const {b,e:p} of m.values()){if(fz(p))continue;push(S(Pow(b,p)));}
    if(ex.length)push(S(Fn('exp',{k:'add',a:ex})));
    if(fz(c))return N(0);
    if(!out.length)return NF(c);
    out.sort(cmpFac);
    if(fone(c)&&out.length===1)return out[0];
    return {k:'mul',a:fone(c)?out:[NF(c),...out]};
  }
  case 'pow':{
    const b=S(e.b),p=e.e;
    if(fz(p))return N(1);if(fone(p))return b;
    if(b.k==='num'){
      if(fz(b.v))return fval(p)>0?N(0):Pow(b,p);
      if(fint(p)){let r=F(1);for(let i=0;i<Math.abs(p.n);i++)r=fmul(r,b.v);return NF(p.n<0?finv(r):r);}
      const v=evNum(Pow(b,p));
      if(Number.isFinite(v)){const a=snapF(v,1e-12);if(a)return NF(a);}
      return Pow(b,p);
    }
    if(b.k==='pow'&&(fint(p)||b.b.k==='x'&&fint(b.e)&&b.e.n%2===1))return S(Pow(b.b,fmul(b.e,p)));
    if(b.k==='mul'&&fint(p))return S({k:'mul',a:b.a.map(f=>Pow(f,p))});
    if(b.k==='mul'&&b.a[0].k==='num'&&b.a[0].v.n>0){
      const v=Math.pow(fval(b.a[0].v),fval(p));const a=snapF(v,1e-12);
      if(a){const rest=b.a.slice(1);return S(Mul(NF(a),Pow(rest.length===1?rest[0]:{k:'mul',a:rest},p)));}
    }
    if(b.k==='fn'&&b.f==='exp')return S(Fn('exp',Mul(NF(p),b.a)));
    return Pow(b,p);
  }
  case 'fn':{
    const a=S(e.a),f=e.f;
    if(a.k==='num'){
      const z=fz(a.v),one=fone(a.v);
      if(f==='sin'&&z)return N(0); if(f==='cos'&&z)return N(1); if(f==='exp'&&z)return N(1);
      if(f==='ln'&&one)return N(0); if(f==='asin'&&z)return N(0); if(f==='acos'&&one)return N(0);
      return Fn(f,a);
    }
    if(f==='ln'&&a.k==='fn'&&a.f==='exp')return a.a;
    if(f==='exp'&&a.k==='fn'&&a.f==='ln')return a.a;
    if(f==='sin'&&a.k==='fn'&&a.f==='asin')return a.a;
    if(f==='cos'&&a.k==='fn'&&a.f==='acos')return a.a;
    if(f==='ln'&&a.k==='pow'&&a.b.k==='x')return S(Mul(NF(a.e),Fn('ln',XX)));
    return Fn(f,a);
  }}}

function D(e){switch(e.k){
  case 'num':return N(0); case 'x':return N(1);
  case 'add':return {k:'add',a:e.a.map(D)};
  case 'mul':return {k:'add',a:e.a.map((f,i)=>({k:'mul',a:e.a.map((g,j)=>i===j?D(g):g)}))};
  case 'pow':return Mul(NF(e.e),Pow(e.b,fadd(e.e,F(-1))),D(e.b));
  case 'fn':{const u=e.a,du=D(u);switch(e.f){
    case 'sin':return Mul(Fn('cos',u),du);
    case 'cos':return Mul(N(-1),Fn('sin',u),du);
    case 'exp':return Mul(e,du);
    case 'ln':return Mul(du,Pow(u,F(-1)));
    case 'asin':return Mul(du,Pow(Add(N(1),Mul(N(-1),Pow(u,F(2)))),F(-1,2)));
    case 'acos':return Mul(N(-1),du,Pow(Add(N(1),Mul(N(-1),Pow(u,F(2)))),F(-1,2)));}}}}
const deriv=e=>S(D(e));

/* ---- integration (returns null when no closed form is handled) ---- */
function linArg(u){if(u.k==='x')return F(1);if(u.k==='mul'&&u.a.length===2&&u.a[0].k==='num'&&u.a[1].k==='x')return u.a[0].v;return null;}
const lin=a=>fone(a)?XX:Mul(NF(a),XX);
function byParts(n,f,a){
  const ax=lin(a), ia=finv(a);
  if(f==='exp'){const base=Mul(NF(ia),Pow(XX,F(n)),Fn('exp',ax));return n===0?base:Add(base,Mul(NF(fneg(fmul(F(n),ia))),byParts(n-1,'exp',a)));}
  if(f==='sin'){const base=Mul(NF(fneg(ia)),Pow(XX,F(n)),Fn('cos',ax));return n===0?base:Add(base,Mul(NF(fmul(F(n),ia)),byParts(n-1,'cos',a)));}
  const base=Mul(NF(ia),Pow(XX,F(n)),Fn('sin',ax));return n===0?base:Add(base,Mul(NF(fneg(fmul(F(n),ia))),byParts(n-1,'sin',a)));
}
function trigQ(f,q){if(fz(q))return f==='cos'?N(1):N(0);return Fn(f,lin(q));}
function prodToSum(f1,a,f2,b){
  const s=fadd(a,b),d=fadd(a,fneg(b)),h=N(1,2),mh=N(-1,2);
  if(f1==='sin'&&f2==='sin')return Add(Mul(h,trigQ('cos',d)),Mul(mh,trigQ('cos',s)));
  if(f1==='cos'&&f2==='cos')return Add(Mul(h,trigQ('cos',d)),Mul(h,trigQ('cos',s)));
  if(f1==='sin')return Add(Mul(h,trigQ('sin',s)),Mul(h,trigQ('sin',d)));
  return prodToSum('sin',b,'cos',a);
}
const isTrig=q=>q.k==='fn'&&(q.f==='sin'||q.f==='cos');
function IT(r){
  const fs=r.k==='mul'?r.a:[r];let n=F(0);const others=[];
  for(const f of fs){if(f.k==='x')n=fadd(n,F(1));else if(f.k==='pow'&&f.b.k==='x')n=fadd(n,f.e);else others.push(f);}
  if(!others.length){if(n.n===-n.d)return Fn('ln',XX);const m=fadd(n,F(1));return Mul(NF(finv(m)),Pow(XX,m));}
  if(others.length===1){const g=others[0];
    if(g.k==='fn'&&['exp','sin','cos'].includes(g.f)){const a=linArg(g.a);if(a&&fint(n)&&n.n>=0&&n.n<=6)return byParts(n.n,g.f,a);}
    if(g.k==='fn'&&g.f==='ln'&&g.a.k==='x'){
      if(n.n===-n.d)return Mul(N(1,2),Pow(Fn('ln',XX),F(2)));
      const m=fadd(n,F(1));return Add(Mul(NF(finv(m)),Pow(XX,m),Fn('ln',XX)),Mul(NF(fneg(finv(fmul(m,m)))),Pow(XX,m)));}
    if(g.k==='pow'&&isTrig(g.b)&&g.e.n===2&&g.e.d===1&&fz(n)){const a=linArg(g.b.a);if(a)return I(S(prodToSum(g.b.f,a,g.b.f,a)));}
    return null;}
  if(others.length===2&&fz(n)){const [g,h]=others;
    const ex=[g,h].find(q=>q.k==='fn'&&q.f==='exp'),tr=[g,h].find(isTrig);
    if(ex&&tr){const a=linArg(ex.a),b=linArg(tr.a);if(a&&b){
      const den=finv(fadd(fmul(a,a),fmul(b,b)));const sb=Fn('sin',tr.a),cb=Fn('cos',tr.a);
      const inner=tr.f==='sin'?Add(Mul(NF(a),sb),Mul(NF(fneg(b)),cb)):Add(Mul(NF(a),cb),Mul(NF(b),sb));
      return Mul(NF(den),ex,inner);}}
    if(isTrig(g)&&isTrig(h)){const a=linArg(g.a),b=linArg(h.a);if(a&&b)return I(S(prodToSum(g.f,a,h.f,b)));}
  }
  return null;
}
function I(e){
  if(e.k==='add'){const p=e.a.map(I);if(p.some(q=>!q))return null;return S({k:'add',a:p});}
  const [c,r]=split(e);if(!r)return S(Mul(NF(c),XX));
  const t=IT(r);return t?S(Mul(NF(c),t)):null;
}
const integ=e=>I(S(e));

/* ---- inverse function ---- */
function invInto(e,y){
  if(e.k==='x')return y;
  if(e.k==='num')return null;
  if(e.k==='add'){const xs=e.a.filter(hasX),cs=e.a.filter(t=>!hasX(t));if(xs.length!==1)return null;
    return invInto(xs[0],cs.length?Add(y,Mul(N(-1),{k:'add',a:cs})):y);}
  if(e.k==='mul'){const xs=e.a.filter(hasX),cs=e.a.filter(t=>!hasX(t));if(xs.length!==1)return null;
    return invInto(xs[0],cs.length?Mul(y,Pow({k:'mul',a:cs},F(-1))):y);}
  if(e.k==='pow'){if(e.e.d%2===0&&e.e.n%2!==0){/* √-like: inverse is a power */}
    return invInto(e.b,Pow(y,finv(e.e)));}
  if(e.k==='fn'){const m={exp:'ln',ln:'exp',sin:'asin',cos:'acos',asin:'sin',acos:'cos'};return invInto(e.a,Fn(m[e.f],y));}
  return null;
}
const inverse=e=>{const r=invInto(S(e),XX);return r?S(r):null;};

/* ---- numerics ---- */
function ev(e,x){switch(e.k){
  case 'num':return fval(e.v); case 'x':return x;
  case 'add':{let s=0;for(const c of e.a)s+=ev(c,x);return s;}
  case 'mul':{let p=1;for(const c of e.a)p*=ev(c,x);return p;}
  case 'pow':{const b=ev(e.b,x),p=fval(e.e);
    if(b<0){if(e.e.d%2===0)return NaN;const r=Math.pow(-b,p);return e.e.n%2?-r:r;}
    if(b===0&&p<0)return NaN;return Math.pow(b,p);}
  case 'fn':{const u=ev(e.a,x);switch(e.f){
    case 'sin':return Math.sin(u);case 'cos':return Math.cos(u);case 'exp':return Math.exp(u);
    case 'ln':return u>0?Math.log(u):NaN;
    case 'asin':return Math.abs(u)<=1?Math.asin(u):NaN;case 'acos':return Math.abs(u)<=1?Math.acos(u):NaN;}}}}
const evNum=e=>ev(e,0);
const PTS=[-2.9,-2.1,-1.37,-0.83,-0.67,-0.41,0.17,0.29,0.43,0.53,0.61,0.77,0.97,1.09,1.31,1.73,2.27,2.83,3.41,4.07];
const vcache=new Map();
function vec(e){const k=key(e);let v=vcache.get(k);if(!v){v=PTS.map(x=>{const y=ev(e,x);return Number.isFinite(y)?y:NaN;});if(vcache.size>3000)vcache.clear();vcache.set(k,v);}return v;}
const domainOK=e=>vec(e).filter(v=>!Number.isNaN(v)).length>=2;
const zeroish=e=>{const v=vec(e).filter(x=>!Number.isNaN(x));return v.length>0&&v.every(x=>Math.abs(x)<1e-10);};
function rank(es){
  const vs=es.map(vec);const cols=PTS.map((_,j)=>j).filter(j=>vs.every(v=>!Number.isNaN(v[j])));
  if(cols.length<es.length+1)return es.length;
  const M=vs.map(v=>{const r=cols.map(j=>v[j]);const m=Math.max(...r.map(Math.abs));return m>0?r.map(x=>x/m):r;});
  let rk=0;const rows=M.length,nc=cols.length;
  for(let c=0;c<nc&&rk<rows;c++){
    let p=rk;for(let i=rk+1;i<rows;i++)if(Math.abs(M[i][c])>Math.abs(M[p][c]))p=i;
    if(Math.abs(M[p][c])<1e-7)continue;
    [M[p],M[rk]]=[M[rk],M[p]];
    for(let i=0;i<rows;i++)if(i!==rk){const f=M[i][c]/M[rk][c];for(let j=c;j<nc;j++)M[i][j]-=f*M[rk][j];}
    rk++;}
  return rk;
}
const dependentOn=(kept,e)=>kept.length>0&&rank([...kept,e])<=kept.length;

/* ---- limits (numerical) ---- */
function seqResult(xs,e){
  const v=xs.map(x=>ev(e,x));
  if(v.some(Number.isNaN))return {bad:'domain'};
  const last=v[v.length-1],prev=v[v.length-2],pp=v[v.length-3];
  const big=x=>!Number.isFinite(x)||Math.abs(x)>1e6;
  if(big(last)&&(big(prev)||Math.abs(prev)<Math.abs(last)))return {inf:Math.sign(last)};
  const grow=Math.abs(last)>Math.abs(prev)&&Math.abs(prev)>Math.abs(pp)&&Math.abs(last)>5&&Math.sign(last)===Math.sign(prev);
  if(Math.abs(last-prev)<1e-3*(1+Math.abs(last)))return {val:last};
  if(grow)return {inf:Math.sign(last)};
  return {bad:'osc'};
}
function windowRange(e,a,w,step){let mn=Infinity,mx=-Infinity,bad=false,turns=0,pd=0,prev=NaN;
  const n=Math.round(Math.abs(w/step));
  for(let i=0;i<=n;i++){const x=a+i*step;const y=ev(e,x);if(Number.isNaN(y)){bad=true;continue;}
    if(y<mn)mn=y;if(y>mx)mx=y;
    if(!Number.isNaN(prev)){const d=Math.sign(y-prev);if(d&&pd&&d!==pd)turns++;if(d)pd=d;}prev=y;}
  return {mn,mx,bad,turns};}
function limitOf(e,kind){
  e=S(e);
  if(!hasX(e)){const v=evNum(e);return Number.isFinite(v)?{val:v}:{bad:'domain'};}
  if(kind==='limp'||kind==='limm'){
    const s=kind==='limp'?1:-1;
    const r1=windowRange(e,s*1e5,40*s,0.05*s);
    if(r1.turns>3&&r1.mx-r1.mn>1e-6*(1+Math.abs(r1.mx)))return {bad:'osc'};
    return seqResult([1e4,1e5,1e6,1e7,1e8].map(x=>s*x),e);
  }
  if(kind==='lim0'){
    const R=seqResult([1e-4,1e-5,1e-6,1e-7,1e-8],e), L=seqResult([-1e-4,-1e-5,-1e-6,-1e-7,-1e-8],e);
    for(const a of [1e-6,-2e-6]){const near=windowRange(e,a,1e-6,2e-8);
      if(near.turns>3&&near.mx-near.mn>1e-6*(1+Math.abs(near.mx)))return {bad:'osc'};}
    if(R.bad==='domain'&&L.bad==='domain')return {bad:'domain'};
    if(R.bad==='domain')return L; if(L.bad==='domain')return R;
    if(R.bad||L.bad)return {bad:'osc'};
    if(R.inf!==undefined&&L.inf!==undefined&&R.inf===L.inf)return R;
    if(R.val!==undefined&&L.val!==undefined&&Math.abs(R.val-L.val)<1e-3*(1+Math.abs(R.val)))return R;
    return {bad:'two'};
  }
  // liminf / limsup  (x → +∞)
  const r0=windowRange(e,1e4,40,0.01), r1=windowRange(e,1e6,40,0.01);
  if(r1.bad&&!Number.isFinite(r1.mx))return {bad:'domain'};
  const pick=kind==='limsup'?'mx':'mn';
  const a=r0[pick],b=r1[pick];
  if(!Number.isFinite(b)||Math.abs(b)>1e6||(Math.abs(b)>10*Math.abs(a)&&Math.abs(b)>1e3))return {inf:Math.sign(b)};
  if(Math.abs(b-a)>1e-2*(1+Math.abs(b))&&Math.abs(b)>Math.abs(a))return {inf:Math.sign(b)};
  return {val:b};
}

/* ---- HTML display ---- */
const SUPD='⁰¹²³⁴⁵⁶⁷⁸⁹';
const supInt=n=>String(n).split('').map(c=>SUPD[c]).join('');
const fracT=v=>v.d===1?String(Math.abs(v.n)):Math.abs(v.n)+'/'+v.d;
const FR=(a,b)=>`<span class="fr"><span class="nu">${a}</span><span class="de">${b}</span></span>`;
const RT=a=>`<span class="rt"><span class="rs">√</span><span class="rad">${a}</span></span>`;
const fracH=v=>v.d===1?String(Math.abs(v.n)):FR(Math.abs(v.n),v.d);
const FNAME={sin:'sin',cos:'cos',ln:'log',asin:'arcsin',acos:'arccos'};
function simpleArg(a){return a.k==='x'||a.k==='num'&&a.v.n>=0&&a.v.d===1||(a.k==='mul'&&a.a.length===2&&a.a[0].k==='num'&&a.a[0].v.d===1&&a.a[0].v.n>0&&a.a[1].k==='x');}
function showFactor(f){
  switch(f.k){
    case 'x':return '<i>x</i>';
    case 'num':return (f.v.n<0?'−':'')+fracH(f.v);
    case 'add':return '('+H(f)+')';
    case 'pow':{
      if(f.e.n===1&&f.e.d===2)return RT(H(f.b));
      const base=f.b.k==='x'?'<i>x</i>':'('+H(f.b)+')';
      if(fint(f.e)&&f.e.n>0)return base+supInt(f.e.n);
      return base+'<sup>'+(f.e.n<0?'−':'')+fracH(f.e)+'</sup>';}
    case 'fn':
      if(f.f==='exp')return '<i>e</i><sup>'+H(f.a)+'</sup>';
      return FNAME[f.f]+(simpleArg(f.a)?' '+H(f.a):'('+H(f.a)+')');
    default:return H(f);}
}
const needsSep=f=>(f.k==='fn'&&f.f!=='exp')||(f.k==='pow'&&f.e.n===1&&f.e.d===2);
function joinF(fs){return fs.map((f,i)=>(i>0&&(needsSep(f)||needsSep(fs[i-1]))?' ':'')+showFactor(f)).join('');}
function showTerm(t){
  const [c,r]=split(t);
  if(!r)return fracH(c);
  const fs=r.k==='mul'?r.a:[r];const num=[],den=[];
  for(const f of fs){if(f.k==='pow'&&f.e.n<0)den.push(f.e.n===-f.e.d?f.b:Pow(f.b,fneg(f.e)));else num.push(f);}
  const solo=(fs,cd)=>fs.length===1&&fs[0].k==='add'&&cd===1;
  let ns=solo(num,Math.abs(c.n))?H(num[0]):joinF(num);const an=Math.abs(c.n);
  if(an!==1)ns=an+(num.length&&needsSep(num[0])?' ':'')+ns;
  if(!ns)ns='1';
  let ds=solo(den,c.d)?H(den[0]):joinF(den);const dc=den.length+(c.d!==1?1:0);
  if(c.d!==1)ds=c.d+(den.length&&needsSep(den[0])?' ':'')+ds;
  if(!ds)return ns;
  void dc;return FR(ns,ds);
}
function H(e){
  if(e.k==='add')return e.a.map((t,i)=>{const neg=split(t)[0].n<0;const s=showTerm(t);return i===0?(neg?'−':'')+s:(neg?' − ':' + ')+s;}).join('');
  return (split(e)[0].n<0?'−':'')+showTerm(e);
}
