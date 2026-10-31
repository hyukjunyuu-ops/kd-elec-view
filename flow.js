/* =========================================================
   flow.js v4 — 전기 Flow (끝없는 바탕 · 한 장 그림 · 확대 단계 표시)
   ========================================================= */
(function(){const o=document.getElementById('flStyle');if(o)o.remove();const s=document.createElement('style');s.id='flStyle';s.textContent=`
#view .flBar{display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin-bottom:6px}
#view .flBar button,#view .flEd button{padding:4px 9px;border:1px solid #d6dbe8;background:#fff;border-radius:6px;font-size:12px;cursor:pointer;color:#334155;display:inline-flex;align-items:center;gap:4px;line-height:1.3}
#view .flBar button.on,#view .flEd button.on{background:#262f7d;color:#fff;border-color:#262f7d}
#view .flEd button:disabled{opacity:.5;cursor:default}
#view .flBar button.out{border-color:#fca5a5;color:#b91c1c;font-weight:700}
#view .flBar button.out.on{background:#dc2626;color:#fff;border-color:#dc2626}
#view .flBar .seg{display:inline-flex;gap:2px}
#view .flBar .sp{flex:1}
#view .flBar label{display:inline-flex;align-items:center;gap:3px;font-size:12px;color:#475569;margin:0 3px;cursor:pointer}
#view .flBar input[type=range]{width:70px}
#view .flTt{font-size:15px;color:#262f7d;margin-right:6px}
#view .flCr{font-size:13px;font-weight:700;color:#0f172a;margin:0 6px 0 2px}
#view .flLg{display:inline-flex;flex-wrap:wrap;gap:8px;align-items:center;font-size:11px;color:#475569;margin-right:6px}
#view .flLg span{display:inline-flex;align-items:center;gap:3px}
#view .flLg svg{width:26px;height:8px}
#view .flEd{display:flex;flex-wrap:wrap;gap:6px;align-items:center;background:#fff7d6;border:1px solid #f2d675;border-radius:6px;padding:5px 6px;margin-bottom:6px;font-size:12px}
#view .flEd .gp{display:inline-flex;flex-wrap:wrap;gap:3px;align-items:center;padding-right:6px;border-right:1px solid #f2d675}
#view .flEd .gp>i{font-style:normal;color:#7a5a00;font-weight:700;margin-right:2px}
#view .flEd button svg{width:16px;height:16px}
#view .flEd button svg.lsw{width:22px;height:8px}
#view .flEd input,#view .flEd select{padding:3px 6px;border:1px solid #d6dbe8;border-radius:4px;font-size:12px}
#view .flEd input{width:150px}
#view .flEd .dng{color:#dc2626}
#view .flEd .lkn{color:#262f7d;font-weight:700}
#view .flHint{background:#eef2ff;border:1px solid #c7d2fe;color:#1e3a8a;border-radius:6px;padding:5px 8px;font-size:12px;margin-bottom:6px}
#view .flHint.soft{background:#f8fafc;border-color:#e2e8f0;color:#64748b}
#view .flHint button{padding:2px 8px;border:1px solid #c7d2fe;background:#fff;border-radius:6px;font-size:12px;cursor:pointer;margin-left:4px}
#view .flOut{background:#fef2f2;border:1px solid #fecaca;color:#991b1b;border-radius:6px;padding:6px 8px;font-size:12px;margin-bottom:6px;line-height:1.7}
#view .flOut .go{display:inline-block;margin:2px 3px 0 0;padding:0 8px;border:1px solid #fca5a5;background:#fff;border-radius:10px;font-size:11.5px;color:#991b1b;cursor:pointer}
#view .flOut .go:hover{background:#fee2e2}
#view .flOut .go b{color:#dc2626}
#view #flW{position:relative;overflow:hidden;border:1px solid #e2e8f0;border-radius:8px;background:#eef1f6;touch-action:none;user-select:none;height:500px}
#view #flW.pan{cursor:grab}
#view #flW.panning,#view #flW.panning *{cursor:grabbing!important}
#view #flW.put,#view #flW.put *{cursor:crosshair!important}
#view #flSvg{display:block;width:100%;height:100%}
#view #flNo{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);text-align:center;color:#64748b;font-size:13px;line-height:1.7;pointer-events:none;background:rgba(255,255,255,.9);padding:10px 16px;border-radius:8px}
#view .fl-b .bp{fill:#e2e8f0;fill-opacity:.95;stroke:#475569;cursor:pointer}
#view .fl-b.act .bp{fill:#dbe3ff;stroke:#262f7d}
#view .fl-b.sel .bp{stroke:#262f7d}
#view .fl-b.msel .bp{fill:#fef3c7;stroke:#d97706}
#view #flW.ed .fl-b .bp{cursor:move}
#view .fl-b text{pointer-events:none;font-weight:800;fill:#1e293b}
#view .fl-b text.bc{font-weight:700;fill:#262f7d}
#view .hd{fill:#fff;stroke:#262f7d;cursor:pointer}
#view .bprev{fill:#262f7d;fill-opacity:.08;stroke:#262f7d;pointer-events:none}
#view .fl-l .hit{fill:none;stroke:transparent;pointer-events:stroke;cursor:pointer}
#view .fl-l .base,#view .fl-l .fx,#view .fl-l .glow,#view .prev{fill:none;stroke-linecap:round;stroke-linejoin:round;pointer-events:none}
#view .fl-l .glow{stroke:#262f7d;stroke-opacity:.3}
#view .fl-l.msel .glow{stroke:#f59e0b;stroke-opacity:.55}
#view .fl-l .fx{stroke:#fff;stroke-opacity:.85}
#view .fl-l.od{opacity:.3}
#view .fl-l.gh,#view .fl-i.gh,#view .fl-i.off{opacity:.35}
#view .fl-l.dim{opacity:.12}
#view .fl-i.dim{opacity:.18}
#view .fl-i.off svg{filter:grayscale(1)}
#view .fl-i{cursor:pointer}
#view #flW.ed .fl-i{cursor:move}
#view .fl-i .icb{fill:#fff;filter:url(#flSh)}
#view .fl-i text,#view #flBox,#view .prev{pointer-events:none}
`;document.head.appendChild(s);})();

/* ---------- 아이콘 · 선 종류 ---------- */
const FL_T={
 in:{l:'한전 인입',s:'<svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="4" fill="#fee2e2" stroke="#b91c1c" stroke-width="1.5"/><path d="M13.5 3.5L6.5 13h5l-1.5 7.5L17.5 11h-5z" fill="#dc2626"/></svg>'},
 ss:{l:'변전실',s:'<svg viewBox="0 0 24 24"><path d="M3 11L12 4l9 7v9H3z" fill="#e0e7ff" stroke="#262f7d" stroke-width="1.5" stroke-linejoin="round"/><path d="M13 9.5l-4 5h3l-1 4 4-5.5h-3z" fill="#262f7d"/></svg>'},
 tr:{l:'변압기',s:'<svg viewBox="0 0 24 24"><circle cx="9" cy="12" r="6" fill="#fff7ed" stroke="#9a3412" stroke-width="1.8"/><circle cx="15" cy="12" r="6" fill="none" stroke="#9a3412" stroke-width="1.8"/></svg>'},
 mcc:{l:'MCC반',s:'<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" fill="#f1f5f9" stroke="#334155" stroke-width="1.5"/><path d="M9 3v18M15 3v18" stroke="#cbd5e1"/><text x="12" y="14.5" text-anchor="middle" font-size="6.5" font-weight="bold" fill="#0f172a">MCC</text></svg>'},
 pv:{l:'태양광',s:'<svg viewBox="0 0 24 24"><path d="M5 5h15l-2.5 10H2.5z" fill="#dbeafe" stroke="#1d4ed8" stroke-width="1.4" stroke-linejoin="round"/><path d="M10 5l-2.5 10M15 5l-2.5 10M3.8 10h15" stroke="#1d4ed8" stroke-width="1"/><path d="M11 15v5M7 20h8" stroke="#475569" stroke-width="1.5"/></svg>'},
 ess:{l:'ESS',s:'<svg viewBox="0 0 24 24"><rect x="2.5" y="6" width="16.5" height="12" rx="2" fill="#dcfce7" stroke="#15803d" stroke-width="1.5"/><rect x="19" y="10" width="2.5" height="4" rx="1" fill="#15803d"/><path d="M12 7.5l-3.5 5.5h2.5l-1 3.5 3.8-5.5H11z" fill="#15803d"/></svg>'},
 gen:{l:'비상발전기',s:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#fee2e2" stroke="#b91c1c" stroke-width="1.6"/><text x="12" y="16" text-anchor="middle" font-size="10" font-weight="bold" fill="#b91c1c">G</text></svg>'},
 cgen:{l:'CTTS 발전기',s:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#dcfce7" stroke="#15803d" stroke-width="1.6"/><text x="12" y="16" text-anchor="middle" font-size="10" font-weight="bold" fill="#15803d">G</text></svg>'},
 acb:{l:'ACB',s:'<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" fill="#27272a" stroke="#000" stroke-width="1.5"/><rect x="7" y="5.5" width="10" height="5" rx="1" fill="#52525b"/><rect x="10.5" y="6.5" width="3" height="3" rx=".5" fill="#e4e4e7"/><text x="12" y="17.5" text-anchor="middle" font-size="6.5" font-weight="bold" fill="#fff">ACB</text></svg>'},
 jn:{l:'분기점'}
};
const FL_ICONS=['in','ss','tr','mcc','acb','pv','ess','gen','cgen'];
const FL_SRCT={in:1,pv:1,ess:1,gen:1,cgen:1},FL_HIDE={gen:1,cgen:1};
const FL_CT={ss:'변전실',tr:'TR',mcc:'MCC',acb:'ACB',ess:'ESS',pv:'태양광'};
const FL_DOT={in:'#dc2626',ss:'#262f7d',tr:'#c2410c',mcc:'#334155',acb:'#27272a',pv:'#1d4ed8',ess:'#15803d',gen:'#b91c1c',cgen:'#15803d',jn:'#334155'};
const FL_K={hv:{l:'22.9kV',c:'#dc2626',w:6},mv:{l:'3.3kV',c:'#ea580c',w:4.5},lv:{l:'저압',c:'#2563eb',w:3.5},em:{l:'비상',c:'#dc2626',w:3.5,d:[10,7]}};
const FL={edit:false,tool:'',lk:'hv',draw:null,sel:'',selL:'',selB:'',bd:null,bpick:'',out:false,lastSel:null,view:'',sz:1,ls:1,nm:true,orth:false,cams:{},ms:new Set(),msB:new Set(),msV:'',spc:false,lc:{id:'',t:0},goC:'',focN:false,focB:false,box:null,_inB:new Set()};
try{const o=JSON.parse(localStorage.getItem('ckd_elec2_flow')||'{}'),o2=JSON.parse(localStorage.getItem('ckd_elec2_flow2')||'{}');
  if(FL_K[o.lk])FL.lk=o.lk;if(o.v4){if(+o.sz)FL.sz=+o.sz;if(o.cams&&typeof o.cams==='object')FL.cams=o.cams;}
  if(+o.ls||+o2.ls)FL.ls=+o.ls||+o2.ls;if(o.nm===false)FL.nm=false;FL.orth=!!(o.orth||o2.orth);}catch(e){}
let flKT=0;function flKeep(){clearTimeout(flKT);flKT=setTimeout(()=>{try{localStorage.setItem('ckd_elec2_flow',JSON.stringify({v4:1,lk:FL.lk,sz:FL.sz,ls:FL.ls,nm:FL.nm,orth:FL.orth,cams:FL.cams}));}catch(e){}},300);}
const flR=v=>Math.round(v*10)/10,f1=v=>(+v).toFixed(1);

/* ---------- 데이터 (옛 % 좌표 → 새 좌표, 처음 한 번) ---------- */
function flLsp(l,M){const A=M.get(l.a),B=M.get(l.b);if(!A||!B)return '';
  if(B.g&&(A.id===B.g||A.g===B.g))return B.g;if(A.g&&(B.id===A.g||B.g===A.g))return A.g;return A.g||B.g||'';}
function flMig4(f){try{localStorage.setItem('ckd_elec2_flow_v3bak',JSON.stringify(f));}catch(e){}
  const bad=new Set(f.items.filter(i=>/^(ats|ctts|bld)$/.test(i.t)).map(i=>i.id));
  f.items=f.items.filter(i=>!bad.has(i.id));f.lines=f.lines.filter(l=>!bad.has(l.a)&&!bad.has(l.b));
  const M=new Map(f.items.map(i=>[i.id,i]));
  const sc=id=>{const o=id?M.get(id):f,bw=o&&o.bw>0?o.bw:1,ar=o&&o.ar>0?o.ar:.6;return [10*bw,10*ar*bw];};
  const cv=(x,y,s)=>({x:flR(x*s[0]),y:flR(y*s[1])});
  f.items.forEach(i=>{const p=cv(+i.x||0,+i.y||0,sc(i.g||''));i.x=p.x;i.y=p.y;});
  f.items.forEach(i=>{if(i.ex==null&&!f.items.some(x=>x.g===i.id))return;const p=cv(i.ex!=null?i.ex:6,i.ey!=null?i.ey:10,sc(i.id));i.ex=p.x;i.ey=p.y;});
  f.lines.forEach(l=>{if(l.pts&&l.pts.length){const s=sc(flLsp(l,M));l.pts=l.pts.map(p=>cv(p.x,p.y,s));}});
  const s0=sc('');f.blds.forEach(b=>{b.pts=(b.pts||[]).map(p=>cv(p.x,p.y,s0));});
  ['ar','bw','bv','tv'].forEach(k=>delete f[k]);f.items.forEach(i=>{delete i.ar;delete i.bw;});
  f.v4=1;setTimeout(save);}
function flD(){if(!S.flow||typeof S.flow!=='object')S.flow={};const f=S.flow;
  ['items','lines','blds'].forEach(k=>{if(!Array.isArray(f[k]))f[k]=[];});
  if(!f.v4){if(f.items.length||f.blds.length)flMig4(f);else f.v4=1;}
  return f;}
const flI=id=>id?flD().items.find(i=>i.id===id):null;
const flB=id=>id?flD().blds.find(b=>b.id===id):null;
const flNm=i=>i?(i.name||(FL_T[i.t]||{}).l||''):'?';
const flVis=i=>!!i&&(FL.view?(i.g===FL.view||i.id===FL.view):!i.g);
const flP=i=>FL.view&&i.id===FL.view?{x:i.ex!=null?i.ex:0,y:i.ey!=null?i.ey:0}:{x:i.x,y:i.y};
function flSetP(i,x,y){x=flR(x);y=flR(y);if(FL.view&&i.id===FL.view){i.ex=x;i.ey=y;}else{i.x=x;i.y=y;}}
function flUnder(x,id){for(let g=0;x&&g<30;g++){if(x.g===id)return true;x=x.g&&flI(x.g);}return false;}
function flDbl(id){const n=Date.now(),r=FL.lc.id===id&&n-FL.lc.t<400;FL.lc={id:r?'':id,t:n};return r;}
function flRe(){flKeep();if(typeof renderView==="function")renderView();} // app.js보다 먼저 불리면 그리기만 건너뜀
const flPM=new WeakMap();
function flBusL(i){return i.bl>0?i.bl:100;}
function flBusSnap(i,q){const P=flP(i),L=flBusL(i);
  return i.bo==='v'?{x:P.x,y:Math.max(P.y-L,Math.min(P.y+L,q.y))}:{x:Math.max(P.x-L,Math.min(P.x+L,q.x)),y:P.y};}
function flStep(p,q,hz){const dx=q.x-p.x,dy=q.y-p.y,T=5;
  if(Math.abs(dx)<T)return [p,{x:p.x,y:q.y}];
  if(Math.abs(dy)<T)return [p,{x:q.x,y:p.y}];
  if(hz==null)hz=Math.abs(dx)>2*Math.abs(dy);
  if(hz){const mx=(p.x+q.x)/2;return [p,{x:mx,y:p.y},{x:mx,y:q.y},q];}
  const my=(p.y+q.y)/2;return [p,{x:p.x,y:my},{x:q.x,y:my},q];}
function flRoute(A,B){const pa=flP(A),pb=flP(B),ab=A.t==='bus',bb=B.t==='bus';let s,e;
  if(ab&&bb){s=flBusSnap(A,pb);e=flBusSnap(B,s);return flStep(s,e,A.bo==='v');}
  if(ab){s=flBusSnap(A,pb);return flStep(s,pb,A.bo==='v');}
  if(bb){e=flBusSnap(B,pa);return flStep(pa,e,B.bo==='v');}
  return flStep(pa,pb);}
function flChain(a,pts,b){const A=flI(a),B=b?flI(b):null,l=pts&&flPM.get(pts);
  if(l&&l.au===1&&A&&B)return flRoute(A,B);
  const o=[];if(A)o.push(flP(A));(pts||[]).forEach(p=>o.push(p));if(B)o.push(flP(B));
  if(A&&A.t==='bus'&&o.length>1)o[0]=flBusSnap(A,o[1]);
  if(B&&B.t==='bus'&&o.length>1)o[o.length-1]=flBusSnap(B,o[o.length-2]);
  return o;}
const flPts=arr=>arr.map(p=>f1(p.x)+','+f1(p.y)).join(' ');
function flSw(c,d,cls){return `<svg${cls?` class="${cls}"`:''} viewBox="0 0 26 8"><line x1="1" y1="4" x2="25" y2="4" stroke="${c}" stroke-width="3"${d?` stroke-dasharray="${d.map(v=>v/2.5).join(' ')}"`:''}/></svg>`;}
function flIsEm(l,M){const a=M?M.get(l.a):flI(l.a);return l.k==='em'||!!(a&&FL_HIDE[a.t]);}
function flLoadsUnder(id){let n=0;if(typeof kids!=='function')return 0;
  const w=(x,d)=>{if(d>30)return;(kids(x)||[]).forEach(c=>{if(!c)return;if(c.type==='LOAD')n++;w(c.id,d+1);});};w(id,0);return n;}
function flTw(s,fs){let w=0;for(const ch of String(s))w+=/[\u1100-\uFFDC]/.test(ch)?fs:ch===' '?fs*.32:fs*.62;return w;}

/* ---------- 화면(카메라) ---------- */
function flCam(){const k=FL.view||'top';return FL.cams[k]||(FL.cams[k]={x:0,y:0,k:0});}
function flPos(e){const w=$('#flW'),r=w.getBoundingClientRect(),c=flCam();return {x:c.x+(e.clientX-r.left)/c.k,y:c.y+(e.clientY-r.top)/c.k};}
function flLod(){const p=34*FL.sz*(flCam().k||1);return p<9?0:p<24?1:2;}
function flCamApply(){const sv=$('#flSvg'),w=$('#flW');if(!sv||!w)return;const c=flCam();if(!(c.k>0))return;
  const vw=w.clientWidth/c.k,vh=w.clientHeight/c.k;sv.setAttribute('viewBox',`${c.x} ${c.y} ${vw} ${vh}`);
  const g=$('#flGrid');if(g){g.setAttribute('x',c.x);g.setAttribute('y',c.y);g.setAttribute('width',vw);g.setAttribute('height',vh);}
  const b=$('#view [data-fla="z1"]');if(b)b.textContent=Math.round(c.k*100)+'%';}
function flSvgRe(){const sv=$('#flSvg');if(!sv)return;sv.innerHTML=flDraw();flCamApply();}
let flQ=0;function flSvgQ(){if(flQ)return;flQ=requestAnimationFrame(()=>{flQ=0;flSvgRe();});}
function flZoom(nk,mx,my){const w=$('#flW'),c=flCam();if(!w)return;nk=Math.max(.02,Math.min(30,nk));
  if(mx==null){mx=w.clientWidth/2;my=w.clientHeight/2;}const wx=c.x+mx/c.k,wy=c.y+my/c.k;
  c.k=nk;c.x=wx-mx/nk;c.y=wy-my/nk;flSvgRe();flKeep();}
function flExt(){const f=flD(),M=new Map(f.items.map(i=>[i.id,i])),h=17*FL.sz*1.6;let x1=1e9,y1=1e9,x2=-1e9,y2=-1e9;
  const add=(p,r)=>{r=r||0;x1=Math.min(x1,p.x-r);y1=Math.min(y1,p.y-r);x2=Math.max(x2,p.x+r);y2=Math.max(y2,p.y+r);};
  f.items.forEach(i=>{if(!flVis(i)||(FL_HIDE[i.t]&&!FL.out&&!FL.edit))return;add(flP(i),h);});
  f.lines.forEach(l=>{if(flVis(M.get(l.a))&&flVis(M.get(l.b)))(l.pts||[]).forEach(p=>add(p));});
  if(!FL.view)f.blds.forEach(b=>(b.pts||[]).forEach(p=>add(p)));
  return x2<x1?null:{x1,y1,x2,y2};}
function flFitCam(){const w=$('#flW'),c=flCam();if(!w||!w.clientWidth)return;const e=flExt(),W=w.clientWidth,H=w.clientHeight;
  if(!e){c.k=1;c.x=-W/2;c.y=-H/2;return;}
  const ew=Math.max(e.x2-e.x1,60),eh=Math.max(e.y2-e.y1,60);c.k=Math.max(.02,Math.min(4,Math.min(W/ew,H/eh)*.92));
  c.x=(e.x1+e.x2)/2-W/2/c.k;c.y=(e.y1+e.y2)/2-H/2/c.k;}
function flFit(){flFitCam();flSvgRe();flKeep();}
function flCenterOn(i){const w=$('#flW'),c=flCam();if(!w||!i||!(c.k>0))return;const P=flP(i),W=w.clientWidth,H=w.clientHeight,sx=(P.x-c.x)*c.k,sy=(P.y-c.y)*c.k;
  if(sx<40||sy<40||sx>W-40||sy>H-40){c.x=P.x-W/2/c.k;c.y=P.y-H/2/c.k;}}
function flAfter(){const w=$('#flW');if(!w)return;
  w.style.height=Math.max(320,window.innerHeight-w.getBoundingClientRect().top-14)+'px';
  if(!(flCam().k>0))flFitCam();
  if(FL.goC){flCenterOn(flI(FL.goC));FL.goC='';}
  flSvgRe();
  if(FL.focN){FL.focN=false;const x=$('#view [data-fln]');if(x){x.focus();x.select();}}
  if(FL.focB){FL.focB=false;const x=$('#view [data-flbn]');if(x)x.focus();}}
window.addEventListener('resize',()=>{if(typeof UI!=='undefined'&&UI.tab==='flow')flAfter();});

/* ---------- 건물 ---------- */
function flIn(p,P){let r=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const a=P[i],b=P[j];
  if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)r=!r;}return r;}
const flSsIn=b=>flD().items.filter(i=>i.t==='ss'&&!i.g&&flIn(i,b.pts));
function flBCt(b){const f=flD(),c={},add=t=>{if(FL_CT[t])c[t]=(c[t]||0)+1;};
  f.items.forEach(i=>{if(i.g||!flIn(i,b.pts))return;add(i.t);if(i.t==='ss')f.items.forEach(x=>{if(x.g===i.id)add(x.t);});});
  return Object.keys(FL_CT).filter(k=>c[k]).map(k=>FL_CT[k]+' '+c[k]).join(' · ');}
function flBHandle(b,k,p){if(b.r&&b.pts.length===4){let x1=b.pts[0].x,y1=b.pts[0].y,x2=b.pts[2].x,y2=b.pts[2].y;
    if(k===0||k===3)x1=p.x;else x2=p.x;if(k===0||k===1)y1=p.y;else y2=p.y;
    b.pts=[{x:x1,y:y1},{x:x2,y:y1},{x:x2,y:y2},{x:x1,y:y2}];}else b.pts[k]=p;}
function flNewB(pts,r){const f=flD(),nm=UI.bld&&!f.blds.some(b=>b.name===UI.bld)?UI.bld:'';
  const b={id:uid(),name:nm,r:!!r,pts:pts.map(p=>({x:flR(p.x),y:flR(p.y)}))};f.blds.push(b);
  FL.selB=b.id;FL.sel='';FL.selL='';FL.tool='';FL.bd=null;FL.focB=!nm;save();flRe();}
function flPolyEnd(){const d=FL.bd;if(!d||d.pts.length<3){toast('꼭짓점을 3개 이상 찍어 주세요.',false);return;}flNewB(d.pts,false);}
function flOpenB(b){const L=flSsIn(b);
  if(!L.length){toast('이 건물 안에 변전실 아이콘이 없어요. [✎ 배치 편집]에서 건물 안에 변전실을 놓으면 더블클릭으로 안쪽 화면이 열려요.',false);return;}
  if(L.length===1){FL.view=L[0].id;FL.sel='';FL.selL='';FL.bpick='';return flRe();}
  FL.bpick=b.id;flRe();}

/* ---------- 흐름 계산 ---------- */
function flSimRun(O,ndir){const f=flD(),M=new Map(f.items.map(i=>[i.id,i])),on=new Set(),dir={};
  const SRC=O?{gen:1,cgen:1,ess:1,pv:1}:{in:1,ess:1,pv:1};
  const go=(l,x)=>{const a=M.get(x);if(!a)return false;const e=flIsEm(l,M);
    if(!O)return !e;if(e||FL_SRCT[a.t])return true;const d=ndir[l.id];return d?d===x:x===l.a;};
  f.items.forEach(i=>{if(SRC[i.t])on.add(i.id);});
  for(let ch=1,g=0;ch&&g<500;g++){ch=0;f.lines.forEach(l=>{[[l.a,l.b],[l.b,l.a]].forEach(([x,y])=>{
    if(on.has(x)&&!on.has(y)&&go(l,x)){const b=M.get(y);if(b&&!FL_SRCT[b.t]){on.add(y);dir[l.id]=x;ch=1;}}});});}
  f.lines.forEach(l=>{if(!dir[l.id]){if(on.has(l.a)&&go(l,l.a))dir[l.id]=l.a;else if(on.has(l.b)&&go(l,l.b))dir[l.id]=l.b;}});
  return {on,dir};}
function flSim(){const n=flSimRun(false,{}),r=FL.out?flSimRun(true,n.dir):n,st={};
  flD().lines.forEach(l=>{st[l.id]=r.dir[l.id]?'on':'off';});
  FL._dir=FL.out?Object.assign({},n.dir,r.dir):n.dir;
  return {on:r.on,st,dir:r.dir};}
function flPath(id){const f=flD(),d=FL._dir||{},L=new Set(),N=new Set([id]);
  const fr=l=>d[l.id]||l.a,to=l=>fr(l)===l.a?l.b:l.a;
  const walk=(x,up,seen)=>f.lines.forEach(l=>{if((up?to(l):fr(l))!==x||seen.has(l.id))return;seen.add(l.id);L.add(l.id);const y=up?fr(l):to(l);N.add(y);walk(y,up,seen);});
  walk(id,true,new Set());walk(id,false,new Set());return {L,N};}
function flState(i,sim){const on=sim.on.has(i.id),O=FL.out;
  if(i.t==='in')return O?['정전','r']:null;
  if(FL_HIDE[i.t])return O?['운전','r']:['평소 숨김','x'];
  if(i.t==='ess')return O?['방전','g']:['병렬','g'];
  if(i.t==='pv')return O?['계속 운전','g']:['운전','g'];
  return O&&on?['비상','r']:null;}

/* ---------- 그리기 (한 장의 SVG) ---------- */
function flBlds(k){if(FL.view)return '';let s='';
  flD().blds.forEach(b=>{if(!b.pts||b.pts.length<3)return;const sel=b.id===FL.selB,act=UI.bld&&UI.bld===b.name,ms=FL.msB.has(b.id),ct=flBCt(b);
    const fs=Math.min(Math.max(16,11/k),26/k);let cn=b.pts[0];b.pts.forEach(p=>{if(p.x+p.y<cn.x+cn.y)cn=p;});
    const tx=cn.x+fs*.45,ty=cn.y+fs*1.2;
    s+=`<g class="fl-b${act?' act':''}${sel?' sel':''}${ms?' msel':''}" data-b="${b.id}"><polygon class="bp" points="${flPts(b.pts)}" stroke-width="${((sel||act||ms?2.6:1.3)/k).toFixed(2)}"${sel?` stroke-dasharray="${f1(8/k)} ${f1(5/k)}"`:''}/>`+
      `<text x="${f1(tx)}" y="${f1(ty)}" font-size="${f1(fs)}">${esc(b.name||'(동 선택)')}</text>`+
      (ct?`<text class="bc" x="${f1(tx)}" y="${f1(ty+fs*1.05)}" font-size="${f1(fs*.72)}">${esc(ct)}</text>`:'')+'</g>';});
  return s;}
function flLines(sim,pa,k){const f=flD(),M=new Map(f.items.map(i=>[i.id,i])),mn=flMsN()>1,dr=(sim&&sim.dir)||{};let s='',ch=0;if(!f.auMig){f.lines.forEach(l=>{if(l.au==null)l.au=0;});f.auMig=1;ch=1;}f.lines.forEach(l=>{if(l.au==null){l.au=1;ch=1;}if(l.au===1&&l.pts&&l.pts.length){l.pts=[];ch=1;}if(!Array.isArray(l.pts))l.pts=[];flPM.set(l.pts,l);});if(ch)setTimeout(save);
  f.lines.forEach(l=>{const A=M.get(l.a),B=M.get(l.b);if(!flVis(A)||!flVis(B))return;
    const em=flIsEm(l,M);if(em&&!FL.out&&!FL.edit)return;
    const K=FL_K[l.k]||FL_K.lv,st=sim.st[l.id]||'off',P=flPts(flChain(l.a,l.pts,l.b)),sw=Math.max(K.w*FL.ls,1.3/k);
    const col=FL.out&&st==='off'?'#9ca3af':K.c,da=K.d?K.d.map(v=>f1(v*sw/3.5)).join(' '):'';
    const inP=!pa||pa.L.has(l.id),ms=mn&&FL.ms.has(l.a)&&FL.ms.has(l.b),sel=l.id===FL.selL;
    const cls='fl-l'+(FL.out&&st==='off'?' od':'')+(em&&!FL.out?' gh':'')+(pa?(inP?' hl':' dim'):'')+(ms?' msel':'');
    s+=`<g class="${cls}" data-l="${l.id}"><polyline class="hit" points="${P}" stroke-width="${f1(14/k)}"/>`+
      (sel||ms?`<polyline class="glow" points="${P}" stroke-width="${f1(sw+9/k)}"/>`:'')+
      `<polyline class="base" points="${P}" stroke="${col}" stroke-width="${sw.toFixed(2)}"${da?` stroke-dasharray="${da}"`:''}/>`+
      (st==='on'&&inP&&!(em&&!FL.out)?`<polyline class="fx" points="${P}" stroke-width="${(sw*.45).toFixed(2)}" stroke-dasharray="${f1(sw*1.3)} ${f1(sw*3.1)}"><animate attributeName="stroke-dashoffset" from="0" to="${dr[l.id]===l.b&&l.a!==l.b?'':'-'}${f1(sw*4.4)}" dur="1s" repeatCount="indefinite"/></polyline>`:'')+'</g>';});
  return s;}
function flItem0(i,sim,pa,k,lod){const T=FL_T[i.t]||FL_T.ss,on=sim.on.has(i.id),ent=!!FL.view&&i.id===FL.view,P=flP(i),sel=i.id===FL.sel,ms=FL.ms.has(i.id),cls=['fl-i'];
  if(FL_HIDE[i.t]&&!FL.out){if(!FL.edit)return '';cls.push('gh');}
  if(pa&&!pa.N.has(i.id))cls.push('dim');
  if(FL.out&&!on&&i.t!=='in')cls.push('off');
  const z=FL.sz,h=17*z,X=P.x,Y=P.y,nn=i.nid&&byId(i.nid),hl=sel||ms||ent,hc=ms?'#f59e0b':'#262f7d';
  const tt=flNm(i)+(i.sub?' · '+i.sub:'')+(nn?' · 🔗 '+label(nn):'')+(i.t==='ss'&&!ent?' · 더블클릭 = 안쪽 화면':'');
  let s=`<g class="${cls.join(' ')}" data-fi="${i.id}"><title>${esc(tt)}</title>`;
  if(i.t==='jn'||(lod===0&&!hl)){const r=i.t==='jn'?Math.max(7*z,3.5/k):3.2/k;
    s+=`<circle cx="${f1(X)}" cy="${f1(Y)}" r="${r.toFixed(2)}" fill="${hl?hc:FL_DOT[i.t]||'#334155'}" stroke="#fff" stroke-width="${(r*.28).toFixed(2)}"/>`;
    if(hl)s+=`<circle cx="${f1(X)}" cy="${f1(Y)}" r="${(r+3/k).toFixed(2)}" fill="none" stroke="${hc}" stroke-width="${(2/k).toFixed(2)}"/>`;
    return s+'</g>';}
  s+=`<rect class="icb" x="${f1(X-h)}" y="${f1(Y-h)}" width="${f1(2*h)}" height="${f1(2*h)}" rx="${f1(h*.45)}"/>`+
    T.s.replace('<svg ',`<svg x="${f1(X-h*.82)}" y="${f1(Y-h*.82)}" width="${f1(h*1.64)}" height="${f1(h*1.64)}" `);
  if(i.t==='in'&&FL.out)s+=`<text x="${f1(X)}" y="${f1(Y+h*.55)}" text-anchor="middle" font-size="${f1(h*1.7)}" font-weight="900" fill="#dc2626" stroke="#fff" stroke-width="${f1(h*.12)}" paint-order="stroke">✕</text>`;
  if(hl){const g=2/k;s+=`<rect x="${f1(X-h-g)}" y="${f1(Y-h-g)}" width="${f1(2*h+2*g)}" height="${f1(2*h+2*g)}" rx="${f1(h*.5)}" fill="none" stroke="${hc}" stroke-width="${((ent&&!sel&&!ms?2:3)/k).toFixed(2)}"/>`;}
  if(lod<2&&!hl)return s+'</g>';
  const b=flState(i,sim);
  if(b){const fs=9.5*z,w=flTw(b[0],fs)+9*z,bx=X+h-7*z,by=Y-h-9*z;
    s+=`<rect x="${f1(bx)}" y="${f1(by)}" width="${f1(w)}" height="${f1(fs*1.55)}" rx="${f1(fs*.75)}" fill="${{g:'#16a34a',r:'#dc2626',x:'#94a3b8'}[b[1]]||'#64748b'}"/><text x="${f1(bx+w/2)}" y="${f1(by+fs*1.15)}" text-anchor="middle" font-size="${f1(fs)}" font-weight="800" fill="#fff">${esc(b[0])}</text>`;}
  if(i.t==='ss'&&!ent&&!FL._inB.has(i.id)){const c={};flD().items.forEach(x=>{if(x.g===i.id&&FL_CT[x.t])c[x.t]=(c[x.t]||0)+1;});
    const ct=Object.keys(c).map(q=>FL_CT[q]+' '+c[q]).join(' · ');
    if(ct){const fs=10*z,w=flTw(ct,fs)+10*z,by=Y-h-fs*1.6-3*z;
      s+=`<rect x="${f1(X-w/2)}" y="${f1(by)}" width="${f1(w)}" height="${f1(fs*1.5)}" rx="${f1(fs*.75)}" fill="#eef2ff" stroke="#c7d2fe" stroke-width="${(1/k).toFixed(2)}"/><text x="${f1(X)}" y="${f1(by+fs*1.1)}" text-anchor="middle" font-size="${f1(fs)}" font-weight="700" fill="#262f7d">${esc(ct)}</text>`;}}
  if(nn)s+=`<text x="${f1(X-h-3*z)}" y="${f1(Y-h+3*z)}" font-size="${f1(10*z)}">🔗</text>`;
    if(FL.nm||hl){const nm=(ent?'⬇ ':'')+flNm(i)+(ent?' (들어오는 전원)':''),fs=11*z,f2=10*z,sub=i.sub||'',
      w=Math.max(flTw(nm,fs),sub?flTw(sub,f2):0)+12*z,hh=fs*1.5+(sub?f2*1.4:0),lt=!(sel||ms),
      d=i.t==='bus'?'d':(i.lbd||localStorage.getItem('ckd_fl_lbpos')||'d'),gp=h*.2;
    let lx=X-w/2,ty=Y+h+3*z;
    if(d==='r'){lx=X+h+gp;ty=Y-hh/2;}else if(d==='l'){lx=X-h-gp-w;ty=Y-hh/2;}else if(d==='u'){ty=Y-h-gp-hh;}
    const cx=lx+w/2,hal=q=>lt?` stroke="#fff" stroke-width="${f1(q*.3)}" stroke-linejoin="round" paint-order="stroke"`:'',sc=lt&&f2*k<14?' class="lbSub"':'';
    s+=`<rect x="${f1(lx)}" y="${f1(ty)}" width="${f1(w)}" height="${f1(hh)}" rx="${f1(4*z)}" fill="${sel?'#262f7d':ms?'#fef3c7':'#ffffff'}" fill-opacity="${lt?0:1}" stroke="${lt?'none':sel?'#262f7d':'#d97706'}" stroke-width="${(1/k).toFixed(2)}"${lt?' pointer-events="none"':''}/>`+
      `<text x="${f1(cx)}" y="${f1(ty+fs*1.13)}" text-anchor="middle" font-size="${f1(fs)}" font-weight="700" fill="${sel?'#fff':'#0f172a'}"${hal(fs)}>${esc(nm)}</text>`+
      (sub?`<text${sc} x="${f1(cx)}" y="${f1(ty+fs*1.5+f2)}" text-anchor="middle" font-size="${f1(f2)}" fill="${sel?'#dbe3ff':'#475569'}"${hal(f2)}>${esc(sub)}</text>`:'');}
  return s+'</g>';}
function flItem(i,sim,pa,k,lod){
  if(i&&i.t==='bus')return flBusItem(i,sim,pa,k,lod);
  const o=FL.sz;FL.sz=o*(i&&+i.zs>0?+i.zs:1);
  try{return flItem0(i,sim,pa,k,flLod());}finally{FL.sz=o;}}
function flBusItem(i,sim,pa,k,lod){
  const P=flP(i),L=flBusL(i),zs=i.zs||1,z=FL.sz*zs,th=Math.max(6*z,2.5/k);
  const sel=i.id===FL.sel,ms=FL.ms&&FL.ms.has(i.id),on=sim.on.has(i.id),vt=i.bo==='v';
  const cls=['fl-i','fl-bus'];if(pa&&!pa.N.has(i.id))cls.push('dim');if(FL.out&&!on)cls.push('off');
  const x=vt?P.x-th/2:P.x-L,y=vt?P.y-L:P.y-th/2,w=vt?th:2*L,h=vt?2*L:th,pd=6/k;
  const col=FL.out&&!on?'#9ca3af':'#1e293b',hc=ms?'#f59e0b':'#262f7d';
  let s='<g class="'+cls.join(' ')+'" data-fi="'+i.id+'"><title>'+esc(flNm(i))+'</title>';
  s+='<rect x="'+f1(x-pd)+'" y="'+f1(y-pd)+'" width="'+f1(w+2*pd)+'" height="'+f1(h+2*pd)+'" fill="transparent"/>';
  if(sel||ms)s+='<rect x="'+f1(x-3/k)+'" y="'+f1(y-3/k)+'" width="'+f1(w+6/k)+'" height="'+f1(h+6/k)+'" rx="'+f1(th*.4)+'" fill="none" stroke="'+hc+'" stroke-width="'+(2.5/k).toFixed(2)+'"/>';
  s+='<rect x="'+f1(x)+'" y="'+f1(y)+'" width="'+f1(w)+'" height="'+f1(h)+'" rx="'+f1(th*.3)+'" fill="'+col+'"/>';
  if((FL.nm&&lod>=2)||sel||ms){const fs=11*z,nm=flNm(i)+(i.sub?' · '+i.sub:'');
    const tx=vt?P.x+th:x,ty=vt?P.y-L+fs:y-4*z;
    s+='<text x="'+f1(tx)+'" y="'+f1(ty)+'" font-size="'+f1(fs)+'" font-weight="800" fill="'+(sel?'#262f7d':'#0f172a')+'" stroke="#fff" stroke-width="'+f1(fs*.25)+'" paint-order="stroke">'+esc(nm)+'</text>';}
  if(FL.edit&&sel){const r=6/k;
    const e1=vt?{x:P.x,y:P.y-L}:{x:P.x-L,y:P.y},e2=vt?{x:P.x,y:P.y+L}:{x:P.x+L,y:P.y},rt=vt?{x:P.x-th-14/k,y:P.y}:{x:P.x,y:P.y-th-14/k};
    [e1,e2].forEach(e=>{s+='<circle data-bush="'+i.id+'" cx="'+f1(e.x)+'" cy="'+f1(e.y)+'" r="'+f1(r)+'" fill="#fff" stroke="#262f7d" stroke-width="'+(2/k).toFixed(2)+'" style="cursor:'+(vt?'ns':'ew')+'-resize"/>';});
    s+='<g data-busr="'+i.id+'" style="cursor:pointer"><circle cx="'+f1(rt.x)+'" cy="'+f1(rt.y)+'" r="'+f1(r*1.4)+'" fill="#262f7d"/><text x="'+f1(rt.x)+'" y="'+f1(rt.y+r*.6)+'" text-anchor="middle" font-size="'+f1(r*1.9)+'" fill="#fff">⟲</text></g>';}
  return s+'</g>';}
function flOver(k){const f=flD(),r=(6/k).toFixed(2),sw=(2/k).toFixed(2),da=`${f1(6/k)} ${f1(4/k)}`;let s='';
  if(FL.edit&&!FL.view){const b=flB(FL.selB);if(b)b.pts.forEach((p,j)=>{s+=`<circle class="hd" data-bh="${j}" cx="${f1(p.x)}" cy="${f1(p.y)}" r="${r}" stroke-width="${sw}"/>`;});}
  if(FL.edit){const l=f.lines.find(x=>x.id===FL.selL);if(l)(l.pts||[]).forEach((p,j)=>{s+=`<circle class="hd" data-lp="${j}" cx="${f1(p.x)}" cy="${f1(p.y)}" r="${r}" stroke-width="${sw}"/>`;});}
  if(FL.bd){const d=FL.bd;
    if(d.m==='r')s+=`<rect class="bprev" x="${f1(Math.min(d.a.x,d.b.x))}" y="${f1(Math.min(d.a.y,d.b.y))}" width="${f1(Math.abs(d.b.x-d.a.x))}" height="${f1(Math.abs(d.b.y-d.a.y))}" stroke-width="${sw}" stroke-dasharray="${da}"/>`;
    else{const P=d.pts.concat(d.cur?[d.cur]:[]),q=d.pts[0];
      s+=`<polygon class="bprev" points="${flPts(P)}" stroke-width="${sw}" stroke-dasharray="${da}"/><circle cx="${f1(q.x)}" cy="${f1(q.y)}" r="${(7/k).toFixed(2)}" fill="#fff" stroke="#262f7d" stroke-width="${sw}" pointer-events="none"/>`;}}
  if(FL.draw){const K=FL_K[FL.lk];s+=`<polyline id="flPrev" class="prev" points="${flPts(flChain(FL.draw.a,FL.draw.pts))}" stroke="${K.c}" stroke-width="${Math.max(K.w*FL.ls,1.5/k).toFixed(2)}" stroke-dasharray="${f1(6/k)} ${f1(5/k)}" opacity=".8"/>`;}
  if(FL.box){const a=FL.box.a,b=FL.box.b,win=b.x>=a.x;
    s+=`<rect id="flBox" x="${f1(Math.min(a.x,b.x))}" y="${f1(Math.min(a.y,b.y))}" width="${f1(Math.abs(b.x-a.x))}" height="${f1(Math.abs(b.y-a.y))}" fill="${win?'rgba(37,99,235,.08)':'rgba(22,163,74,.08)'}" stroke="${win?'#2563eb':'#16a34a'}" stroke-width="${(1.5/k).toFixed(2)}"${win?'':` stroke-dasharray="${f1(5/k)} ${f1(3/k)}"`}/>`;}
  return s;}
function flDraw(){const f=flD(),k=flCam().k||1,lod=flLod(),sim=flSim(),pa=FL.sel?flPath(FL.sel):null;
  let g=40;while(g*k<14)g*=5;
  FL._inB=new Set();if(!FL.view)f.items.forEach(i=>{if(i.t==='ss'&&!i.g&&f.blds.some(b=>flIn(i,b.pts)))FL._inB.add(i.id);});
  return `<defs><pattern id="flGp" width="${g}" height="${g}" patternUnits="userSpaceOnUse"><path d="M${g} 0H0V${g}" fill="none" stroke="#dfe4ee" stroke-width="${(1/k).toFixed(3)}"/></pattern>`+
    `<filter id="flSh" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="${(1/k).toFixed(2)}" stdDeviation="${(1.6/k).toFixed(2)}" flood-color="#0f172a" flood-opacity=".35"/></filter></defs>`+
    `<rect id="flGrid" fill="url(#flGp)"/>`+flBlds(k)+flLines(sim,pa,k)+f.items.filter(flVis).map(i=>flItem(i,sim,pa,k,lod)).join('')+flOver(k);}
/* ===== 1부 끝 ===== */
/* ---------- 화면 구성 ---------- */
function flView(){const f=flD();
  if(FL.view&&!flI(FL.view))FL.view='';
  if(UI.sel!==FL.lastSel){FL.lastSel=UI.sel;const m=f.items.find(i=>i.nid&&i.nid===UI.sel);if(m){FL.sel=m.id;FL.view=m.g||'';FL.selB='';flMsClear();FL.goC=m.id;}}
  if(FL.sel&&!flVis(flI(FL.sel)))FL.sel='';
  if(FL.selL&&!f.lines.some(l=>l.id===FL.selL))FL.selL='';
  if(FL.view||(FL.selB&&!flB(FL.selB)))FL.selB='';
  if(FL.view||(FL.bpick&&!flB(FL.bpick)))FL.bpick='';
  if(FL.msV!==FL.view||!FL.edit){flMsClear();FL.msV=FL.view;}
  const sim=flSim(),it=flI(FL.sel),ln=f.lines.find(l=>l.id===FL.selL),V=FL.view?flI(FL.view):null,BS=flB(FL.selB),c=flCam(),n=flMsN();
  let lg=Object.values(FL_K).map(q=>`<span>${flSw(q.c,q.d)}${q.l}</span>`).join('');if(FL.out)lg+=`<span>${flSw('#9ca3af')}정전</span>`;
  let crumb='';if(V){const ch=[];for(let x=V,g=0;x&&g<20;x=x.g?flI(x.g):null,g++)ch.unshift(flNm(x));
    crumb=`<button data-fla="up">◀ ${V.g?'위로':'공장 전체'}</button><span class="flCr">› ${esc(ch.join(' › '))}</span>`;}
  let h=`<div class="ph" style="max-width:none"><div class="flBar"><b class="flTt">전기 Flow</b>${crumb}<button data-fla="out" class="out${FL.out?' on':''}">${FL.out?'⚡ 정전 모드 끄기':'⚡ 정전 모드'}</button><span class="sp"></span><span class="flLg">${lg}</span>`+
    `<label title="아이콘 크기 (도면 대비)">아이콘<input type="range" data-flsz min="0.15" max="3" step="0.05" value="${FL.sz}"></label><label title="선 굵기">선<input type="range" data-flls min="0.2" max="3" step="0.1" value="${FL.ls}"></label><label><input type="checkbox" data-flnm${FL.nm?' checked':''}>명칭</label>`+
    `<span class="seg"><button data-fla="zo">－</button><button data-fla="z1" title="눌러서 배율 입력">${c.k>0?Math.round(c.k*100):100}%</button><button data-fla="zi">＋</button></span><button data-fla="fit" title="그린 것 전체가 화면에 들어오게">⤢ 화면 맞춤</button><button data-fla="edit"${FL.edit?' class="on"':''}>✎ 배치 편집</button></div>`;
  if(FL.out){const A=f.items,cnt=t=>A.filter(i=>i.t===t).length,body=A.filter(i=>!FL_SRCT[i.t]&&i.t!=='jn'),live=body.filter(i=>sim.on.has(i.id)),seen=new Set(),
      lk=live.filter(i=>i.nid&&byId(i.nid)&&!seen.has(i.nid)&&seen.add(i.nid)),dk=body.filter(i=>!sim.on.has(i.id)&&i.nid&&byId(i.nid)).length;
    h+=`<div class="flOut">⚡ <b>정전 모드</b>: 한전 수전이 끊긴 상황이에요. 비상발전기 ${cnt('gen')}대 · CTTS 발전기 ${cnt('cgen')}대 운전 · ESS ${cnt('ess')}대 방전 · 태양광 ${cnt('pv')}대 계속 운전<br>· 전기가 가는 길: <b>빨간 점선(비상)</b> + 발전기·ESS·태양광에서 바로 나가는 선<br>· 비상으로 살아있는 곳 <b>${live.length}</b>개 · 정전된 곳 ${body.length-live.length}개 (흐리게)`+
      (lk.length?`<br>✅ <b>살아있는 계통</b> (누르면 트리로 이동): `+lk.map(i=>{const nd=byId(i.nid),ct=flLoadsUnder(nd.id);return `<span class="go" data-flgo="${nd.id}">${esc(label(nd))}${ct?` · 부하 <b>${ct}</b>`:''}</span>`;}).join('')+(dk?` <span style="color:#64748b">· 🔗 연결된 것 중 정전 ${dk}곳</span>`:'')
      :`<br><span style="color:#64748b">아이콘을 트리 항목과 🔗 연결해 두면 여기서 살아있는 분전반·부하 수가 보여요.</span>`)+`</div>`;}
  if(FL.edit){
    h+=`<div class="flEd"><span class="gp"><i>아이콘</i>${FL_ICONS.map(q=>`<button data-flt="${q}"${FL.tool===q?' class="on"':''}>${FL_T[q].s}${FL_T[q].l}</button>`).join('')}<button data-flt="jn"${FL.tool==='jn'?' class="on"':''}>● 분기점</button></span>`+
      (V?'':`<span class="gp"><i>건물</i><button data-flt="brect"${FL.tool==='brect'?' class="on"':''}>▭ 사각형</button><button data-flt="bpoly"${FL.tool==='bpoly'?' class="on"':''}>⬠ 다각형</button></span>`)+
      `<span class="gp"><i>선 그리기</i><button data-fla="orth" title="켜면 선이 가로·세로로만 꺾여요"${FL.orth?' class="on"':''}>⊾ 직각</button>${Object.entries(FL_K).map(([q,v])=>`<button data-flk="${q}"${FL.tool==='line'&&FL.lk===q?' class="on"':''}>${flSw(v.c,v.d,'lsw')}${v.l}</button>`).join('')}</span></div>`;
    if(n>1){h+=`<div class="flEd"><span class="gp"><i>선택</i><b>${n}개</b>&nbsp;(아이콘 ${FL.ms.size} · 건물 ${FL.msB.size})</span><span>끌면 같이 이동 · 방향키 = 조금씩 (Shift = 크게) · Shift+클릭 = 추가/빼기</span><button data-fla="msclr">선택 해제</button><button data-fla="msdel" class="dng">🗑 선택 삭제</button></div>`;
      if(FL.ms.size>1){const B=(a,t,ti)=>`<button data-fla="al:${a}" title="${ti}">${t}</button>`;
        h+=`<div class="flEd"><span class="gp"><i>가로 정렬</i>${B('l','⇤','왼쪽 끝에 맞춤')}${B('c','↔','가운데에 맞춤')}${B('r','⇥','오른쪽 끝에 맞춤')}</span><span class="gp"><i>세로 정렬</i>${B('t','⤒','위쪽 끝에 맞춤')}${B('m','↕','가운데에 맞춤')}${B('b','⤓','아래쪽 끝에 맞춤')}</span><span class="gp"><i>간격 같게</i>${B('ex','가로','양 끝은 그대로, 사이를 같은 간격으로')}${B('ey','세로','양 끝은 그대로, 사이를 같은 간격으로')}</span><span class="gp"><i>간격</i>가로 ${B('x-','－','좁히기')}${B('x+','＋','넓히기')} 세로 ${B('y-','－','좁히기')}${B('y+','＋','넓히기')}</span></div>`;}}
    else if(BS){const BL=S.blds||BLDS,opts=!BS.name||BL.includes(BS.name)?BL:BL.concat([BS.name]);
      h+=`<div class="flEd"><span class="gp"><i>건물</i><select data-flbn><option value="">(동 선택)</option>${opts.map(x=>`<option${x===BS.name?' selected':''}>${esc(x)}</option>`).join('')}</select></span><span>모서리 ○를 끌면 모양 조절 · 한 번 더 누른 뒤 끌면 이동</span><button data-fla="delB" class="dng">🗑 건물 삭제</button></div>`;}
    else if(it&&V&&it.id===V.id){h+=`<div class="flEd"><span class="gp"><i>들어오는 전원</i>${esc(flNm(it))}</span><span>끌어서 위치를 옮기고, 여기서부터 선을 그어 안쪽 설비로 이어 주세요.</span></div>`;}
    else if(it){const nn=it.nid&&byId(it.nid),cur=byId(UI.sel),nl=it.t==='jn',ss=f.items.filter(x=>x.t==='ss'&&x.id!==it.id&&!flUnder(x,it.id));
      h+=`<div class="flEd"><span class="gp"><i>${esc((FL_T[it.t]||{}).l||'')}</i><input data-fln value="${esc(it.name||'')}" placeholder="이름 (예: 메인 TR)">${nl?'':`<input data-flm value="${esc(it.sub||'')}" placeholder="메모 (예: 22.9/3.3kV 5000kVA)">`}</span>`+
        (nl?'':`<span class="gp">${nn?`<span class="lkn">🔗 ${esc(label(nn))}</span><button data-fla="unlink">연결 해제</button>`:''}<button data-fla="link"${cur?'':' disabled'}>🔗 ${cur?'"'+esc(label(cur))+'"와 연결':'트리에서 항목을 먼저 고르세요'}</button></span>`)+
        `<span class="gp"><i>위치</i><select data-flmv><option value="">공장 전체</option>${ss.map(x=>`<option value="${x.id}"${it.g===x.id?' selected':''}>${esc(flNm(x))} 안쪽</option>`).join('')}</select></span>`+
        (it.t==='ss'?`<button data-fla="open">▶ 안쪽 화면 열기</button>`:'')+`<button data-fla="del" class="dng">🗑 아이콘 삭제</button></div>`;}
    else if(ln){h+=`<div class="flEd"><span class="gp"><i>선</i>${esc(flNm(flI(ln.a)))} → ${esc(flNm(flI(ln.b)))}</span><span class="gp">${Object.entries(FL_K).map(([q,v])=>`<button data-flsk="${q}"${ln.k===q?' class="on"':''}>${v.l}</button>`).join('')}</span><button data-fla="rev">⇄ 방향 바꾸기</button><button data-fla="delL" class="dng">🗑 선 삭제</button></div>`;}
    let t;
    if(FL.tool==='line'){const K=FL_K[FL.lk];t=FL.draw?`<b>${K.l}</b> 선 그리는 중 · 꺾을 곳을 클릭하고 <b>끝 아이콘</b>을 클릭하면 완성${FL.orth?' (직각)':''} · Esc 취소`:`<b>${K.l}</b> 선 · <b>전기를 보내는 쪽 아이콘</b>부터 클릭하세요 · Esc 종료`;}
    else if(FL.tool==='brect')t='건물 자리를 <b>대각선으로 끌어서</b> 사각형을 그려요 · Esc 종료';
    else if(FL.tool==='bpoly')t=FL.bd?'계속 꼭짓점을 클릭 · <b>처음 점(○)을 다시 누르거나 Enter</b> = 완성 · Esc 취소':'L자·ㄷ자 건물: <b>꼭짓점을 차례로 클릭</b>하세요 · Esc 종료';
    else if(FL.tool)t=`도면을 클릭할 때마다 <b>${FL_T[FL.tool].l}</b>을(를) 놓아요 · Esc 종료`;
    else t='<b>빈 곳 드래그</b>: 왼→오 = 다 들어간 것만 · 오→왼 = 걸친 것까지 · <b>스페이스·휠 버튼 누르고 끌기 = 화면 이동</b> · 휠 = 확대·축소 · Ctrl+A = 전체 선택<br><b>아이콘 더블클릭 = 이름·메모</b> · 선 고른 뒤 더블클릭 = 꺾은 점 추가 · ○ 더블클릭 = 꺾은 점 삭제 · Delete = 삭제';
    h+=`<div class="flHint">${t}</div>`;}
  else if(FL.bpick){const pb=flB(FL.bpick);h+=`<div class="flHint">${esc(pb.name||'건물')} · 어느 전기실을 열까요?${flSsIn(pb).map(i=>`<button data-flop="${i.id}">${esc(flNm(i))}</button>`).join('')}</div>`;}
  else if(V&&!f.items.some(i=>i.g===V.id))h+=`<div class="flHint">안쪽 화면이 비어 있어요. [✎ 배치 편집]에서 변압기·MCC반을 놓고 <b>⬇ 들어오는 전원</b>에서 선을 이어 주세요.</div>`;
  else if(f.items.length||f.blds.length)h+=`<div class="flHint soft">휠 = 확대·축소 · 빈 곳 끌기 = 화면 이동 · 건물 클릭 = 동 필터 · <b>건물·변전실 더블클릭 = 안쪽 화면</b> · 아이콘 클릭 = 받는 길·보내는 길 강조 · 멀리서는 점, 가까이서는 이름표까지 보여요</div>`;
  const empty=!V&&!f.items.some(flVis)&&!f.blds.length;
  h+=`<div id="flW" class="${[FL.edit?'ed':'pan',FL.edit&&FL.tool?'put':''].join(' ')}"><svg id="flSvg" xmlns="http://www.w3.org/2000/svg"></svg>`+
    (empty?`<div id="flNo">아직 그려진 게 없어요.<br>[✎ 배치 편집] → <b>[▭ 사각형]</b>으로 동 건물부터 그려 보세요.<br>그다음 한전 인입·변전실·TR 아이콘을 놓고 선을 이으면 돼요.</div>`:'')+`</div>`;
  Promise.resolve().then(flAfter);
  return h+'</div>';}

/* ---------- 버튼 동작 ---------- */
function flAct(a){const f=flD(),i=flI(FL.sel),l=f.lines.find(x=>x.id===FL.selL),V=FL.view?flI(FL.view):null,B=flB(FL.selB),c=flCam();
  if(a==='zi')return flZoom(c.k*1.25);
  if(a==='zo')return flZoom(c.k*.8);
  if(a==='z1'){const v=prompt('배율을 숫자로 입력하세요 (2 ~ 3000, 단위 %)\n비우면 100%',Math.round(c.k*100));if(v===null)return;const n=parseFloat(v);return flZoom(isFinite(n)&&n>0?n/100:1);}
  if(a==='fit')return flFit();
  if(a==='orth'){FL.orth=!FL.orth;flKeep();toast(FL.orth?'⊾ 직각 모드 켜짐: 선이 가로·세로로만 꺾여요.':'직각 모드 꺼짐',false);return flRe();}
  if(a==='msclr'){flMsClear();return flRe();}
  if(a==='msdel')return flMsDel();
  if(a.slice(0,3)==='al:')return flAlign(a.slice(3));
  if(a==='out'){FL.out=!FL.out;return flRe();}
  if(a==='edit'){FL.edit=!FL.edit;FL.tool='';FL.draw=null;FL.bd=null;FL.selL='';FL.selB='';FL.bpick='';flMsClear();return flRe();}
  if(a==='up'){FL.sel=V?V.id:'';FL.view=(V&&V.g)||'';FL.selL='';FL.tool='';FL.draw=null;return flRe();}
  if(a==='open'&&i&&i.t==='ss'){FL.view=i.id;FL.sel='';FL.selL='';FL.tool='';FL.draw=null;return flRe();}
  if(a==='delB'&&B){if(!confirm(`"${B.name||'건물'}" 건물을 지울까요?\n(안에 있는 아이콘과 선은 그대로 남아요)`))return;f.blds=f.blds.filter(x=>x!==B);FL.selB='';save();return flRe();}
  if(a==='del'&&i){const ids=new Set([i.id]);f.items.forEach(x=>{if(flUnder(x,i.id))ids.add(x.id);});const n=f.lines.filter(x=>ids.has(x.a)||ids.has(x.b)).length;
    if((n||ids.size>1)&&!confirm(`"${flNm(i)}" 아이콘을 지울까요?`+(ids.size>1?`\n안쪽 화면 아이콘 ${ids.size-1}개도 같이 지워져요.`:'')+(n?`\n연결된 선 ${n}개도 같이 지워져요.`:'')))return;
    f.items=f.items.filter(x=>!ids.has(x.id));f.lines=f.lines.filter(x=>!ids.has(x.a)&&!ids.has(x.b));FL.sel='';save();return flRe();}
  if(a==='delL'&&l){f.lines=f.lines.filter(x=>x!==l);FL.selL='';save();return flRe();}
  if(a==='rev'&&l){const t=l.a;l.a=l.b;l.b=t;(l.pts||[]).reverse();save();return flRe();}
  if(a==='link'&&i){const nd=byId(UI.sel);if(!nd)return alert('트리에서 연결할 항목을 먼저 고르세요.');
    i.nid=nd.id;if(!i.name)i.name=nd.name||label(nd);FL.lastSel=UI.sel;save();toast(`🔗 "${flNm(i)}" ↔ "${label(nd)}" 연결했어요.`,false);return flRe();}
  if(a==='unlink'&&i){delete i.nid;save();return flRe();}}

/* ---------- 여러 개 선택 · 정렬 ---------- */
function flMsClear(){FL.ms.clear();FL.msB.clear();}
function flMsN(){return FL.ms.size+FL.msB.size;}
function flMsFromSingle(){if(FL.sel)FL.ms.add(FL.sel);if(FL.selB)FL.msB.add(FL.selB);FL.sel='';FL.selB='';FL.selL='';}
function flMsNorm(){if(flMsN()!==1)return;if(FL.ms.size)FL.sel=[...FL.ms][0];else FL.selB=[...FL.msB][0];flMsClear();}
function flMsGroup(){const f=flD(),it=[],b=[],l=[];
  FL.ms.forEach(id=>{const i=flI(id);if(i&&flVis(i)){const P=flP(i);it.push({i,x:P.x,y:P.y});}});
  FL.msB.forEach(id=>{const X=flB(id);if(X)b.push({X,o:X.pts.map(q=>({x:q.x,y:q.y}))});});
  f.lines.forEach(L=>{if(FL.ms.has(L.a)&&FL.ms.has(L.b)&&L.pts&&L.pts.length)l.push({L,o:L.pts.map(q=>({x:q.x,y:q.y}))});});
  return {it,b,l};}
function flMsApply(G,dx,dy){G.it.forEach(o=>flSetP(o.i,o.x+dx,o.y+dy));
  G.b.forEach(o=>{o.X.pts=o.o.map(q=>({x:flR(q.x+dx),y:flR(q.y+dy)}));});
  G.l.forEach(o=>{o.L.pts=o.o.map(q=>({x:flR(q.x+dx),y:flR(q.y+dy)}));});}
function flSegX(a,b,c,d){const o=(p,q,r)=>Math.sign((q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x));return o(a,b,c)!==o(a,b,d)&&o(c,d,a)!==o(c,d,b);}
function flMsBox(a,b,add){const f=flD(),win=b.x>=a.x,x1=Math.min(a.x,b.x),x2=Math.max(a.x,b.x),y1=Math.min(a.y,b.y),y2=Math.max(a.y,b.y),
    h=17*FL.sz,inB=p=>p.x>=x1&&p.x<=x2&&p.y>=y1&&p.y<=y2;
  if(add)flMsFromSingle();else flMsClear();FL.sel='';FL.selB='';FL.selL='';
  f.items.filter(flVis).forEach(i=>{const P=flP(i),e=h*(i.t==='jn'?.4:1);
    const ok=win?(P.x-e>=x1&&P.x+e<=x2&&P.y-e>=y1&&P.y+e<=y2):(P.x+e>=x1&&P.x-e<=x2&&P.y+e>=y1&&P.y-e<=y2);if(ok)FL.ms.add(i.id);});
  if(!FL.view){const C=[{x:x1,y:y1},{x:x2,y:y1},{x:x2,y:y2},{x:x1,y:y2}];
    f.blds.forEach(B=>{const P=B.pts||[];if(P.length<3)return;
      const ok=win?P.every(inB):(P.some(inB)||C.some(c=>flIn(c,P))||P.some((p,j)=>{const q=P[(j+1)%P.length];return C.some((c,k)=>flSegX(p,q,c,C[(k+1)%4]));}));
      if(ok)FL.msB.add(B.id);});}
  flMsNorm();}
function flMsAll(){const f=flD();flMsClear();FL.sel='';FL.selB='';FL.selL='';
  f.items.filter(flVis).forEach(i=>FL.ms.add(i.id));if(!FL.view)f.blds.forEach(b=>FL.msB.add(b.id));flMsNorm();flRe();}
function flMsDel(){const f=flD(),base=[...FL.ms].filter(id=>id!==FL.view),ids=new Set(base);
  base.forEach(id=>f.items.forEach(x=>{if(flUnder(x,id))ids.add(x.id);}));
  const ni=base.length,nb=FL.msB.size,inner=ids.size-ni,nl=f.lines.filter(l=>ids.has(l.a)||ids.has(l.b)).length;if(!ni&&!nb)return;
  if(!confirm(`선택한 것을 지울까요?\n아이콘 ${ni}개 · 건물 ${nb}개`+(inner?`\n안쪽 화면 아이콘 ${inner}개도 같이 지워져요.`:'')+(nl?`\n연결된 선 ${nl}개도 같이 지워져요.`:'')))return;
  f.items=f.items.filter(x=>!ids.has(x.id));f.lines=f.lines.filter(x=>!ids.has(x.a)&&!ids.has(x.b));f.blds=f.blds.filter(b=>!FL.msB.has(b.id));
  flMsClear();FL.sel='';FL.selL='';FL.selB='';save();flRe();}
function flMsNudge(key,big){const d=(big?20:2)/(flCam().k||1),dx=key==='ArrowLeft'?-d:key==='ArrowRight'?d:0,dy=key==='ArrowUp'?-d:key==='ArrowDown'?d:0;
  const single=!flMsN();if(single)flMsFromSingle();flMsApply(flMsGroup(),dx,dy);if(single)flMsNorm();save();flSvgRe();}
function flAlign(a){const L=[...FL.ms].map(flI).filter(i=>i&&flVis(i));if(L.length<2)return toast('아이콘을 2개 이상 골라 주세요.',false);
  const P=L.map(i=>({i,...flP(i)})),xs=P.map(o=>o.x),ys=P.map(o=>o.y),x1=Math.min(...xs),x2=Math.max(...xs),y1=Math.min(...ys),y2=Math.max(...ys);
  if(a==='l')P.forEach(o=>o.x=x1);else if(a==='c')P.forEach(o=>o.x=(x1+x2)/2);else if(a==='r')P.forEach(o=>o.x=x2);
  else if(a==='t')P.forEach(o=>o.y=y1);else if(a==='m')P.forEach(o=>o.y=(y1+y2)/2);else if(a==='b')P.forEach(o=>o.y=y2);
  else if(a==='ex'||a==='ey'){if(P.length<3)return toast('간격을 같게 하려면 3개 이상 골라 주세요.',false);
    const k=a==='ex'?'x':'y',S=P.slice().sort((p,q)=>p[k]-q[k]),a0=S[0][k],st=(S[S.length-1][k]-a0)/(S.length-1);S.forEach((o,j)=>o[k]=a0+st*j);}
  else if(/^[xy][+-]$/.test(a)){const k=a[0],m=a[1]==='+'?1.15:1/1.15,c=k==='x'?(x1+x2)/2:(y1+y2)/2;P.forEach(o=>o[k]=c+(o[k]-c)*m);}
  const old=new Map(L.map(i=>{const q=flP(i);return [i.id,{x:q.x,y:q.y}];}));
  P.forEach(o=>flSetP(o.i,o.x,o.y));
  flD().lines.forEach(l=>{if(!l.pts||!l.pts.length)return;[['a',0],['b',l.pts.length-1]].forEach(([e,k])=>{const O=old.get(l[e]);if(!O)return;
    const N=flP(flI(l[e])),p=l.pts[k];if(Math.abs(p.x-O.x)<.5)p.x=N.x;if(Math.abs(p.y-O.y)<.5)p.y=N.y;});});
  save();flRe();}

/* ---------- 직각 도우미 ---------- */
function flLast(){const P=FL.draw.pts;return P.length?P[P.length-1]:flP(flI(FL.draw.a));}
const flSnap=(a,q)=>Math.abs(q.x-a.x)>=Math.abs(q.y-a.y)?{x:flR(q.x),y:a.y}:{x:a.x,y:flR(q.y)};
function flOrthEnd(pts,S,E){const P=pts.length?pts[pts.length-1]:S;if(Math.abs(P.x-E.x)<.5||Math.abs(P.y-E.y)<.5)return;
  const Q=pts.length>=2?pts[pts.length-2]:pts.length===1?S:null;
  pts.push(!Q?(Math.abs(E.x-P.x)>=Math.abs(E.y-P.y)?{x:E.x,y:P.y}:{x:P.x,y:E.y}):(Math.abs(Q.y-P.y)<.05?{x:P.x,y:E.y}:{x:E.x,y:P.y}));}
function flNearSeg(P,p){let best=0,bd=1e18;for(let j=0;j<P.length-1;j++){const a=P[j],b=P[j+1],dx=b.x-a.x,dy=b.y-a.y,L=dx*dx+dy*dy||1,
  t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/L)),d=(a.x+t*dx-p.x)**2+(a.y+t*dy-p.y)**2;if(d<bd){bd=d;best=j;}}return best;}

/* ---------- 보기 모드 클릭 ---------- */
function flViewClick(D){
  if(D.el){const i=flI(D.el);if(!i)return;
    if(flDbl(i.id)){if(i.t==='ss'&&FL.view!==i.id){FL.view=i.id;FL.sel='';FL.selL='';return flRe();}return;}
    if(FL.sel===i.id){FL.sel='';return flRe();}
    FL.sel=i.id;if(i.nid&&byId(i.nid)&&UI.sel!==i.nid){select(i.nid,true);return;}return flRe();}
  const B=flB(D.b);
  if(B){if(flDbl('B'+B.id))return flOpenB(B);FL.bpick='';if(B.name&&typeof setBld==='function')setBld(UI.bld===B.name?'':B.name);else flRe();return;}
  if(FL.sel||FL.bpick){FL.sel='';FL.bpick='';flRe();}}

/* ---------- 이벤트 ---------- */
let FD=null;
const flOn=()=>typeof UI!=='undefined'&&UI.tab==='flow';
document.addEventListener('click',e=>{const t=e.target;if(!t.closest||!flOn()||!t.closest('#view')||t.closest('#flW'))return;const f=flD();let b;
  if(b=t.closest('[data-flop]')){FL.view=b.dataset.flop;FL.bpick='';FL.sel='';FL.selL='';return flRe();}
  if(b=t.closest('[data-fla]')){if(!b.disabled)flAct(b.dataset.fla);return;}
  if(b=t.closest('[data-flgo]')){select(b.dataset.flgo,true);return;}
  if(b=t.closest('[data-flt]')){const k=b.dataset.flt;FL.tool=FL.tool===k?'':k;FL.draw=null;FL.bd=null;FL.selB='';flMsClear();return flRe();}
  if(b=t.closest('[data-flk]')){const k=b.dataset.flk;if(FL.tool==='line'&&FL.lk===k)FL.tool='';else{FL.tool='line';FL.lk=k;}FL.draw=null;FL.bd=null;FL.sel='';FL.selB='';flMsClear();return flRe();}
  if(b=t.closest('[data-flsk]')){const l=f.lines.find(x=>x.id===FL.selL);if(l){l.k=b.dataset.flsk;save();}return flRe();}});
document.addEventListener('pointerdown',e=>{if(!flOn())return;const W=e.target.closest&&e.target.closest('#flW');if(!W||e.target.closest('#flImp'))return;
  const c=flCam(),p=flPos(e),t=e.target,el=t.closest('.fl-i'),iid=el?el.dataset.fi:'',f=flD(),bg=t.closest('[data-b]');
  if(e.button===1||(e.button===0&&FL.spc)){e.preventDefault();FD={m:'pan',x:e.clientX,y:e.clientY,cx:c.x,cy:c.y};W.classList.add('panning');return;}
  if(e.button!==0)return;e.preventDefault();
  if(!FL.edit){FD={m:'vp',x:e.clientX,y:e.clientY,cx:c.x,cy:c.y,el:iid,b:bg?bg.dataset.b:''};return;}
  if(FL.tool==='brect'){FL.bd={m:'r',a:p,b:p};FD={m:'brect'};return flSvgRe();}
  if(FL.tool==='bpoly'){const P={x:flR(p.x),y:flR(p.y)};if(!FL.bd){FL.bd={m:'p',pts:[P],cur:P};return flRe();}
    const q=FL.bd.pts[0];if(FL.bd.pts.length>=3&&Math.hypot(p.x-q.x,p.y-q.y)*c.k<12)return flPolyEnd();FL.bd.pts.push(P);return flSvgRe();}
  if(FL.tool==='line'){
    if(!FL.draw){if(!iid)return toast('선을 시작할 아이콘을 먼저 클릭하세요.',false);FL.draw={a:iid,pts:[]};FL.sel='';FL.selL='';FL.selB='';return flRe();}
    if(iid&&iid!==FL.draw.a){const pts=FL.draw.pts;if(FL.orth)flOrthEnd(pts,flP(flI(FL.draw.a)),flP(flI(iid)));
      const l={id:uid(),k:FL.lk,a:FL.draw.a,b:iid,pts};f.lines.push(l);FL.draw=null;FL.selL=l.id;save();return flRe();}
    if(!iid){let q={x:flR(p.x),y:flR(p.y)};if(FL.orth)q=flSnap(flLast(),q);FL.draw.pts.push(q);flSvgRe();}return;}
  if(FL.tool&&FL_T[FL.tool]){const i={id:uid(),t:FL.tool,x:flR(p.x),y:flR(p.y),name:''};if(FL.view)i.g=FL.view;
    f.items.push(i);FL.sel=i.id;FL.selL='';FL.selB='';save();return flRe();}
  const hd=t.closest('.hd');
  if(hd){if(hd.dataset.bh!=null){const b=flB(FL.selB);if(b)FD={m:'bh',b,k:+hd.dataset.bh};return;}
    const l=f.lines.find(x=>x.id===FL.selL);if(!l)return;const k=+hd.dataset.lp;
    if(flDbl('H'+l.id+k)){l.pts.splice(k,1);save();return flSvgRe();}FD={m:'pt',l,k};return;}
  if(el){const i=flI(iid);if(!i)return;
    if(e.shiftKey){flMsFromSingle();FL.ms.has(i.id)?FL.ms.delete(i.id):FL.ms.add(i.id);flMsNorm();return flRe();}
    if(FL.ms.has(i.id)&&flMsN()>1){FD={m:'grp',G:flMsGroup(),p0:p};return;}
    if(flMsN())flMsClear();FD={m:'it',i,p0:p,o:flP(i)};return;}
  const lg=t.closest('[data-l]');
  if(lg){const l=f.lines.find(x=>x.id===lg.dataset.l);if(!l)return;
    if(FL.selL===l.id&&flDbl('L'+l.id)){if(!l.pts)l.pts=[];l.pts.splice(flNearSeg(flChain(l.a,l.pts,l.b),p),0,{x:flR(p.x),y:flR(p.y)});save();return flSvgRe();}
    flDbl('L'+l.id);FL.selL=l.id;FL.sel='';FL.selB='';flMsClear();return flRe();}
  const b=bg&&flB(bg.dataset.b);
  if(b){if(e.shiftKey){flMsFromSingle();FL.msB.has(b.id)?FL.msB.delete(b.id):FL.msB.add(b.id);flMsNorm();return flRe();}
    if(FL.msB.has(b.id)&&flMsN()>1){FD={m:'grp',G:flMsGroup(),p0:p};return;}
    if(FL.selB===b.id){FD={m:'bmv',b,p0:p,o:b.pts.map(q=>({x:q.x,y:q.y}))};return;}}
  FD={m:'box',a:p,x:e.clientX,y:e.clientY,add:e.shiftKey,cb:b?b.id:''};});
document.addEventListener('pointermove',e=>{if(!flOn()||!$('#flW'))return;
  if(!FD){if(FL.draw){const pv=$('#flPrev');if(pv){let q=flPos(e);if(FL.orth)q=flSnap(flLast(),q);pv.setAttribute('points',flPts(flChain(FL.draw.a,FL.draw.pts).concat([q])));}}
    else if(FL.bd&&FL.bd.m==='p'){FL.bd.cur=flPos(e);flSvgQ();}return;}
  const c=flCam();
  if(FD.m==='vp'){if(Math.abs(e.clientX-FD.x)+Math.abs(e.clientY-FD.y)<=4)return;FD.m='pan';$('#flW').classList.add('panning');}
  if(FD.m==='pan'){c.x=FD.cx-(e.clientX-FD.x)/c.k;c.y=FD.cy-(e.clientY-FD.y)/c.k;flCamApply();return;}
  const p=flPos(e);
  if(FD.m==='box'){if(!FD.mv&&Math.abs(e.clientX-FD.x)+Math.abs(e.clientY-FD.y)<4)return;FD.mv=true;FL.box={a:FD.a,b:p};return flSvgQ();}
  if(FD.m==='brect'){FL.bd.b=p;return flSvgQ();}
  if(FD.m==='bh'){FD.mv=true;flBHandle(FD.b,FD.k,{x:flR(p.x),y:flR(p.y)});return flSvgQ();}
  if(FD.m==='pt'){const l=FD.l,k=FD.k,q={x:flR(p.x),y:flR(p.y)};
    if(FL.orth){const ch=flChain(l.a,l.pts,l.b),th=10/c.k;[ch[k],ch[k+2]].forEach(s=>{if(!s)return;if(Math.abs(s.x-q.x)<th)q.x=s.x;if(Math.abs(s.y-q.y)<th)q.y=s.y;});}
    l.pts[k]=q;FD.mv=true;return flSvgQ();}
  const dx=p.x-FD.p0.x,dy=p.y-FD.p0.y;if(!FD.mv&&Math.hypot(dx,dy)*c.k<3)return;FD.mv=true;
  if(FD.m==='it')flSetP(FD.i,FD.o.x+dx,FD.o.y+dy);
  else if(FD.m==='grp')flMsApply(FD.G,dx,dy);
  else if(FD.m==='bmv')FD.b.pts=FD.o.map(q=>({x:flR(q.x+dx),y:flR(q.y+dy)}));
  flSvgQ();});
document.addEventListener('pointerup',e=>{if(!FD)return;const D=FD;FD=null;const W=$('#flW');if(W)W.classList.remove('panning');
  if(D.m==='pan'){flKeep();return;}
  if(D.m==='vp')return flViewClick(D);
  if(D.m==='box'){FL.box=null;
    if(D.mv&&W)flMsBox(D.a,flPos(e),D.add);
    else if(D.cb){FL.selB=D.cb;FL.sel='';FL.selL='';flMsClear();}
    else{FL.sel='';FL.selL='';FL.selB='';if(!D.add)flMsClear();}return flRe();}
  if(D.m==='brect'){const d=FL.bd;FL.bd=null;
    if(d&&Math.abs(d.a.x-d.b.x)*flCam().k>8&&Math.abs(d.a.y-d.b.y)*flCam().k>8){const x1=Math.min(d.a.x,d.b.x),x2=Math.max(d.a.x,d.b.x),y1=Math.min(d.a.y,d.b.y),y2=Math.max(d.a.y,d.b.y);
      return flNewB([{x:x1,y:y1},{x:x2,y:y1},{x:x2,y:y2},{x:x1,y:y2}],true);}return flRe();}
  if(D.m==='it'&&!D.mv){const i=D.i;FL.selB='';FL.selL='';if(flDbl(i.id)&&i.t!=='jn'&&FL.view!==i.id)FL.focN=true;FL.sel=i.id;return flRe();}
  if(D.mv)save();flRe();});
document.addEventListener('wheel',e=>{if(!flOn())return;const w=e.target.closest&&e.target.closest('#flW');if(!w)return;e.preventDefault();
  const r=w.getBoundingClientRect();flZoom((flCam().k||1)*Math.pow(1.0015,-e.deltaY),e.clientX-r.left,e.clientY-r.top);},{passive:false});
document.addEventListener('input',e=>{const t=e.target;if(!t.dataset||!flOn())return;
  if(t.dataset.flsz!=null){FL.sz=+t.value||1;flKeep();return flSvgQ();}
  if(t.dataset.flls!=null){FL.ls=+t.value||1;flKeep();return flSvgQ();}
  const isN=t.dataset.fln!=null,isM=t.dataset.flm!=null;if(!isN&&!isM)return;const i=flI(FL.sel);if(!i)return;
  if(isN)i.name=t.value;else{const v=t.value.trim();if(v)i.sub=v;else delete i.sub;}save();flSvgQ();});
document.addEventListener('change',e=>{const t=e.target;if(!t.dataset||!flOn())return;
  if(t.dataset.flnm!=null){FL.nm=t.checked;flKeep();return flSvgRe();}
  if(t.dataset.flbn!=null){const b=flB(FL.selB);if(b){b.name=t.value;save();flRe();}return;}
  if(t.dataset.flmv!=null){const i=flI(FL.sel);if(!i)return;const v=t.value;if(v)i.g=v;else delete i.g;FL.sel='';save();
    toast(v?`"${flNm(i)}"을(를) "${flNm(flI(v))}" 안쪽으로 옮겼어요. 안쪽 화면에서 위치를 잡아 주세요.`:`"${flNm(i)}"을(를) 공장 전체 화면으로 꺼냈어요.`,false);flRe();}});
document.addEventListener('keydown',e=>{if(!flOn())return;const t=e.target;
  if(t.dataset&&(t.dataset.fln!=null||t.dataset.flm!=null)&&e.key==='Enter'){t.blur();return;}
  if(/INPUT|TEXTAREA|SELECT/.test((document.activeElement||{}).tagName||''))return;
  if(e.code==='Space'&&FL.edit){e.preventDefault();if(!FL.spc){FL.spc=true;const w=$('#flW');if(w)w.classList.add('pan');}return;}
  if(e.key==='Enter'&&FL.bd&&FL.bd.m==='p'){e.preventDefault();return flPolyEnd();}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='a'&&FL.edit){e.preventDefault();return flMsAll();}
  if(/^Arrow/.test(e.key)&&FL.edit&&(flMsN()||FL.sel||FL.selB)){e.preventDefault();return flMsNudge(e.key,e.shiftKey);}
  if(e.key==='Escape'){if(FL.bd)FL.bd=null;else if(FL.draw)FL.draw=null;else if(FL.tool)FL.tool='';else if(FL.bpick)FL.bpick='';
    else if(flMsN()||FL.sel||FL.selL||FL.selB){flMsClear();FL.sel='';FL.selL='';FL.selB='';}else if(FL.view)FL.view=(flI(FL.view)||{}).g||'';flRe();}
  else if(e.key==='Delete'&&FL.edit){e.preventDefault();if(flMsN()>1)flMsDel();else if(FL.selB)flAct('delB');else if(FL.selL)flAct('delL');else if(FL.sel&&FL.sel!==FL.view)flAct('del');}});
document.addEventListener('keyup',e=>{if(e.code==='Space'&&FL.spc){FL.spc=false;const w=$('#flW');if(w&&FL.edit)w.classList.remove('pan');}});
/* ===== flow.js v4 끝 ===== */
/* ===== 복사·붙여넣기 + 트리 연동 시작 ===== */
let FL_CLIP=null,FL_MPT=null;
document.addEventListener('pointermove',e=>{FL_MPT={x:e.clientX,y:e.clientY};},true);
function flMouseW(){const w=$('#flW');if(!w||!FL_MPT)return null;const r=w.getBoundingClientRect();
  if(FL_MPT.x<r.left||FL_MPT.x>r.right||FL_MPT.y<r.top||FL_MPT.y>r.bottom)return null;
  return flPos({clientX:FL_MPT.x,clientY:FL_MPT.y});}
const flClone=o=>JSON.parse(JSON.stringify(o));

/* ---------- 복사 ---------- */
function flCopy(){const f=flD(),top=new Set(),bs=new Set();
  if(flMsN()){FL.ms.forEach(id=>top.add(id));FL.msB.forEach(id=>bs.add(id));}
  else{if(FL.sel)top.add(FL.sel);if(FL.selB)bs.add(FL.selB);}
  if(FL.view)top.delete(FL.view);
  [...top].forEach(id=>{const i=flI(id);if(!i||!flVis(i))top.delete(id);});
  if(FL.view)bs.clear();
  if(!top.size&&!bs.size){toast('복사할 아이콘을 먼저 고르세요.',false);return;}
  const all=new Set(top);
  f.items.forEach(x=>{for(const id of top){if(flUnder(x,id)){all.add(x.id);break;}}});
  let lk=0;
  const items=f.items.filter(i=>all.has(i.id)).map(i=>{if(i.nid)lk++;const c=flClone(i);delete c.nid;delete c.um;delete c.tsy;if(i.nid)delete c.sub;c._top=top.has(i.id);return c;});
  const lines=f.lines.filter(l=>all.has(l.a)&&all.has(l.b)).map(l=>{const c=flClone(l);c._mv=top.has(l.a)&&top.has(l.b);return c;});
  const blds=f.blds.filter(b=>bs.has(b.id)).map(flClone);
  const P=[];items.forEach(i=>{if(i._top)P.push({x:i.x,y:i.y});});blds.forEach(b=>(b.pts||[]).forEach(p=>P.push(p)));
  const xs=P.map(p=>p.x),ys=P.map(p=>p.y);
  FL_CLIP={items,lines,blds,cx:(Math.min(...xs)+Math.max(...xs))/2,cy:(Math.min(...ys)+Math.max(...ys))/2,n:0};
  const inner=all.size-top.size;
  toast(`📋 복사: 아이콘 ${top.size}개`+(bs.size?` · 건물 ${bs.size}개`:'')+(inner?` (안쪽 아이콘 ${inner}개 포함)`:'')+(lines.length?` · 선 ${lines.length}개`:'')+
    (lk?` · 🔗 트리 연결은 빼고 복사해요`:'')+' → Ctrl+V로 붙여넣기',false);}

/* ---------- 붙여넣기 ---------- */
function flPaste(){const C=FL_CLIP;if(!C){toast('먼저 Ctrl+C로 복사하세요.',false);return;}
  const f=flD(),k=flCam().k||1,m=flMouseW();let tx,ty;
  if(m){tx=m.x;ty=m.y;}else{C.n++;tx=C.cx+30*C.n/k;ty=C.cy+30*C.n/k;}
  const dx=tx-C.cx,dy=ty-C.cy,M=new Map(),nT=[],nB=[];let skipB=0;
  C.items.forEach(o=>M.set(o.id,uid()));
  C.items.forEach(o=>{const i=flClone(o),top=i._top;delete i._top;i.id=M.get(o.id);
    if(top){i.x=flR(i.x+dx);i.y=flR(i.y+dy);if(FL.view)i.g=FL.view;else delete i.g;nT.push(i.id);}
    else if(M.has(o.g))i.g=M.get(o.g);
    f.items.push(i);});
  C.lines.forEach(o=>{const l=flClone(o),mv=l._mv;delete l._mv;l.id=uid();l.a=M.get(o.a);l.b=M.get(o.b);
    if(mv&&l.pts)l.pts=l.pts.map(p=>({x:flR(p.x+dx),y:flR(p.y+dy)}));f.lines.push(l);});
  C.blds.forEach(o=>{if(FL.view){skipB++;return;}const b=flClone(o);b.id=uid();b.pts=(b.pts||[]).map(p=>({x:flR(p.x+dx),y:flR(p.y+dy)}));f.blds.push(b);nB.push(b.id);});
  FL.sel='';FL.selL='';FL.selB='';flMsClear();nT.forEach(id=>FL.ms.add(id));nB.forEach(id=>FL.msB.add(id));flMsNorm();
  save();flRe();
  toast(`📌 붙여넣기: 아이콘 ${nT.length}개`+(nB.length?` · 건물 ${nB.length}개`:'')+' · 그대로 끌어서 옮기세요'+(skipB?` (건물 ${skipB}개는 안쪽 화면이라 뺐어요)`:''),false);}

/* ---------- 트리 연동 (트리가 원본) ---------- */
function flTreeSub(n){const a=[];
  if(n.type==='TR'){const v1=n.v1||inV(n)||'',v2=n.v2||'';if(v1||v2)a.push((v1||'?')+'/'+(v2||'?'));if(n.kva)a.push(n.kva+'kVA');}
  else{if(n.type==='CB'&&n.cbk)a.push(n.cbk);const v=effV(n);if(v)a.push(v);const s=spec(n);if(s)a.push(s);if(n.kva)a.push(n.kva+'kVA');}
  if(effSrc(n)==='E')a.push('비상');
  return a.join(' ');}
function flSync(){const f=flD();let ch=false;
  f.items.forEach(i=>{if(!i.nid)return;const n=byId(i.nid);if(!n)return;
    if(!i.tsy){const old=String(i.sub||'').trim();if(old)i.um=old;i.tsy=1;ch=true;}
    const nm=label(n),ts=flTreeSub(n),um=String(i.um||'').trim(),sub=[ts,um].filter(Boolean).join(' · ');
    if(i.name!==nm){i.name=nm;ch=true;}
    if(sub){if(i.sub!==sub){i.sub=sub;ch=true;}}else if(i.sub!=null){delete i.sub;ch=true;}});
  if(ch)save();}

const _flDraw0=flDraw;
flDraw=function(){flSync();return _flDraw0.apply(this,arguments);};

const _flView0=flView;
flView=function(){flSync();let h=_flView0.apply(this,arguments);
  const i=FL.edit?flI(FL.sel):null,n=i&&i.nid&&byId(i.nid);
  if(n&&!(FL.view&&i.id===FL.view)){
    h=h.replace(/<input data-fln [^>]*>/,`<input data-fln value="${esc(i.name||'')}" disabled title="트리에서 고치면 여기도 자동으로 바뀌어요" style="background:#f1f5f9;color:#64748b;cursor:not-allowed">`)
       .replace(/<input data-flm [^>]*>/,`<input data-flum value="${esc(i.um||'')}" placeholder="추가 메모 (트리 정보 뒤에 붙어요)"><span style="color:#262f7d;font-size:11.5px;font-weight:700" title="이름·전압·용량·비상은 계통 트리에서 고치세요">🔒 트리 연동 중 · ${esc(flTreeSub(n)||'트리에 적힌 정보 없음')}</span>`);
    if(FL.focN){FL.focN=false;setTimeout(()=>{const x=$('#view [data-flum]');if(x)x.focus();},0);}}
  h=h.replace('Ctrl+A = 전체 선택','Ctrl+A = 전체 선택 · <b>Ctrl+C / Ctrl+V = 복사·붙여넣기</b>');
  return h;};

const _flAct0=flAct;
flAct=function(a){const i=flI(FL.sel);
  if(a==='unlink'&&i){delete i.um;delete i.tsy;}
  return _flAct0.apply(this,arguments);};

document.addEventListener('input',e=>{const t=e.target;if(!t.dataset||t.dataset.flum==null||!flOn())return;
  const i=flI(FL.sel);if(!i)return;const v=t.value.trim();if(v)i.um=v;else delete i.um;flSync();save();flSvgQ();});

/* ---------- 단축키 ---------- */
document.addEventListener('keydown',e=>{if(!flOn())return;const t=e.target;
  if(t.dataset&&t.dataset.flum!=null&&e.key==='Enter'){t.blur();return;}
  if(!FL.edit||!(e.ctrlKey||e.metaKey)||e.altKey)return;
  if(/INPUT|TEXTAREA|SELECT/.test((document.activeElement||{}).tagName||''))return;
  if(e.code==='KeyC'){e.preventDefault();flCopy();}
  else if(e.code==='KeyV'){e.preventDefault();flPaste();}});
/* ===== 복사·붙여넣기 + 트리 연동 끝 ===== */
/* ===== 정렬 개선 · 겹침 방지 · 되돌리기 시작 ===== */
/* ---------- 되돌리기 (최근 20번) ---------- */
let FL_US=[],FL_UL=null,FL_UR=null,FL_UT=0;
function flUBase(){FL_UR=S.flow;FL_UL=S&&S.flow?JSON.stringify(S.flow):null;}
const _flSave0=save;
save=function(){
  try{if(S&&S.flow){
    if(FL_UR!==S.flow||FL_UL==null){if(FL_UR&&FL_UR!==S.flow)FL_US=[];flUBase();}
    else{const c=JSON.stringify(S.flow);
      if(c!==FL_UL){const n=Date.now();if(!FL_US.length||n-FL_UT>700){FL_US.push(FL_UL);if(FL_US.length>20)FL_US.shift();}FL_UT=n;FL_UL=c;}}}}catch(e){}
  return _flSave0.apply(this,arguments);};
function flUndo(){if(!FL_US.length)return toast('되돌릴 작업이 없어요.',false);
  const p=FL_US.pop();S.flow=JSON.parse(p);FL_UR=S.flow;FL_UL=p;FL_UT=0;
  FL.sel='';FL.selL='';FL.selB='';FL.draw=null;FL.bd=null;FL.box=null;flMsClear();
  if(FL.view&&!flI(FL.view))FL.view='';
  _flSave0();flRe();toast('↶ 되돌렸어요'+(FL_US.length?` (앞으로 ${FL_US.length}번 더 가능)`:''),false);}

/* ---------- 아이콘 크기 계산 (이름표 포함) ---------- */
function flWid(i){const z=FL.sz,h=17*z;if(i.t==='jn')return 16*z;
  return Math.max(2*h,FL.nm?Math.max(flTw(flNm(i),11*z),i.sub?flTw(i.sub,10*z):0)+12*z:0);}
function flHei(i){const z=FL.sz,h=17*z;if(i.t==='jn')return 16*z;
  return 2*h+3*z+(FL.nm?11*z*1.5+(i.sub?10*z*1.4:0):0);}
const flNX=(p,q)=>(flWid(p.i)+flWid(q.i))/2+6*FL.sz;
const flNY=(p,q)=>flHei((p.y<=q.y?p:q).i)+6*FL.sz;
function flOvN(){const L=[...FL.ms].map(flI).filter(i=>i&&flVis(i)),h=17*FL.sz;let n=0;
  for(let a=0;a<L.length;a++){const A=flP(L[a]);for(let b=a+1;b<L.length;b++){const B=flP(L[b]);if(Math.abs(A.x-B.x)<h&&Math.abs(A.y-B.y)<h){n++;break;}}}return n;}

/* ---------- 정렬 (새 방식) ---------- */
flAlign=function(a){
  const L=[...FL.ms].map(flI).filter(i=>i&&flVis(i));
  if(L.length<2)return toast('아이콘을 2개 이상 골라 주세요.',false);
  const old=new Map(L.map(i=>{const q=flP(i);return [i.id,{x:q.x,y:q.y}];}));
  const P=L.map((i,j)=>{const q=old.get(i.id);return {i,j,x:q.x,y:q.y,ox:q.x,oy:q.y};});
  const xs=P.map(o=>o.x),ys=P.map(o=>o.y),x1=Math.min(...xs),y1=Math.min(...ys),x2=Math.max(...xs),y2=Math.max(...ys);
  const srt=k=>P.slice().sort((p,q)=>k==='x'?(p.ox-q.ox||p.oy-q.oy||p.j-q.j):(p.oy-q.oy||p.ox-q.ox||p.j-q.j));
  const need=(k,p,q)=>k==='x'?flNX(p,q):flNY(p,q);
  let msg='';
  if(a==='row'||a==='col'){const k=a==='row'?'x':'y',o2=a==='row'?'y':'x',S2=srt(k),v=P.reduce((s,o)=>s+o[o2],0)/P.length;
    P.forEach(o=>o[o2]=v);
    for(let s=1;s<S2.length;s++)S2[s][k]=Math.max(S2[s][k],S2[s-1][k]+need(k,S2[s-1],S2[s]));
    msg=a==='row'?'━ 가로 한 줄로 맞췄어요 (겹치는 건 자동으로 벌렸어요)':'┃ 세로 한 줄로 맞췄어요 (겹치는 건 자동으로 벌렸어요)';}
  else if(a==='ex'||a==='ey'){if(P.length<3)return toast('간격을 같게 하려면 3개 이상 골라 주세요.',false);
    const k=a==='ex'?'x':'y',S2=srt(k),n=S2.length,a0=S2[0][k];let st=(S2[n-1][k]-a0)/(n-1);
    for(let s=1;s<n;s++)st=Math.max(st,need(k,S2[s-1],S2[s]));
    S2.forEach((o,j)=>o[k]=a0+st*j);}
  else if(/^[xy][+-]$/.test(a)){const k=a[0],m=a[1]==='+'?1.15:1/1.15,c=k==='x'?(x1+x2)/2:(y1+y2)/2;
    P.forEach(o=>o[k]=c+(o[k]-c)*m);
    if(a[1]==='-'){const ov=(p,q,u)=>Math.abs(p[u+'x']-q[u+'x'])<flNX(p,q)*.9&&Math.abs(p[u+'y']-q[u+'y'])<Math.max(flHei(p.i),flHei(q.i))*.9;
      for(let s=0;s<P.length;s++)for(let t=s+1;t<P.length;t++){const p=P[s],q=P[t];
        const was=ov({x:p.ox,y:p.oy,i:p.i},{x:q.ox,y:q.oy,i:q.i},''),now=ov(p,q,'');
        if(now&&!was)return toast('더 좁히면 아이콘이 겹쳐요.',false);}}}
  else if(a==='spread'){const S2=srt('x'),n=S2.length,cols=Math.min(n,10),z=FL.sz;
    const cw=Math.max(...L.map(flWid))+6*z,rh=Math.max(...L.map(flHei))+6*z;
    S2.forEach((o,j)=>{o.x=x1+(j%cols)*cw;o.y=y1+Math.floor(j/cols)*rh;});
    msg=`⇔ ${n}개를 펼쳤어요 (한 줄 ${cols}개) · 그대로 끌어서 옮기거나 [가로 한 줄로]로 정리하세요`;}
  else return;
  P.forEach(o=>flSetP(o.i,o.x,o.y));
  flD().lines.forEach(l=>{if(!l.pts||!l.pts.length)return;[['a',0],['b',l.pts.length-1]].forEach(([e,k])=>{const O=old.get(l[e]);if(!O)return;
    const N=flP(flI(l[e])),p=l.pts[k];if(Math.abs(p.x-O.x)<.5)p.x=N.x;if(Math.abs(p.y-O.y)<.5)p.y=N.y;});});
  save();flRe();if(msg)toast(msg+' · 잘못되면 Ctrl+Z',false);};

/* ---------- 화면: 정렬 줄 교체 + 되돌리기 버튼 ---------- */
const _flView1=flView;
flView=function(){flD();if(FL_UR!==S.flow||FL_UL==null){if(FL_UR&&FL_UR!==S.flow)FL_US=[];flUBase();}
  let h=_flView1.apply(this,arguments);
  if(FL.edit){
    h=h.replace('<div class="flEd">',`<div class="flEd"><span class="gp"><button data-fla="undo" title="Ctrl+Z"${FL_US.length?'':' disabled'}>↶ 되돌리기${FL_US.length?' ('+FL_US.length+')':''}</button></span>`);
    const B=(a,t,ti)=>`<button data-fla="al:${a}" title="${ti}">${t}</button>`,ov=FL.ms.size>1?flOvN():0;
    h=h.replace(/<div class="flEd"><span class="gp"><i>가로 정렬<\/i>[\s\S]*?<\/div>/,
      `<div class="flEd"><span class="gp"><i>줄 맞추기</i>${B('row','━ 가로 한 줄로','높이를 맞춰 가로 한 줄로 · 좌우 순서는 그대로 · 겹치면 자동으로 벌려요')}${B('col','┃ 세로 한 줄로','좌우를 맞춰 세로 한 줄로 · 위아래 순서는 그대로 · 겹치면 자동으로 벌려요')}</span>`+
      `<span class="gp"><i>간격 같게</i>${B('ex','가로','양 끝 기준으로 같은 간격 (겹치지 않게)')}${B('ey','세로','양 끝 기준으로 같은 간격 (겹치지 않게)')}</span>`+
      `<span class="gp"><i>간격</i>가로 ${B('x-','－','좁히기 (겹치기 전까지만)')}${B('x+','＋','넓히기')} 세로 ${B('y-','－','좁히기 (겹치기 전까지만)')}${B('y+','＋','넓히기')}</span>`+
      `<span class="gp">${B('spread','⇔ 겹친 것 펼치기','고른 아이콘을 격자로 쫙 펼쳐요 (한 줄 10개)')}${ov?` <b style="color:#dc2626">겹침 ${ov}개</b>`:''}</span></div>`);
    h=h.replace('Ctrl+A = 전체 선택','Ctrl+A = 전체 선택 · <b>Ctrl+Z = 되돌리기</b>');}
  return h;};

const _flAct1=flAct;
flAct=function(a){if(a==='undo')return flUndo();return _flAct1.apply(this,arguments);};

document.addEventListener('keydown',e=>{if(!flOn()||!FL.edit)return;
  if(/INPUT|TEXTAREA|SELECT/.test((document.activeElement||{}).tagName||''))return;
  if((e.ctrlKey||e.metaKey)&&!e.shiftKey&&e.code==='KeyZ'){e.preventDefault();flUndo();}});
/* ===== 정렬 개선 · 겹침 방지 · 되돌리기 끝 ===== */
/* ===== 아이콘별 크기 (버튼 + 모서리 끌기) 시작 ===== */
(function(){const s=document.createElement('style');s.textContent=`
#view .fl-rz{fill:#fff;stroke:#262f7d}
#view #flW.ed .fl-rz{cursor:nwse-resize!important}
#view #flW.rzing,#view #flW.rzing *{cursor:nwse-resize!important}
#view .flEd .zsv{display:inline-block;min-width:44px;text-align:center;font-weight:700;color:#262f7d}`;document.head.appendChild(s);})();
const FL_ZMIN=.3,FL_ZMAX=4;
const flZs=i=>i&&+i.zs>0?+i.zs:1;
function flWithZ(i,fn){const o=FL.sz;FL.sz=o*flZs(i);try{return fn();}finally{FL.sz=o;}}

/* ---------- 그리기 · 크기 계산을 아이콘별로 ---------- */
const _flWidZ=flWid,_flHeiZ=flHei;
flWid=function(i){return flWithZ(i,()=>_flWidZ(i));};
flHei=function(i){return flWithZ(i,()=>_flHeiZ(i));};

/* ---------- 범위 선택도 아이콘별 크기로 ---------- */
flMsBox=function(a,b,add){const f=flD(),win=b.x>=a.x,x1=Math.min(a.x,b.x),x2=Math.max(a.x,b.x),y1=Math.min(a.y,b.y),y2=Math.max(a.y,b.y),
    inB=p=>p.x>=x1&&p.x<=x2&&p.y>=y1&&p.y<=y2;
  if(add)flMsFromSingle();else flMsClear();FL.sel='';FL.selB='';FL.selL='';
  f.items.filter(flVis).forEach(i=>{const P=flP(i),e=17*FL.sz*flZs(i)*(i.t==='jn'?.4:1);
    const ok=win?(P.x-e>=x1&&P.x+e<=x2&&P.y-e>=y1&&P.y+e<=y2):(P.x+e>=x1&&P.x-e<=x2&&P.y+e>=y1&&P.y-e<=y2);if(ok)FL.ms.add(i.id);});
  if(!FL.view){const C=[{x:x1,y:y1},{x:x2,y:y1},{x:x2,y:y2},{x:x1,y:y2}];
    f.blds.forEach(B=>{const P=B.pts||[];if(P.length<3)return;
      const ok=win?P.every(inB):(P.some(inB)||C.some(c=>flIn(c,P))||P.some((p,j)=>{const q=P[(j+1)%P.length];return C.some((c,k)=>flSegX(p,q,c,C[(k+1)%4]));}));
      if(ok)FL.msB.add(B.id);});}
  flMsNorm();};

/* ---------- 크기 버튼 ---------- */
function flZT(){return (flMsN()?[...FL.ms]:[FL.sel]).map(flI).filter(i=>i&&flVis(i));}
function flZSet(L,fn){L.forEach(i=>{const v=Math.round(Math.max(FL_ZMIN,Math.min(FL_ZMAX,fn(flZs(i))))*100)/100;if(Math.abs(v-1)<.001)delete i.zs;else i.zs=v;});save();flRe();}
function flZBar(L){const v=L.map(flZs),same=v.every(x=>Math.abs(x-v[0])<.001),t=same?Math.round(v[0]*100)+'%':'섞임';
  return `<span class="gp"><i>크기</i><button data-fla="zs:-" title="작게">－</button><span class="zsv">${t}</span><button data-fla="zs:+" title="크게">＋</button>`+
    `<button data-fla="zs:0.7">작게</button><button data-fla="zs:1" title="크기 원래대로">보통</button><button data-fla="zs:1.5">크게</button><button data-fla="zs:2">2배</button></span>`;}
const _flViewZ=flView;
flView=function(){let h=_flViewZ.apply(this,arguments);if(!FL.edit)return h;
  h=h.replace('Ctrl+A = 전체 선택','Ctrl+A = 전체 선택 · <b>아이콘 오른쪽 아래 □ 끌기 = 크기</b>');
  const L=flZT();if(!L.length)return h;const bar=flZBar(L);
  if(flMsN()>1)h=h.replace('<button data-fla="msclr">',bar+'<button data-fla="msclr">');
  else h=h.replace('<button data-fla="del" class="dng">',bar+'<button data-fla="del" class="dng">');
  return h;};
const _flActZ=flAct;
flAct=function(a){if(a.slice(0,3)==='zs:'){const L=flZT();if(!L.length)return;const q=a.slice(3);
    if(q==='+')return flZSet(L,v=>v*1.15);if(q==='-')return flZSet(L,v=>v/1.15);const n=+q;return flZSet(L,()=>n);}
  return _flActZ.apply(this,arguments);};

/* ---------- 모서리 □ 끌기 ---------- */
const _flOverZ=flOver;
flOver=function(k){let s=_flOverZ(k);if(!FL.edit||flMsN()||FL.draw||FL.tool)return s;
  const i=flI(FL.sel);if(!i||!flVis(i))return s;
  const P=flP(i),z=FL.sz*flZs(i),h=i.t==='jn'?7*z:17*z,r=5/k,c=h+2/k;
  return s+`<rect class="fl-rz" data-rz="${i.id}" x="${(P.x+c-r).toFixed(2)}" y="${(P.y+c-r).toFixed(2)}" width="${(2*r).toFixed(2)}" height="${(2*r).toFixed(2)}" rx="${(1.5/k).toFixed(2)}" stroke-width="${(1.5/k).toFixed(2)}"/>`;};
let FL_RZ=null;
document.addEventListener('pointerdown',e=>{if(!flOn()||!FL.edit||e.button!==0)return;
  const t=e.target.closest&&e.target.closest('[data-rz]');if(!t)return;const i=flI(t.dataset.rz);if(!i)return;
  e.preventDefault();e.stopImmediatePropagation();
  const P=flP(i),p=flPos(e),d0=Math.max(Math.abs(p.x-P.x),Math.abs(p.y-P.y),1e-6);
  FL_RZ={i,P,d0,z0:flZs(i)};const w=$('#flW');if(w)w.classList.add('rzing');},true);
document.addEventListener('pointermove',e=>{if(!FL_RZ)return;e.stopImmediatePropagation();
  const R=FL_RZ,p=flPos(e),d=Math.max(Math.abs(p.x-R.P.x),Math.abs(p.y-R.P.y));
  const v=Math.round(Math.max(FL_ZMIN,Math.min(FL_ZMAX,R.z0*d/R.d0))*20)/20;
  if(Math.abs(v-1)<.001)delete R.i.zs;else R.i.zs=v;R.mv=true;flSvgQ();
  const zv=$('#view .flEd .zsv');if(zv)zv.textContent=Math.round(v*100)+'%';},true);
document.addEventListener('pointerup',e=>{if(!FL_RZ)return;e.stopImmediatePropagation();
  const R=FL_RZ;FL_RZ=null;const w=$('#flW');if(w)w.classList.remove('rzing');
  if(R.mv){save();flRe();toast(`크기 ${Math.round(flZs(R.i)*100)}% · 잘못되면 Ctrl+Z`,false);}},true);
/* ===== 아이콘별 크기 (버튼 + 모서리 끌기) 끝 ===== */
/* ===== VCB · 비상부하 아이콘 시작 ===== */
(function(){
  FL_T.vcb={l:'VCB',s:'<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" fill="#27272a" stroke="#000" stroke-width="1.5"/><rect x="3.8" y="3.8" width="16.4" height="2.6" fill="#dc2626"/><rect x="7" y="8" width="10" height="4" rx="1" fill="#52525b"/><rect x="10.5" y="8.7" width="3" height="2.6" rx=".5" fill="#e4e4e7"/><text x="12" y="18.5" text-anchor="middle" font-size="6.5" font-weight="bold" fill="#fff">VCB</text></svg>'};
  FL_T.eld={l:'비상부하',s:'<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3" fill="#fff1f2" stroke="#dc2626" stroke-width="1.8"/><polygon points="7.5,6.5 16.5,6.5 12,11.5" fill="#dc2626"/><text x="12" y="18.3" text-anchor="middle" font-size="6" font-weight="bold" fill="#b91c1c">비상</text></svg>'};
  var a=FL_ICONS.indexOf('acb');
  if(FL_ICONS.indexOf('vcb')<0)FL_ICONS.splice(a<0?FL_ICONS.length:a,0,'vcb');
  if(FL_ICONS.indexOf('eld')<0)FL_ICONS.push('eld');
  FL_CT.vcb='VCB';FL_CT.eld='비상부하';
  FL_DOT.vcb='#27272a';FL_DOT.eld='#dc2626';
  var _st=flState;
  flState=function(i,sim){
    if(i&&i.t==='eld'){
      if(!FL.out)return null;
      return sim&&sim.on&&sim.on.has(i.id)?['비상 공급','r']:['공급 안 됨','x'];
    }
    return _st(i,sim);
  };
  try{if(typeof flRe==='function')flRe();}catch(e){}
})();
/* ===== VCB · 비상부하 아이콘 끝 ===== */
/* ===== 양방향 흐름 + 모선(부스바) 시작 ===== */
(function(){
  /* --- 모선 아이콘 등록 --- */
  FL_T.bus={l:'모선',s:'<svg viewBox="0 0 24 24"><rect x="2" y="9" width="20" height="5" rx="1.2" fill="#1e293b"/><rect x="5" y="14" width="2" height="6" fill="#64748b"/><rect x="11" y="14" width="2" height="6" fill="#64748b"/><rect x="17" y="14" width="2" height="6" fill="#64748b"/><rect x="11" y="3" width="2" height="6" fill="#64748b"/></svg>'};
  if(FL_ICONS.indexOf('bus')<0){var v=FL_ICONS.indexOf('vcb');FL_ICONS.splice(v<0?FL_ICONS.length:v,0,'bus');}
  FL_DOT.bus='#1e293b';

  function busL(i){return i.bl>0?i.bl:100;}
  function busSnap(i,q){var P=flP(i),L=busL(i);
    return i.bo==='v'?{x:P.x,y:Math.max(P.y-L,Math.min(P.y+L,q.y))}:{x:Math.max(P.x-L,Math.min(P.x+L,q.x)),y:P.y};}

   /* --- 모선 길이 조절 · 회전 --- */
  var BD=null;
  document.addEventListener('pointerdown',function(e){
    var t=e.target;if(!t||!t.closest)return;
    var r=t.closest('[data-busr]');
    if(r){e.stopPropagation();e.stopImmediatePropagation();e.preventDefault();
      var i=flI(r.getAttribute('data-busr'));if(i){i.bo=i.bo==='v'?'h':'v';save();flRe();}return;}
    var hd=t.closest('[data-bush]');
    if(hd){e.stopPropagation();e.stopImmediatePropagation();e.preventDefault();
      BD=flI(hd.getAttribute('data-bush'));}
  },true);
  document.addEventListener('pointermove',function(e){
    if(!BD)return;var p=flPos(e),P=flP(BD);
    var L=BD.bo==='v'?Math.abs(p.y-P.y):Math.abs(p.x-P.x);
    BD.bl=Math.max(15,Math.round(L/5)*5);flRe();
  },true);
  document.addEventListener('pointerup',function(){if(BD){BD=null;save();}},true);

  try{flRe();}catch(e){}
})();
/* ===== 양방향 흐름 + 모선(부스바) 끝 ===== */
/* ===== 자동 직각 선 시작 ===== */
(function(){
  var PM=new WeakMap();
  function busL(i){return i.bl>0?i.bl:100;}
  function snap(i,q){var P=flP(i),L=busL(i);
    return i.bo==='v'?{x:P.x,y:Math.max(P.y-L,Math.min(P.y+L,q.y))}:{x:Math.max(P.x-L,Math.min(P.x+L,q.x)),y:P.y};}
  function step(p,q,hz){var dx=q.x-p.x,dy=q.y-p.y,T=5;
    if(Math.abs(dx)<T)return [p,{x:p.x,y:q.y}];
    if(Math.abs(dy)<T)return [p,{x:q.x,y:p.y}];
    if(hz==null)hz=Math.abs(dx)>2*Math.abs(dy);
    if(hz){var mx=(p.x+q.x)/2;return [p,{x:mx,y:p.y},{x:mx,y:q.y},q];}
    var my=(p.y+q.y)/2;return [p,{x:p.x,y:my},{x:q.x,y:my},q];}
  function route(A,B){var pa=flP(A),pb=flP(B),ab=A.t==='bus',bb=B.t==='bus',s,e;
    if(ab&&bb){s=snap(A,pb);e=snap(B,s);return step(s,e,A.bo==='v');}
    if(ab){s=snap(A,pb);return step(s,pb,A.bo==='v');}
    if(bb){e=snap(B,pa);return step(pa,e,B.bo==='v');}
    return step(pa,pb);}

  /* 노란 줄 버튼 */
  function bar(){var ed=document.querySelector('#view .flEd');if(!FL.edit||!ed)return;
    var o=ed.querySelector('.flAu');if(o)o.remove();
    var l=FL.selL&&flD().lines.find(function(x){return x.id===FL.selL;});
    var h='<i>선 모양</i>';
    if(l)h+='<button data-flau="a"'+(l.au===1?' class="on"':'')+'>⊾ 자동 직각</button><button data-flau="m"'+(l.au!==1?' class="on"':'')+'>✎ 수동</button>';
    h+='<button data-flau="all">⊾ 전부 자동 직각으로</button>';
    var sp=document.createElement('span');sp.className='gp flAu';sp.innerHTML=h;ed.insertBefore(sp,ed.firstChild);}
  var _re=flRe;
  flRe=function(){var r=_re.apply(this,arguments);try{bar();}catch(e){}return r;};
  new MutationObserver(function(){var ed=document.querySelector('#view .flEd');if(ed&&!ed.querySelector('.flAu'))try{bar();}catch(e){}})
    .observe(document.body,{childList:true,subtree:true});
  document.addEventListener('pointerup',function(){setTimeout(function(){try{bar();}catch(e){}},30);});

  document.addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('[data-flau]');if(!b)return;
    e.preventDefault();e.stopPropagation();
    var f=flD(),v=b.getAttribute('data-flau');
    if(v==='all'){
      var n=f.lines.filter(function(l){return l.au!==1;}).length;
      if(!n){alert('이 화면의 선은 이미 전부 자동 직각이에요.');return;}
      if(!confirm('수동 선 '+n+'개를 자동 직각으로 바꿀까요?\n손으로 찍은 꺾은 점은 지워져요. (Ctrl+Z로 되돌리기 가능)'))return;
      f.lines.forEach(function(l){l.au=1;l.pts=[];});
    }else{
      var l=f.lines.find(function(x){return x.id===FL.selL;});if(!l)return;
      if(v==='a'){l.au=1;l.pts=[];}
      else if(l.au===1){var A=flI(l.a),B=flI(l.b),r=A&&B?route(A,B):[];
        l.pts=r.slice(1,-1).map(function(p){return {x:p.x,y:p.y};});l.au=0;}
    }
    save();flRe();
  },true);

  try{flRe();}catch(e){}
})();
/* ===== 자동 직각 선 끝 ===== */
/* ===== 이름표 위치 (화면 전체 · 아이콘별 방향) 시작 ===== */
(function(){
  var GK='ckd_fl_lbpos';
  function G(){return localStorage.getItem(GK)||'d';}
  function num(s,a){var m=s.match(new RegExp('\\s'+a+'="(-?[\\d.]+)"'));return m?parseFloat(m[1]):NaN;}

  var css=document.createElement('style');
  css.textContent='.flLbG{display:inline-flex;align-items:center;gap:2px;margin-left:6px;font-size:12px;color:#475569}'+
    '.flLbG i,.flLbI i{font-style:normal;margin-right:3px}'+
    '.flLbG button,.flLbI button{border:1px solid #cbd5e1;background:#fff;border-radius:5px;padding:2px 7px;font-size:12px;cursor:pointer}'+
    '.flLbG button.on,.flLbI button.on{background:#262f7d;color:#fff;border-color:#262f7d}';
  document.head.appendChild(css);

  /* 대상 아이콘 */
  function targets(){var L=[];
    if(FL.ms&&FL.ms.size>1)FL.ms.forEach(function(id){var x=flI(id);if(x)L.push(x);});
    else if(FL.sel){var x=flI(FL.sel);if(x)L.push(x);}
    return L.filter(function(x){return x.t!=='jn'&&x.t!=='bus';});}

  /* 버튼 */
  function bars(){
    var bar=document.querySelector('#view .flBar');
    if(bar){var o=bar.querySelector('.flLbG');if(o)o.remove();
      var g=G(),sp=document.createElement('span');sp.className='flLbG';
      sp.innerHTML='<i>이름표</i><button data-fllbg="d"'+(g==='d'?' class="on"':'')+'>아래</button><button data-fllbg="r"'+(g==='r'?' class="on"':'')+'>오른쪽</button>';
      bar.appendChild(sp);}
    var ed=document.querySelector('#view .flEd');
    if(ed){var o2=ed.querySelector('.flLbI');if(o2)o2.remove();
      var T=FL.edit?targets():[];
      if(T.length){var v=T.every(function(x){return (x.lbd||'')===(T[0].lbd||'');})?(T[0].lbd||''):'?';
        var B=[['u','↑'],['d','↓'],['l','←'],['r','→'],['','기본']];
        var s2=document.createElement('span');s2.className='gp flLbI';
        s2.innerHTML='<i>이름표'+(T.length>1?' ('+T.length+')':'')+'</i>'+B.map(function(b){return '<button data-fllbi="'+b[0]+'"'+(v===b[0]?' class="on"':'')+'>'+b[1]+'</button>';}).join('');
        ed.appendChild(s2);}}
  }
  var _re=flRe;
  flRe=function(){var r=_re.apply(this,arguments);try{bars();}catch(e){}return r;};
  new MutationObserver(function(){
    var bar=document.querySelector('#view .flBar'),ed=document.querySelector('#view .flEd');
    if((bar&&!bar.querySelector('.flLbG'))||(ed&&FL.edit&&targets().length&&!ed.querySelector('.flLbI')))try{bars();}catch(e){}
  }).observe(document.body,{childList:true,subtree:true});
  document.addEventListener('pointerup',function(){setTimeout(function(){try{bars();}catch(e){}},40);});

  document.addEventListener('click',function(e){
    var t=e.target;if(!t.closest)return;
    var a=t.closest('[data-fllbg]'),b=t.closest('[data-fllbi]');if(!a&&!b)return;
    e.preventDefault();e.stopPropagation();
    if(a){localStorage.setItem(GK,a.getAttribute('data-fllbg'));flRe();return;}
    var v=b.getAttribute('data-fllbi');
    targets().forEach(function(x){if(v)x.lbd=v;else delete x.lbd;});
    save();flRe();
  },true);

  try{flRe();}catch(e){}
})();
/* ===== 이름표 위치 (화면 전체 · 아이콘별 방향) 끝 ===== */
/* ===== 이름표 가볍게 (박스 없음 · 둘째 줄 숨김) 시작 ===== */
(function(){
  var css=document.createElement('style');
  css.textContent='#view .fl-i .lbSub{display:none}#view .fl-i:hover .lbSub{display:inline}';
  document.head.appendChild(css);
  try{flRe();}catch(e){}
})();
/* ===== 이름표 가볍게 (박스 없음 · 둘째 줄 숨김) 끝 ===== */
/* ===== 일반 부하 아이콘 시작 ===== */
(function(){
  if(FL_T.load)return;
  FL_T.load={l:'부하',s:'<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3" fill="#f1f5f9" stroke="#475569" stroke-width="1.6"/><path d="M12 6v6" stroke="#475569" stroke-width="2" stroke-linecap="round"/><path d="M7.5 12h9L12 18z" fill="#475569"/></svg>'};
  FL_DOT.load='#475569';
  if(typeof FL_CT!=='undefined')FL_CT.load='부하';
  var ek=Object.keys(FL_T).find(function(k){return FL_T[k]&&FL_T[k].l==='비상부하';});
  var p=ek?FL_ICONS.indexOf(ek):-1;
  if(FL_ICONS.indexOf('load')<0){if(p>=0)FL_ICONS.splice(p,0,'load');else FL_ICONS.push('load');}
  try{flRe();}catch(e){}
})();
/* ===== 일반 부하 아이콘 끝 ===== */
/* ===== 둘째 줄 반복 정리 시작 ===== */
(function(){
  var _s=flSync;
  flSync=function(){
    var f=flD(),ch=false;
    f.items.forEach(function(i){
      if(!i.nid||!i.um)return;var n=byId(i.nid);if(!n)return;
      var ts=flTreeSub(n),seen={},out=[];
      String(i.um).split(' · ').forEach(function(p){p=p.trim();if(!p||p===ts||seen[p])return;seen[p]=1;out.push(p);});
      var v=out.join(' · ');
      if(v!==i.um){if(v)i.um=v;else delete i.um;ch=true;}
    });
    if(ch)save();
    return _s.apply(this,arguments);
  };
  try{flSync();flRe();}catch(e){}
})();
/* ===== 둘째 줄 반복 정리 끝 ===== */

/* ===== ATS · 콘덴서 아이콘 시작 ===== */
(function(){
  function add(k,def,dot,ct,after,before){
    if(FL_T[k])return;
    FL_T[k]=def;FL_DOT[k]=dot;
    if(typeof FL_CT!=='undefined')FL_CT[k]=ct;
    if(FL_ICONS.indexOf(k)>=0)return;
    var p=-1;
    if(after){for(var a=0;a<after.length&&p<0;a++){var q=FL_ICONS.indexOf(after[a]);if(q>=0)p=q+1;}}
    if(p<0&&before){var b=FL_ICONS.indexOf(before);if(b>=0)p=b;}
    if(p<0)FL_ICONS.push(k);else FL_ICONS.splice(p,0,k);
  }
  var vk=Object.keys(FL_T).find(function(k){return FL_T[k]&&FL_T[k].l==='VCB';});
  add('atsw',{l:'ATS',s:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2" fill="#fff1f2" stroke="#9f1239" stroke-width="1.6"/><circle cx="8" cy="3.2" r="2" fill="#64748b"/><circle cx="16" cy="3.2" r="2" fill="#dc2626"/><text x="12" y="16.5" text-anchor="middle" font-size="7" font-weight="bold" fill="#9f1239">ATS</text></svg>'},
    '#9f1239','ATS',[vk,'acb'],null);
  add('cap',{l:'콘덴서',s:'<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3" fill="#f0fdfa" stroke="#0f766e" stroke-width="1.6"/><path d="M12 5.5v5M12 13.5v5" stroke="#0f766e" stroke-width="1.8" stroke-linecap="round"/><path d="M7 10.5h10M7 13.5h10" stroke="#0f766e" stroke-width="2.2" stroke-linecap="round"/></svg>'},
    '#0f766e','콘덴서',null,'load');
  try{flRe();}catch(e){}
})();
/* ===== ATS · 콘덴서 아이콘 끝 ===== */
/* ===== 22.9kV 선 노란색 시작 ===== */
(function(){
  try{
    FL_K.hv.c='#eab308';
    flRe();
  }catch(e){console.warn('22.9kV 색 변경 실패',e);}
})();
/* ===== 22.9kV 선 노란색 끝 ===== */
/* ===== 분전반 아이콘 추가 시작 ===== */
(function(){
  try{
    FL_T.pnl={l:'분전반',s:'<svg viewBox="0 0 24 24"><rect x="3.5" y="2.5" width="17" height="19" rx="1.5" fill="#e5e7eb" stroke="#334155" stroke-width="1.5"/><rect x="5.5" y="4.5" width="13" height="2.5" rx=".5" fill="#334155"/><g fill="#27272a"><rect x="6.5" y="9" width="4" height="2.4" rx=".4"/><rect x="13.5" y="9" width="4" height="2.4" rx=".4"/><rect x="6.5" y="13" width="4" height="2.4" rx=".4"/><rect x="13.5" y="13" width="4" height="2.4" rx=".4"/><rect x="6.5" y="17" width="4" height="2.4" rx=".4"/><rect x="13.5" y="17" width="4" height="2.4" rx=".4"/></g><path d="M12 8.5v11" stroke="#94a3b8" stroke-width=".8"/></svg>'};
    if(FL_ICONS.indexOf('pnl')<0){
      var k=FL_ICONS.indexOf('mcc');
      FL_ICONS.splice(k<0?FL_ICONS.length:k+1,0,'pnl');
    }
    if(typeof FL_CT!=='undefined')FL_CT.pnl='분전반';
    flRe();
  }catch(e){console.warn('분전반 아이콘 추가 실패',e);}
})();
/* ===== 분전반 아이콘 추가 끝 ===== */
/* ===== CB 차단기 아이콘 추가 시작 ===== */
(function(){
  try{
    FL_T.lcb={l:'CB',s:'<svg viewBox="0 0 24 24"><rect x="5" y="2.5" width="14" height="19" rx="2" fill="#52525b" stroke="#27272a" stroke-width="1.5"/><rect x="9" y="6" width="6" height="7" rx="1" fill="#27272a"/><rect x="10.3" y="6.8" width="3.4" height="3.2" rx=".6" fill="#e4e4e7"/><text x="12" y="19" text-anchor="middle" font-size="5.5" font-weight="bold" fill="#fff">CB</text></svg>'};
    if(FL_ICONS.indexOf('lcb')<0){
      var k=FL_ICONS.indexOf('acb');
      FL_ICONS.splice(k<0?FL_ICONS.length:k+1,0,'lcb');
    }
    if(typeof FL_CT!=='undefined')FL_CT.lcb='CB';
    flRe();
  }catch(e){console.warn('CB 아이콘 추가 실패',e);}
})();
/* ===== CB 차단기 아이콘 추가 끝 ===== */
/* ===== 차단기 모양 구분 (ACB 넓게 · CB 좁게) 시작 ===== */
(function(){
  try{
    FL_T.acb.s='<svg viewBox="0 0 24 24">'+
      '<rect x="3" y="19" width="18" height="1.6" rx=".5" fill="#6b7280"/>'+
      '<rect x="1.5" y="4.5" width="21" height="14.5" rx="1.5" fill="#1f2937" stroke="#000" stroke-width="1.2"/>'+
      '<rect x="4" y="6.5" width="16" height="6" rx="1" fill="#374151"/>'+
      '<text x="12" y="11.3" text-anchor="middle" font-size="5" font-weight="bold" fill="#fff">ACB</text>'+
      '<circle cx="5" cy="15.8" r="1.1" fill="#22c55e"/><circle cx="19" cy="15.8" r="1.1" fill="#ef4444"/>'+
      '<rect x="8" y="14.7" width="8" height="2.2" rx="1.1" fill="#d4d4d8"/></svg>';
    FL_T.lcb.s='<svg viewBox="0 0 24 24">'+
      '<rect x="7.5" y="2" width="9" height="20" rx="1.5" fill="#f4f4f5" stroke="#52525b" stroke-width="1.3"/>'+
      '<circle cx="10" cy="4.3" r=".8" fill="#71717a"/><circle cx="14" cy="4.3" r=".8" fill="#71717a"/>'+
      '<circle cx="10" cy="19.7" r=".8" fill="#71717a"/><circle cx="14" cy="19.7" r=".8" fill="#71717a"/>'+
      '<rect x="10" y="7" width="4" height="8" rx=".8" fill="#d4d4d8" stroke="#a1a1aa" stroke-width=".5"/>'+
      '<rect x="10.5" y="7.5" width="3" height="3.6" rx=".6" fill="#27272a"/>'+
      '<text x="12" y="18" text-anchor="middle" font-size="3.8" font-weight="bold" fill="#3f3f46">CB</text></svg>';
    if(!localStorage.getItem('ckd_fl_lcbfix')){
      var f=flD(),c=0;
      (f.items||[]).forEach(function(i){if(i.t==='lcb'){if(i.zs){delete i.zs;c++;}if(i.lbd){delete i.lbd;c++;}}});
      localStorage.setItem('ckd_fl_lcbfix','1');
      if(c)setTimeout(save);
    }
  }catch(e){console.warn('차단기 모양 변경 실패',e);}
  try{flRe();}catch(e){}
})();
/* ===== 차단기 모양 구분 (ACB 넓게 · CB 좁게) 끝 ===== */
/* ===== 선택 범위 펼치기·모으기 시작 ===== */
(function(){
  function sel(){return [...FL.ms].map(flI).filter(function(i){return i&&flVis(i);});}
  function spread(m){
    var L=sel(),f=flD();
    if(L.length<2&&!FL.msB.size){toast('범위를 드래그해서 2개 이상 골라 주세요.',false);return;}
    var old=new Map(),xs=[],ys=[];
    L.forEach(function(i){var p=flP(i);old.set(i.id,{x:p.x,y:p.y});xs.push(p.x);ys.push(p.y);});
    FL.msB.forEach(function(id){var b=flB(id);if(b)b.pts.forEach(function(q){xs.push(q.x);ys.push(q.y);});});
    var cx=(Math.min.apply(null,xs)+Math.max.apply(null,xs))/2,cy=(Math.min.apply(null,ys)+Math.max.apply(null,ys))/2;
    function S(q){return {x:flR(cx+(q.x-cx)*m),y:flR(cy+(q.y-cy)*m)};}
    if(m<1&&typeof flNX==='function'&&typeof flHei==='function'){
      var A=L.filter(function(i){return i.t!=='bus'&&i.t!=='jn';});
      function ov(p,q){return Math.abs(p.x-q.x)<flNX(p,q)*.9&&Math.abs(p.y-q.y)<Math.max(flHei(p.i),flHei(q.i))*.9;}
      for(var s=0;s<A.length;s++)for(var t=s+1;t<A.length;t++){
        var o1=old.get(A[s].id),o2=old.get(A[t].id),n1=S(o1),n2=S(o2);
        if(ov({i:A[s],x:n1.x,y:n1.y},{i:A[t],x:n2.x,y:n2.y})&&!ov({i:A[s],x:o1.x,y:o1.y},{i:A[t],x:o2.x,y:o2.y})){
          toast('더 모으면 아이콘이 겹쳐요.',false);return;}}}
    L.forEach(function(i){var n=S(old.get(i.id));flSetP(i,n.x,n.y);
      if(i.t==='bus')i.bl=Math.max(15,Math.round((i.bl>0?i.bl:100)*m/5)*5);});
    FL.msB.forEach(function(id){var b=flB(id);if(b)b.pts=b.pts.map(S);});
    f.lines.forEach(function(l){if(!l.pts||!l.pts.length)return;
      if(old.has(l.a)&&old.has(l.b)){l.pts=l.pts.map(S);return;}
      [['a',0],['b',l.pts.length-1]].forEach(function(e){var O=old.get(l[e[0]]);if(!O)return;
        var N=flP(flI(l[e[0]])),p=l.pts[e[1]];if(Math.abs(p.x-O.x)<.5)p.x=N.x;if(Math.abs(p.y-O.y)<.5)p.y=N.y;});});
    save();flRe();toast((m>1?'↔ 펼쳤어요':'모았어요')+' · 잘못되면 Ctrl+Z',false);
  }
  var _v=flView;
  flView=function(){var h=_v.apply(this,arguments);
    try{if(typeof h==='string'&&flMsN()>1&&h.indexOf('data-fla="sp:')<0&&h.indexOf('<button data-fla="msclr">')>=0){
      var g='<span class="gp"><i>범위</i><button data-fla="sp:up" title="고른 범위의 자리만 1.2배 벌려요 (아이콘 크기는 그대로)">↔ 펼치기</button><button data-fla="sp:dn" title="고른 범위의 자리를 좁혀요 (겹치기 전까지만)">모으기</button></span> ';
      h=h.replace('<button data-fla="msclr">',g+'<button data-fla="msclr">');}}catch(e){}
    return h;};
  var _a=flAct;
  flAct=function(a){if(a==='sp:up')return spread(1.2);if(a==='sp:dn')return spread(1/1.2);return _a.apply(this,arguments);};
  try{flRe();}catch(e){}
})();
/* ===== 선택 범위 펼치기·모으기 끝 ===== */
/* ===== 이름표 자동 정리 (줄바꿈·줄이기) 시작 ===== */
(function(){
  function ON(){return localStorage.getItem('ckd_fl_lbfit')!=='0';}
  function dir(i){return i.lbd||localStorage.getItem('ckd_fl_lbpos')||'d';}
  function X(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function tw(s,fs){try{return flTw(s,fs);}catch(e){return s.length*fs*.9;}}
  var W={};
  function calc(){W={};if(!ON())return;
    var A=flD().items.filter(function(i){return flVis(i)&&i.t!=='bus'&&i.t!=='jn';})
      .map(function(i){var p=flP(i);return {i:i,x:p.x,y:p.y,d:dir(i)};}),R=34*(FL.sz||1);
    A.forEach(function(a){if(a.d!=='d'&&a.d!=='u')return;var m=Infinity;
      A.forEach(function(b){if(b===a||b.d!==a.d||Math.abs(b.y-a.y)>R)return;var dx=Math.abs(b.x-a.x);if(dx>2&&dx<m)m=dx;});
      if(m<Infinity)W[a.i.id]=m;});}
  function wrap(s,mw,fs){var L=[],cur='';
    s.replace(/\(/g,' (').split(/\s+/).filter(Boolean).forEach(function(t){
      var c=cur?cur+' '+t:t;if(tw(c,fs)<=mw){cur=c;return;}
      if(cur)L.push(cur);cur=t;
      while(tw(cur,fs)>mw&&cur.length>1){var k=cur.length-1;while(k>1&&tw(cur.slice(0,k),fs)>mw)k--;L.push(cur.slice(0,k));cur=cur.slice(k);}});
    if(cur)L.push(cur);return L;}
  function fit(nm,mw,fs,M){
    var a=nm.replace(/\s*\([^)]*\)/g,'').trim(),b=a.replace(/^\s*\d+-\d+\s*구역\s*/,'').trim(),C=[nm,a,b];
    for(var j=0;j<3;j++){if(!C[j])continue;var L=wrap(C[j],mw,fs);if(L.length<=M)return L;}
    L=wrap(b||a||nm,mw,fs).slice(0,M);var t=L[M-1];
    while(t.length>1&&tw(t+'…',fs)>mw)t=t.slice(0,-1);L[M-1]=t+'…';return L;}
  var RE=/<text x="(-?[\d.]+)" y="(-?[\d.]+)" text-anchor="middle" font-size="([\d.]+)" font-weight="700"([^>]*)>([^<]*)<\/text>/;
  var _fi=flItem;
  flItem=function(i){var s=_fi.apply(this,arguments);
    try{
      if(!ON()||!i||!(i.id in W)||typeof s!=='string')return s;
      var m=s.match(RE);if(!m||m[4].indexOf('stroke="#fff"')<0)return s;
      var nm=flNm(i);if(m[5]!==X(nm))return s;
      var fs=+m[3],mw=Math.max(W[i.id]*.94-2,fs*3);if(tw(nm,fs)<=mw)return s;
      var d=dir(i),L=fit(nm,mw,fs,d==='u'?2:3),lh=fs*1.2,ex=(L.length-1)*lh,cx=m[1],y0=+m[2]-(d==='u'?ex:0);
      var t='<text x="'+cx+'" y="'+y0.toFixed(1)+'" text-anchor="middle" font-size="'+m[3]+'" font-weight="700"'+m[4]+'><title>'+X(nm)+'</title>'+
        L.map(function(l,j){return '<tspan x="'+cx+'"'+(j?' dy="'+lh.toFixed(1)+'"':'')+'>'+X(l)+'</tspan>';}).join('')+'</text>';
      var rest=s.slice(m.index+m[0].length);
      if(d!=='u'&&ex)rest=rest.replace(/^(<text(?: class="lbSub")? x="-?[\d.]+" y=")(-?[\d.]+)/,function(_,a,b){return a+(+b+ex).toFixed(1);});
      return s.slice(0,m.index)+t+rest;
    }catch(e){return s;}};
  var _fd=flDraw;
  flDraw=function(){try{calc();}catch(e){W={};}return _fd.apply(this,arguments);};
  try{flRe();}catch(e){}
})();
/* ===== 이름표 자동 정리 (줄바꿈·줄이기) 끝 ===== */
/* ===== CTTS 살릴 계통 선택 · 정전 안내 줄이기 시작 ===== */
(function(){
  var css=document.createElement('style');
  css.textContent='#view .flCt{background:#f0fdf4;border:1px solid #86efac;border-radius:6px;padding:6px 8px;margin-bottom:6px;font-size:12px;color:#14532d}'+
  '#view .flCt .hd2{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:4px}'+
  '#view .flCt button{padding:2px 8px;border:1px solid #86efac;background:#fff;border-radius:6px;font-size:12px;cursor:pointer}'+
  '#view .flCt .ls{display:flex;flex-wrap:wrap;gap:4px 12px;max-height:120px;overflow:auto}'+
  '#view .flCt label{display:inline-flex;align-items:center;gap:3px;cursor:pointer;white-space:nowrap}'+
  '#view .flCt .em{color:#dc2626;font-weight:700;font-size:11px}';
  document.head.appendChild(css);

  function vk(){return Object.keys(FL_T).find(function(k){return FL_T[k]&&FL_T[k].l==='VCB';})||'vcb';}
  function brk(t){return t===vk()||t==='acb'||t==='lcb';}
  function isEm(i){var n=i&&i.nid&&byId(i.nid);if(!n)return false;if(n.src==='E')return true;
    try{if(typeof effSrc==='function'){var s=effSrc(n);if(s==='E'||(s&&s.src==='E'))return true;}}catch(e){}return false;}
  function adj(f){var A=new Map();f.lines.forEach(function(l){[[l.a,l.b],[l.b,l.a]].forEach(function(p){if(!A.has(p[0]))A.set(p[0],[]);A.get(p[0]).push(p[1]);});});return A;}
  function cands(g,f,M,A){
    function run(needBus){var seen=new Set([g.id]),q=[[g.id,!needBus]],out=[];
      while(q.length){var c=q.shift();(A.get(c[0])||[]).forEach(function(y){if(seen.has(y))return;seen.add(y);var b=M.get(y);if(!b||FL_SRCT[b.t])return;
        if(brk(b.t)&&c[1]){out.push(b);return;}
        q.push([y,c[1]||b.t==='bus']);});}
      return out;}
    var r=run(true);return r.length?r:run(false);}
  function info(){var f=flD(),M=new Map(f.items.map(function(i){return [i.id,i];})),A=adj(f),keep=new Set(),all=new Map(),per=[],ch=false;
    f.items.filter(function(i){return i.t==='cgen';}).forEach(function(g){var C=cands(g,f,M,A);
      if(!Array.isArray(g.keep)){g.keep=C.filter(isEm).map(function(b){return b.id;});ch=true;}
      var K=new Set(g.keep);C.forEach(function(b){all.set(b.id,b);if(K.has(b.id))keep.add(b.id);});per.push(g);});
    if(ch)setTimeout(save);
    var cut=new Set();all.forEach(function(b,id){if(!keep.has(id))cut.add(id);});
    return {per:per,cut:cut,keep:keep};}

  /* 정전 모드일 때 체크 안 한 차단기를 꺼진 것으로 넘김 (v6 하위 꺼짐 계산이 받아서 처리) */
   var base=flSim;
  flSim=function(){FL._ct=null;
    try{if(FL.out){FL._ct=info();FL.bad=FL._ct.cut;}else FL.bad=new Set();}catch(e){FL.bad=new Set();}
    var r=base.apply(this,arguments);
    try{if(FL.out&&FL.bad.size&&r&&r.dir){
      var f=flD(),M=new Map(f.items.map(function(i){return [i.id,i];})),B=FL.bad,on=new Set(),dir={},st={},q=[];
      r.on.forEach(function(id){var i=M.get(id);if(i&&FL_SRCT[i.t]){on.add(id);q.push(id);}});
      while(q.length){var x=q.shift();
        f.lines.forEach(function(l){if(r.dir[l.id]!==x)return;var y=x===l.a?l.b:l.a;
          if(B.has(y))return;dir[l.id]=x;if(!on.has(y)){on.add(y);q.push(y);}});}
      f.lines.forEach(function(l){st[l.id]=dir[l.id]?'on':'off';});
      r=Object.assign({},r,{on:on,dir:dir,st:st});}}catch(e){console.warn('CTTS 차단 계산',e);}
    return r;};

  var _st=flState;
  flState=function(i,sim){if(FL.out&&i&&FL.bad&&FL.bad.has(i.id))return ['차단','x'];return _st(i,sim);};

  function panel(g){var f=flD();if(!Array.isArray(g.keep))info();
    var M=new Map(f.items.map(function(i){return [i.id,i];})),C=cands(g,f,M,adj(f)),K=new Set(g.keep||[]);
    C.sort(function(a,b){var p=flP(a),q=flP(b);return p.x-q.x||p.y-q.y;});
    var n=C.filter(function(b){return K.has(b.id);}).length;
    return '<div class="flCt"><div class="hd2"><b>CTTS 발전기 – 정전 때 살릴 계통 ('+n+'/'+C.length+')</b>'+
      '<button data-flcka="all">전체 선택</button><button data-flcka="none">전체 해제</button><button data-flcka="em">비상 지정만</button>'+
      '<span style="color:#64748b">평상시엔 병렬운전이라 전부 살아요 · 정전 모드에서만 체크 안 한 곳이 차단돼요</span></div>'+
      (C.length?'<div class="ls">'+C.map(function(b){return '<label><input type="checkbox" data-flck="'+b.id+'"'+(K.has(b.id)?' checked':'')+'>'+esc(flNm(b))+(isEm(b)?' <span class="em">비상</span>':'')+'</label>';}).join('')+'</div>'
       :'<div style="color:#b45309">이 발전기에서 선으로 이어진 VCB·ACB·CB가 없어요. 발전기 → 모선 → VCB로 선을 이어 주세요.</div>')+'</div>';}

  var _v=flView;
  flView=function(){var h=_v.apply(this,arguments);if(typeof h!=='string')return h;
    try{
      if(FL.out){
        h=h.replace(/(<div class="flOut">[\s\S]*?)<br>(?:✅|<span style="color:#64748b">아이콘을)[\s\S]*?<\/div>/,'$1</div>');
        var I=FL._ct||info();
        if(I.per.length)h=h.replace(/(<div class="flOut">[\s\S]*?)<\/div>/,'$1<br>· CTTS 발전기: 살릴 계통 <b>'+I.keep.size+'</b>개 · 차단 '+I.cut.size+'개'+
          (I.keep.size?'':' <b style="color:#b45309">⚠ 살릴 계통이 선택되지 않았어요 (CTTS 발전기 아이콘을 눌러 고르세요)</b>')+'</div>');}
      var g=FL.sel&&flI(FL.sel);
      if(g&&g.t==='cgen'&&h.indexOf('<div id="flW"')>=0)h=h.replace('<div id="flW"',panel(g)+'<div id="flW"');
    }catch(e){console.warn('CTTS 선택',e);}
    return h;};

  document.addEventListener('change',function(e){var t=e.target;if(!t.closest||!t.closest('#view .flCt [data-flck]'))return;
    var g=flI(FL.sel);if(!g||g.t!=='cgen')return;
    var id=t.getAttribute('data-flck'),K=new Set(g.keep||[]);if(t.checked)K.add(id);else K.delete(id);
    g.keep=Array.from(K);save();flRe();},true);
  document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('#view .flCt [data-flcka]');if(!b)return;
    e.preventDefault();e.stopPropagation();var g=flI(FL.sel);if(!g||g.t!=='cgen')return;
    var f=flD(),M=new Map(f.items.map(function(i){return [i.id,i];})),C=cands(g,f,M,adj(f)),a=b.getAttribute('data-flcka');
    g.keep=a==='all'?C.map(function(x){return x.id;}):a==='em'?C.filter(isEm).map(function(x){return x.id;}):[];
    save();flRe();},true);

  try{flRe();}catch(e){}
})();
/* ===== CTTS 살릴 계통 선택 · 정전 안내 줄이기 끝 ===== */
/* ===== ATS 비상 전환 (상용측 끊기) 시작 ===== */
(function(){
  var AK='atsw';
  var base=flSim;
  flSim=function(){
    var r=base.apply(this,arguments);
    FL._atsE=new Set();
    try{
      if(!FL.out||!r||!r.dir)return r;
      var f=flD(),M=new Map(f.items.map(function(i){return [i.id,i];})),A=f.items.filter(function(i){return i.t===AK;});
      if(!A.length)return r;
      /* 한전 인입에서 실선으로 닿는 곳 (ATS는 통과하지 않음) = 상용 쪽 */
      var U=new Set(),q0=[];
      f.items.forEach(function(i){if(i.t==='in'){U.add(i.id);q0.push(i.id);}});
      while(q0.length){var x0=q0.shift();
        f.lines.forEach(function(l){if(flIsEm(l,M)||(l.a!==x0&&l.b!==x0))return;
          var y0=l.a===x0?l.b:l.a,b=M.get(y0);if(!b||U.has(y0))return;U.add(y0);if(b.t!==AK)q0.push(y0);});}
      var nd={};try{nd=flSimRun(false,{}).dir||{};}catch(e){}
      var cut={},n=0;
      A.forEach(function(a){
        var emIn=f.lines.some(function(l){return (l.a===a.id||l.b===a.id)&&flIsEm(l,M)&&r.dir[l.id]&&r.dir[l.id]!==a.id;});
        if(!emIn)return;
        FL._atsE.add(a.id);
        f.lines.forEach(function(l){if((l.a!==a.id&&l.b!==a.id)||flIsEm(l,M))return;
          var o=l.a===a.id?l.b:l.a;if(U.has(o)||nd[l.id]===o){cut[l.id]=1;n++;}});
      });
      if(!n)return r;
      var on=new Set(),dir={},st={},q=[];
      r.on.forEach(function(id){var i=M.get(id);if(i&&FL_SRCT[i.t]){on.add(id);q.push(id);}});
      while(q.length){var x=q.shift();
        f.lines.forEach(function(l){if(cut[l.id]||r.dir[l.id]!==x)return;
          var y=x===l.a?l.b:l.a;dir[l.id]=x;if(!on.has(y)){on.add(y);q.push(y);}});}
      f.lines.forEach(function(l){st[l.id]=dir[l.id]?'on':'off';});
      return Object.assign({},r,{on:on,dir:dir,st:st});
    }catch(e){console.warn('ATS 전환 계산',e);return r;}
  };
  var _st=flState;
  flState=function(i,sim){
    if(FL.out&&i&&i.t===AK&&FL._atsE&&FL._atsE.has(i.id))return ['비상 전환','r'];
    return _st(i,sim);};
  try{flRe();}catch(e){}
})();
/* ===== ATS 비상 전환 (상용측 끊기) 끝 ===== */
