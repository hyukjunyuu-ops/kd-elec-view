/* =========================================================
   flow-impact.js — 영향 범위 패널 · 트리 바로가기 · 목록 접기 · 창 이동
   (index.html에서 flow.js 바로 다음에 불러와요)
   ========================================================= */

/* ---------- 1. 영향 범위 패널 · 트리 바로가기 ---------- */
(function(){
  var st=document.createElement('style');
  st.textContent=
  '#flImp{position:absolute;right:10px;width:300px;overflow:auto;background:#fff;border:1px solid #cbd5e1;border-radius:10px;box-shadow:0 6px 20px rgba(15,23,42,.18);font-size:12px;z-index:20}'+
  '#flImp .fiH{position:sticky;top:0;z-index:1;background:#262f7d;color:#fff;padding:8px 10px}'+
  '#flImp .fiH b{font-size:13px}#flImp .fiH .x{float:right;cursor:pointer;opacity:.8}'+
  '#flImp .fiS{color:#cbd5e1;margin-top:2px}'+
  '#flImp .fiB{display:flex;flex-wrap:wrap;gap:4px;padding:8px 10px;border-bottom:1px solid #e2e8f0}'+
  '#flImp button{border:1px solid #cbd5e1;background:#fff;border-radius:6px;padding:3px 8px;font-size:12px;cursor:pointer}'+
  '#flImp button.on{background:#262f7d;color:#fff;border-color:#262f7d}'+
  '#flImp button.dn{background:#dc2626;color:#fff;border-color:#dc2626}'+
  '#flImp .fiC{padding:6px 10px;color:#334155;border-bottom:1px solid #e2e8f0}'+
  '#flImp .fiW{padding:5px 10px;color:#b45309;background:#fffbeb}'+
  '#flImp .fiG{padding:5px 10px;background:#f1f5f9;font-weight:700;color:#262f7d}'+
  '#flImp .fiR{padding:3px 10px;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
  '#flImp .fiR:hover{background:#eef2ff}'+
  '#flImp .fiT{display:inline-block;min-width:30px;text-align:center;font-size:10px;border-radius:4px;padding:0 3px;margin-right:4px;background:#e2e8f0;color:#334155}'+
  '#flImp .t-PNL,#flImp .t-UPS{background:#dbeafe;color:#1e40af}#flImp .t-LOAD{background:#f8fafc;color:#64748b}'+
  '#view .fl-i.fdead{opacity:.28;filter:grayscale(1)}#view .fl-l.fdeadl .base{stroke:#9ca3af!important}#view .fl-l.fdeadl .fx{display:none}'+
  '.fiFlash{animation:fiF .4s 4 alternate}@keyframes fiF{from{background:#fde68a}to{background:transparent}}';
  document.head.appendChild(st);

  var BRK={acb:1,vcb:1,mcc:1,tr:1},GEN={gen:1,cgen:1};
  var TL={IN:'인입',HV:'고압',TR:'TR',GEN:'발전기',ATS:'ATS',SS:'변전',MDB:'배전',CB:'CB',PNL:'분전',UPS:'UPS',LOAD:'부하'};
  var IMP={mode:localStorage.getItem('ckd_fl_impm')||'tree',hide:null};
  FL.off=FL.off||new Set();FL._dead=new Set();FL._deadL=new Set();

  function E(s){s=s==null?'':String(s);return typeof esc==='function'?esc(s):s.replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function NM(n){return typeof label==='function'?label(n):(n.name||n.no||'');}
  function downOf(id,dir){var f=flD(),S2=new Set(),q=[id];
    while(q.length){var x=q.shift();f.lines.forEach(function(l){var fr=dir[l.id];if(fr!==x)return;var y=fr===l.a?l.b:l.a;if(y===id||S2.has(y))return;S2.add(y);q.push(y);});}
    return S2;}

  /* 내리기 · 고장 반영 */
  var base=flSim;
  
     function simAt(out){var o=FL.out,d=FL._dir,r;FL.out=out;try{r=base();}finally{FL.out=o;FL._dir=d;}return r;}

  var _s=flState;flState=function(i,sim){if(i&&FL.off.has(i.id))return [GEN[i.t]?'고장':'OFF','x'];return _s(i,sim);};
  var _i=flItem;flItem=function(i,sim,pa,k,lod){var s=_i(i,sim,pa,k,lod);if(s&&i&&FL._dead.has(i.id))s=s.replace('class="fl-i','class="fl-i fdead');return s;};
  var _l=flLines;flLines=function(sim,pa,k){var s=_l(sim,pa,k);if(!FL._deadL.size)return s;
    return s.replace(/<g class="([^"]*)" data-l="([^"]+)">/g,function(m,c,id){return FL._deadL.has(id)?'<g class="'+c+' fdeadl" data-l="'+id+'">':m;});};

  /* 팀(즐겨찾기 그룹) — flow-export.js도 같이 써요 */
  function teamMap(){var m={},gn={};
    try{var d=JSON.parse(localStorage.getItem('ckd_elec2_fav')||'{}'),gs=d.groups||[];
      (Array.isArray(gs)?gs:Object.keys(gs).map(function(k){var g=gs[k];if(g&&!g.id)g.id=k;return g;})).forEach(function(g){if(g)gn[g.id]=g.name||g.n||g.id;});
      var it=d.items||{};
      if(Array.isArray(it))it.forEach(function(x){if(!x)return;var id=x.id||x.nid||x.n,g=x.g||x.gid||x.group;if(id&&!m[id])m[id]=gn[g]||g;});
      else Object.keys(it).forEach(function(id){var v=it[id];if(v&&typeof v==='object')v=Array.isArray(v)?v[0]:(v.g||v.gid||v.group);if(v)m[id]=gn[v]||v;});
    }catch(e){}
    return m;}
  function teamOf(n,m){for(var d=0;n&&d<60;d++){if(m[n.id])return m[n.id];n=n.pid?byId(n.pid):null;}return '(그룹 없음)';}
  window.flTeamMap=teamMap;window.flTeamOf=teamOf;

  /* 영향 범위 계산 */
  function impact(i){var out=FL.out||!!GEN[i.t],r=simAt(out),ds=downOf(i.id,r.dir||{}),ic=[i],unl=0,rows=[],seen=new Set();
    ds.forEach(function(id){var x=flI(id);if(x)ic.push(x);});
    function walk(n,d){if(!n||seen.has(n.id)||d>40)return;seen.add(n.id);rows.push({n:n,d:d});(kids(n.id)||[]).forEach(function(c){walk(c,d+1);});}
    ic.forEach(function(x){if(x.t==='jn'||x.t==='bus')return;var n=x.nid&&byId(x.nid);if(!n){if(x!==i)unl++;return;}walk(n,0);});
    return {rows:rows,unl:unl,nic:ic.length-1};}

  function row(n,d){return '<div class="fiR" data-fimp="'+n.id+'" style="padding-left:'+(10+d*12)+'px" title="'+E(NM(n))+'"><span class="fiT t-'+n.type+'">'+(TL[n.type]||n.type)+'</span>'+E(NM(n))+'</div>';}
  function panelHtml(){var i=FL.sel&&flI(FL.sel);
    if(IMP.hide&&IMP.hide!==FL.sel)IMP.hide=null;
    if(!i||i.t==='jn'||FL.edit||IMP.hide===FL.sel)return '';
    var R=impact(i),isB=!!BRK[i.t],isG=!!GEN[i.t],off=FL.off.has(i.id),nP=0,nL=0;
    R.rows.forEach(function(x){var t=x.n.type;if(t==='PNL'||t==='UPS')nP++;else if(t==='LOAD')nL++;});
    var h='<div class="fiH"><span class="x" data-fimpa="x">✕</span><b>'+E(flNm(i))+'</b><div class="fiS">'+(isG?'정전 시 이 발전기가 살리는 범위':off?'내려서 꺼진 범위':'이 아래에 걸린 계통')+'</div></div><div class="fiB">';
    if(isB)h+='<button data-fimpa="tog" class="'+(off?'dn':'')+'">'+(off?'↺ 다시 올리기':'⏻ 내리기')+'</button>';
    if(isG)h+='<button data-fimpa="tog" class="'+(off?'dn':'')+'">'+(off?'↺ 고장 해제':'⏻ 고장')+'</button>';
    if(FL.off.size)h+='<button data-fimpa="clr">모두 복구 ('+FL.off.size+')</button>';
    if(i.nid&&byId(i.nid)&&typeof fpGo==='function')h+='<button data-fimpa="fpg" title="이 항목이 있는 동 화면으로 이동">🏢 '+E(bk(byId(i.nid)))+' 화면</button>';
    h+='<span style="flex:1"></span><button data-fimpa="m-tree" class="'+(IMP.mode==='tree'?'on':'')+'">계통순</button><button data-fimpa="m-team" class="'+(IMP.mode==='team'?'on':'')+'">팀별</button></div>';
    h+='<div class="fiC">아이콘 '+R.nic+' · 분전반 <b>'+nP+'</b> · 부하 <b>'+nL+'</b></div>';
    if(R.unl)h+='<div class="fiW">⚠ 트리 연결(🔗) 안 된 아이콘 '+R.unl+'개 — 그 아래는 목록에서 빠져요</div>';
    if(!R.rows.length)h+='<div class="fiC" style="color:#94a3b8">연결된 트리 항목이 없어요. 아이콘을 🔗로 트리에 연결해 주세요.</div>';
    else if(IMP.mode==='team'){var m=teamMap(),G={},O=[];
      R.rows.forEach(function(x){var t=teamOf(x.n,m);if(!G[t]){G[t]=[];O.push(t);}G[t].push(x.n);});
      O.sort(function(a,b){return (a==='(그룹 없음)')-(b==='(그룹 없음)');});
      O.forEach(function(t){h+='<div class="fiG">'+E(t)+' · '+G[t].length+'</div>'+G[t].map(function(n){return row(n,0);}).join('');});}
    else h+=R.rows.map(function(x){return row(x.n,x.d);}).join('');
    return h;}

  function paint(){var w=document.getElementById('flW'),o=document.getElementById('flImp');
    if(!w||(typeof UI!=='undefined'&&UI.tab!=='flow')){if(o)o.remove();return;}
    var h='';try{h=panelHtml();}catch(e){console.error('영향 범위',e);}
    if(!h){if(o)o.remove();return;}
    var p=w.parentNode;if(getComputedStyle(p).position==='static')p.style.position='relative';
    if(!o||o.parentNode!==p){if(o)o.remove();o=document.createElement('div');o.id='flImp';p.appendChild(o);}
    o.style.top=(w.offsetTop+10)+'px';o.style.maxHeight=Math.max(200,w.clientHeight-20)+'px';
    if(o._h!==h){o.innerHTML=h;o._h=h;}}
  var _re=flRe;flRe=function(){var r=_re.apply(this,arguments);setTimeout(paint);return r;};
  new MutationObserver(function(){if(document.getElementById('flW')&&!document.getElementById('flImp'))paint();})
    .observe(document.body,{childList:true,subtree:true});

  /* 트리 바로가기 */
  function flash(id){var tr=document.getElementById('tree');if(!tr)return;
    var e=[].slice.call(tr.querySelectorAll('*')).find(function(x){return [].some.call(x.attributes,function(a){return a.value===id;});});
    if(!e)return;e.scrollIntoView({block:'center',behavior:'smooth'});e.classList.add('fiFlash');setTimeout(function(){e.classList.remove('fiFlash');},1700);}
  function goTree(id){var tr=document.getElementById('tree');
    if(tr&&tr.offsetParent===null){var tb=[].slice.call(document.querySelectorAll('button,[role="tab"],.tab')).find(function(b){return b.offsetParent!==null&&/계통\s*트리/.test(b.textContent)&&b.textContent.length<20;});if(tb)tb.click();}
    if(typeof select==='function')select(id,true);
    setTimeout(function(){flash(id);},150);}

  var PD=null;
  document.addEventListener('pointerdown',function(e){var t=e.target;if(!t.closest)return;
    if(t.closest('#flImp')){e.stopPropagation();return;}
    var g=t.closest('#flSvg .fl-i');PD=g?{id:g.getAttribute('data-fi'),x:e.clientX,y:e.clientY}:null;},true);
  document.addEventListener('pointerup',function(e){var p=PD;PD=null;if(!p||FL.edit)return;
    if(Math.abs(e.clientX-p.x)+Math.abs(e.clientY-p.y)>6)return;
    var i=flI(p.id);if(i&&i.nid&&byId(i.nid))setTimeout(function(){goTree(i.nid);},60);});
  document.addEventListener('wheel',function(e){if(e.target.closest&&e.target.closest('#flImp'))e.stopPropagation();},true);

  document.addEventListener('click',function(e){var t=e.target;if(!t.closest)return;
    var a=t.closest('#flImp [data-fimpa]'),r=t.closest('#flImp [data-fimp]');if(!a&&!r)return;
    e.preventDefault();e.stopPropagation();
    if(r)return goTree(r.getAttribute('data-fimp'));
    var v=a.getAttribute('data-fimpa'),i=FL.sel&&flI(FL.sel);
    if(v==='x'){IMP.hide=FL.sel;paint();return;}
    if(v==='m-tree'||v==='m-team'){IMP.mode=v.slice(2);localStorage.setItem('ckd_fl_impm',IMP.mode);paint();return;}
    if(v==='clr'){FL.off.clear();flRe();return;}
    if(v==='fpg'&&i&&i.nid){fpGo(bk(byId(i.nid)),i.nid);return;}
    if(v==='tog'&&i){if(FL.off.has(i.id))FL.off.delete(i.id);else FL.off.add(i.id);flRe();return;}
  },true);

  try{flRe();}catch(e){}
})();

/* ---------- 2. 목록 접기 ---------- */
(function(){
  var ST={},LAST=null;
  var css=document.createElement('style');
  css.textContent='#flImp .fiTg,#flImp .fiTs{display:inline-block;width:14px;text-align:center;margin-right:2px}'+
    '#flImp .fiTg{color:#64748b;cursor:pointer;font-size:11px}#flImp .fiTg:hover{color:#262f7d}'+
    '#flImp .fiR.fiHid{display:none}';
  document.head.appendChild(css);

  function dep(r){return Math.round(((parseFloat(r.style.paddingLeft)||10)-10)/12);}
  function isOpen(id,d){return ST[id]!=null?ST[id]:d===0;}

  function apply(){
    var o=document.getElementById('flImp');if(!o)return;
    if(FL.sel!==LAST){ST={};LAST=FL.sel;}
    var R=[].slice.call(o.querySelectorAll('.fiR'));if(!R.length)return;
    var D=R.map(dep),tree=D.some(function(d){return d>0;}),cut=null,any=false;
    R.forEach(function(r,k){
      var d=D[k],id=r.getAttribute('data-fimp'),has=tree&&k+1<R.length&&D[k+1]>d;
      var tg=r.querySelector('.fiTg,.fiTs');
      if(!tg){tg=document.createElement('span');r.insertBefore(tg,r.firstChild);}
      if(has){any=true;tg.className='fiTg';tg.setAttribute('data-fitg',id);tg.textContent=isOpen(id,d)?'▾':'▸';}
      else{tg.className='fiTs';tg.removeAttribute('data-fitg');tg.textContent='';}
      if(cut!==null&&d>cut)r.classList.add('fiHid');
      else{cut=null;r.classList.remove('fiHid');}
      if(cut===null&&has&&!isOpen(id,d))cut=d;
      r.setAttribute('data-fi2','1');
    });
    var bar=o.querySelector('.fiB'),bx=o.querySelector('.fiAll');
    if(any&&bar&&!bx){
      var sp=bar.querySelector('span');
      var h='<button class="fiAll" data-fiall="o">⊞ 전체 펼치기</button><button class="fiAll" data-fiall="c">⊟ 전체 접기</button>';
      if(sp)sp.insertAdjacentHTML('beforebegin',h);else bar.insertAdjacentHTML('beforeend',h);
    }
    if(!any&&bx)[].slice.call(o.querySelectorAll('.fiAll')).forEach(function(b){b.remove();});
  }

  new MutationObserver(function(){
    var o=document.getElementById('flImp');
    if(o&&o.querySelector('.fiR:not([data-fi2])'))apply();
  }).observe(document.body,{childList:true,subtree:true});

  window.addEventListener('click',function(e){
    var t=e.target;if(!t.closest)return;
    var g=t.closest('#flImp [data-fitg]'),b=t.closest('#flImp [data-fiall]');
    if(!g&&!b)return;
    e.preventDefault();e.stopPropagation();
    if(g){var id=g.getAttribute('data-fitg'),r=g.closest('.fiR');ST[id]=!isOpen(id,dep(r));}
    else{var open=b.getAttribute('data-fiall')==='o';ST={};
      [].slice.call(document.querySelectorAll('#flImp .fiTg')).forEach(function(x){ST[x.getAttribute('data-fitg')]=open;});}
    apply();
  },true);

  setTimeout(apply,300);
})();

/* ---------- 3. 창 이동 · 크기 조절 ---------- */
(function(){
  var K='ckd_fl_imppos',P=null,D=null;
  try{P=JSON.parse(localStorage.getItem(K)||'null');}catch(e){}
  var css=document.createElement('style'),dyn=document.createElement('style');
  css.textContent='#flImp{box-sizing:border-box;border-bottom:7px solid #cbd5e1!important}'+
    '#flImp .fiH{cursor:move;user-select:none}#flImp .fiH .x{cursor:pointer}'+
    'body.fiDrag,body.fiDrag *{user-select:none!important}';
  document.head.appendChild(css);document.head.appendChild(dyn);

  function box(){var o=document.getElementById('flImp');return o&&o.parentNode;}
  function clamp(p){var h=box();if(!h)return p;var W=h.clientWidth,H=h.clientHeight;
    p.w=Math.max(220,Math.min(p.w,W-10));p.h=Math.max(150,Math.min(p.h,H-10));
    p.x=Math.max(0,Math.min(p.x,W-80));p.y=Math.max(0,Math.min(p.y,H-40));return p;}
  function put(){dyn.textContent=P?'#flImp{left:'+P.x+'px!important;top:'+P.y+'px!important;right:auto!important;width:'+P.w+'px!important;height:'+P.h+'px!important;max-height:none!important}':'';}
  function zone(o,e){var r=o.getBoundingClientRect(),b=e.clientY>r.bottom-9,l=e.clientX<r.left+7;
    return b&&l?'bl':b?'b':l?'l':'';}

  window.addEventListener('pointerdown',function(e){
    var o=document.getElementById('flImp');if(!o||!o.contains(e.target))return;
    var m=zone(o,e);
    if(!m&&e.target.closest('.fiH')&&!e.target.closest('.x'))m='mv';
    if(!m)return;
    var r=o.getBoundingClientRect(),hr=o.parentNode.getBoundingClientRect();
    D={m:m,sx:e.clientX,sy:e.clientY,p:{x:r.left-hr.left,y:r.top-hr.top,w:r.width,h:r.height}};
    document.body.classList.add('fiDrag');
    e.preventDefault();e.stopPropagation();
  },true);

  window.addEventListener('pointermove',function(e){
    var o=document.getElementById('flImp');
    if(!D){if(o&&o.contains(e.target)){var z=zone(o,e);o.style.cursor=z==='bl'?'nesw-resize':z==='b'?'ns-resize':z==='l'?'ew-resize':'';}return;}
    var dx=e.clientX-D.sx,dy=e.clientY-D.sy,n={x:D.p.x,y:D.p.y,w:D.p.w,h:D.p.h};
    if(D.m==='mv'){n.x+=dx;n.y+=dy;}
    if(D.m==='b'||D.m==='bl')n.h+=dy;
    if(D.m==='l'||D.m==='bl'){n.x+=dx;n.w-=dx;}
    P=clamp(n);put();e.preventDefault();
  },true);

  window.addEventListener('pointerup',function(){
    if(!D)return;D=null;document.body.classList.remove('fiDrag');
    if(P)localStorage.setItem(K,JSON.stringify(P));
  },true);

  window.addEventListener('dblclick',function(e){
    if(!e.target.closest||!e.target.closest('#flImp .fiH')||e.target.closest('.x'))return;
    P=null;localStorage.removeItem(K);put();
  },true);

  window.addEventListener('resize',function(){if(P){P=clamp(P);put();}});
  put();
})();
/* ===== flow-impact.js 끝 ===== */
/* ===== 내리기 버튼 직접 처리 시작 ===== */
(function(){
  function hit(e){return e.target.closest&&e.target.closest('#flImp [data-fimpa="tog"],#flImp [data-fimpa="clr"]');}
  window.addEventListener('pointerdown',function(e){
    var b=hit(e);if(!b||e.button!==0)return;
    e.preventDefault();e.stopPropagation();
    if(!FL.off)FL.off=new Set();
    if(b.getAttribute('data-fimpa')==='clr'){FL.off.clear();toast('모두 복구했어요.',false);}
    else{var id=FL.sel;
      if(!id||!flI(id)){toast('먼저 차단기 아이콘을 클릭하세요.',false);return;}
      if(FL.off.has(id)){FL.off.delete(id);toast('↺ 다시 올렸어요.',false);}
      else{FL.off.add(id);toast('⏻ 내렸어요.',false);}}
    flRe();
  },true);
  window.addEventListener('click',function(e){if(hit(e)){e.preventDefault();e.stopPropagation();}},true);
})();
/* ===== 내리기 버튼 직접 처리 끝 ===== */
/* ===== 내리기 하위 계통 꺼짐 v6 시작 ===== */
(function(){
  function install(){
    if(typeof flSim!=='function'||flSim._v6)return;
    var SRC={in:1,pv:1,ess:1},SRC_O={gen:1,cgen:1,pv:1,ess:1};
    function offIds(f,M){var O=new Set();
      [FL.off,FL.fail,FL.bad].forEach(function(x){if(x&&x.forEach)x.forEach(function(v){
        if(M.has(v))O.add(v);f.items.forEach(function(i){if(i.nid&&i.nid===v)O.add(i.id);});});});
      return O;}
    function walk(f,M,O,on0){
      var S=FL.out?SRC_O:SRC,reach=new Set(),q=[];
      f.items.forEach(function(i){if(S[i.t]&&!O.has(i.id)){reach.add(i.id);q.push(i.id);}});
      var L=f.lines.filter(function(l){return FL.out||!flIsEm(l,M);});
      while(q.length){var x=q.shift();
        L.forEach(function(l){if(l.a!==x&&l.b!==x)return;var y=l.a===x?l.b:l.a;
          if(!M.has(y)||O.has(y)||reach.has(y))return;
          if(FL.out&&!on0.has(y))return;
          reach.add(y);q.push(y);});}
      return reach;}
    var base=flSim;
    var nw=function(){
      var r=base.apply(this,arguments);
      FL._dead=new Set();FL._deadL=new Set();
      try{
        var f=flD(),M=new Map(f.items.map(function(i){return [i.id,i];})),O=offIds(f,M);
        FL._offI=O;
        if(!r||!O.size)return r;
        var on0=r.on||new Set();
        var all=walk(f,M,new Set(),on0),reach=walk(f,M,O,on0);
        var on=new Set(),st=Object.assign({},r.st||{});
        on0.forEach(function(id){if(reach.has(id)||!all.has(id))on.add(id);});
        O.forEach(function(id){FL._dead.add(id);on.delete(id);});
        all.forEach(function(id){if(!reach.has(id)){FL._dead.add(id);on.delete(id);}});
        f.lines.forEach(function(l){
          if(FL._dead.has(l.a)||FL._dead.has(l.b)){st[l.id]='off';FL._deadL.add(l.id);}});
        return Object.assign({},r,{on:on,st:st});
      }catch(e){console.warn('하위 꺼짐 계산 오류',e);return r;}
    };
    nw._v6=1;flSim=nw;
    var _it=flItem;
    flItem=function(i,sim,pa,k,lod){var s=_it(i,sim,pa,k,lod);
      if(s&&i&&FL._dead&&FL._dead.has(i.id)&&s.indexOf('fdead')<0)s=s.replace('class="fl-i','class="fdead fl-i');
      return s;};
    var _ln=flLines;
    flLines=function(sim,pa,k){var s=_ln(sim,pa,k);
      if(!FL._deadL||!FL._deadL.size)return s;
      return s.replace(/<g class="([^"]*)" data-l="([^"]+)"/g,function(m,c,id){
        return FL._deadL.has(id)&&c.indexOf('fdeadl')<0?'<g class="'+c+' fdeadl" data-l="'+id+'"':m;});};
    var css=document.createElement('style');
    css.textContent='#view .fl-i.fdead{opacity:.28;filter:grayscale(1)}#view .fl-l.fdeadl .base{stroke:#9ca3af!important}#view .fl-l.fdeadl{opacity:.35}#view .fl-l.fdeadl .fx{display:none}';
    document.head.appendChild(css);
    try{flRe();}catch(e){}
  }
  if(document.readyState==='complete')setTimeout(install,0);
  else window.addEventListener('load',function(){setTimeout(install,0);});
})();
/* ===== 내리기 하위 계통 꺼짐 v6 끝 ===== */




