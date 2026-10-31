/* =========================================================
   tree.js — 계통 트리 (펼침 · 동 필터 · 검색 · 편집/끌어서 옮기기)
   ========================================================= */
const UI={sel:'',open:new Set(),edit:false,chk:new Set(),bld:'',tab:'flow'};
function loadUI(){try{const u=JSON.parse(localStorage.getItem('ckd_elec2_ui')||'{}');
  UI.open=new Set(u.open||[]);UI.sel=u.sel||'';UI.bld=u.bld||'';UI.tab=u.tab||'flow';}catch(e){}}
let _ui=0;
function saveUI(){clearTimeout(_ui);_ui=setTimeout(()=>{try{localStorage.setItem('ckd_elec2_ui',
  JSON.stringify({open:[...UI.open],sel:UI.sel,bld:UI.bld,tab:UI.tab}));}catch(e){}},300);}

function bldVisible(){
  if(!UI.bld)return null;const match=new Set(),show=new Set();
  S.nodes.forEach(n=>{if(bk(n)!==UI.bld)return;match.add(n.id);let c=n,g=0;while(c&&!show.has(c.id)&&g++<100){show.add(c.id);c=par(c);}});
  return {match,show};
}
function inChecked(n){let c=n,g=0;while(c&&g++<100){if(UI.chk.has(c.id))return true;c=par(c);}return false;}

function rowHtml(n,d,vis){
  const K=kids(n.id).length,op=UI.open.has(n.id),p=par(n),T=TYPES[n.type]||{c:'#64748b'};
  const tg=K?`<span class="tg" data-tg="${esc(n.id)}">${op?'▾':'▸'}</span>`:'<span class="tg"></span>';
  const emg=(effSrc(n)==='E'&&(!p||effSrc(p)!=='E'))?'<span class="em">비상</span>':'';
  let ex='';const sp=spec(n);if(sp)ex+=`<span class="rt">${esc(sp)}</span>`;
  if(n.type!=='TR'&&n.volt&&n.volt!==inV(n))ex+=`<span class="vt">${esc(n.volt)}</span>`;
  const eb=effBld(n);if(n.bld&&(!p||eb!==effBld(p)))ex+=`<span class="bt">${p?'→ ':'📍'}${esc(eb)}</span>`;
  const ck=UI.edit?`<input type="checkbox" class="ck"${UI.chk.has(n.id)?' checked':''}>`:'';
  const cls=['trow'];if(n.id===UI.sel)cls.push('sel');if(vis&&!vis.match.has(n.id))cls.push('dim');if(UI.edit&&inChecked(n))cls.push('del');
  return `<div class="${cls.join(' ')}" data-id="${esc(n.id)}"${UI.edit?' draggable="true"':''} style="padding-left:${4+d*16}px">${tg}${ck}${emg}<span class="ty" style="background:${T.c}">${esc(tlabel(n))}</span>${n.no?`<span class="no">${esc(n.no)}</span>`:''}<span class="nm">${isSlot(n)?'<i style="color:#cbd5e1">빈 자리</i>':esc(n.name||'(이름 없음)')}</span>${n.imp?`<span class="imp" title="중요 부하 · ${esc(n.imp)}">중요</span>`:''}${ex}${favStar(n)}</div>`;
}
function renderTree(){
  const el=$('#tree'),q=($('#search').value||'').trim().toLowerCase();
  renderEditBar();
  if(q)return renderSearch(el,q);
  const vis=bldVisible(),out=[];
  const rec=(pid,d)=>{for(const n of kids(pid)){if(vis&&!vis.show.has(n.id))continue;out.push(rowHtml(n,d,vis));if(UI.open.has(n.id))rec(n.id,d+1);}};
  rec('',0);
  el.innerHTML=out.join('')||`<div class="empty">${UI.bld?'이 동에 등록된 항목이 없어요.':'항목이 없어요.<br>[📂 백업 불러오기] 또는 [+ 최상위 항목]으로 시작하세요.'}</div>`;
}
function renderSearch(el,q){
  const hits=S.nodes.filter(n=>[n.no,n.name,n.model,n.loc,n.note,n.cbk].join(' ').toLowerCase().includes(q)).slice(0,300);
  el.innerHTML=hits.map(n=>{const T=TYPES[n.type]||{c:'#64748b'},pp=pathOf(n).slice(0,-1).map(label);const b=effBld(n);
    return `<div class="srow" data-id="${esc(n.id)}"><div><span class="ty" style="background:${T.c}">${esc(tlabel(n))}</span> ${esc(label(n))}</div><div class="sp">${b?'📍'+esc(b)+' · ':''}${esc(pp.join(' › '))||'(최상위)'}</div></div>`;}).join('')
    ||'<div class="empty">검색 결과가 없어요.</div>';
}
function renderEditBar(){
  const b=$('#editBar'),t=$('#tEdit');t.classList.toggle('on',UI.edit);t.textContent=UI.edit?'✓ 편집 완료':'✎ 편집';
  if(!UI.edit){b.hidden=true;return;}
  b.hidden=false;const c=UI.chk.size;
  b.innerHTML=`<span>${c?c+'개 선택':'항목을 눌러 선택'} · 끌어서 옮기기 가능</span><button id="tDel" class="dng"${c?'':' disabled'}>🗑 선택 삭제</button>`;
}
function revealOnly(id){const n=byId(id);if(!n)return;UI.open=new Set(pathOf(n).slice(0,-1).map(x=>x.id));}
function select(id,reveal){
  UI.sel=id;if(reveal)revealOnly(id);saveUI();renderAll();
  const r=document.querySelector('#tree .trow.sel');if(r)r.scrollIntoView({block:'nearest'});
}
function setBld(b){
  UI.bld=b;
  if(b)S.nodes.forEach(n=>{if(bk(n)!==b)return;const p=par(n);if(!p||bk(p)!==b)pathOf(n).slice(0,-1).forEach(x=>UI.open.add(x.id));});
  saveUI();renderAll();
}
function delChecked(){
  const all=new Set(),add=id=>{if(all.has(id))return;all.add(id);kids(id).forEach(k=>add(k.id));};UI.chk.forEach(add);
  const cnt={};all.forEach(id=>{const n=byId(id);if(n){const l=(TYPES[n.type]||{}).l||n.type;cnt[l]=(cnt[l]||0)+1;}});
  const s=Object.entries(cnt).map(([k,v])=>`${k} ${v}`).join(', ');
  if(!confirm(`선택한 ${UI.chk.size}개와 그 하위까지 총 ${all.size}개를 삭제할까요?\n(${s})\n\n바로 뒤 [되돌리기]로 복구할 수 있어요.`))return;
  snap('삭제');S.nodes=S.nodes.filter(n=>!all.has(n.id));UI.chk.clear();if(all.has(UI.sel))UI.sel='';
  save();renderAll();toast(`${all.size}개 삭제했어요.`,true);
}
function moveNode(id,tid,pos){
  if(id===tid)return;const n=byId(id),t=byId(tid);if(!n||!t)return;
  if(isAnc(n,t)){alert('자기 하위 항목 쪽으로는 옮길 수 없어요.');return;}
  const where=pos==='in'?`"${label(t)}" 아래로`:`"${label(t)}" ${pos==='before'?'앞':'뒤'}으로`;
  if(!confirm(`"${label(n)}"을(를) ${where} 옮길까요?\n(하위 항목도 같이 옮겨져요)`))return;
  snap('옮기기');const A=S.nodes;A.splice(A.indexOf(n),1);
  if(pos==='in'){n.pid=t.id;A.push(n);UI.open.add(t.id);}
  else{n.pid=t.pid||'';const i=A.indexOf(t);A.splice(pos==='before'?i:i+1,0,n);}
  save();saveUI();renderAll();toast('옮겼어요.',true);
}

/* ---------- 트리 이벤트 ---------- */
(function(){
  const T=$('#tree');let DRAG=null,_sq=0;
  T.addEventListener('click',e=>{
    const tg=e.target.closest('[data-tg]');
    if(tg){const id=tg.dataset.tg;UI.open.has(id)?UI.open.delete(id):UI.open.add(id);saveUI();renderTree();return;}
    const sr=e.target.closest('.srow');if(sr){$('#search').value='';select(sr.dataset.id,true);return;}
    const r=e.target.closest('.trow');if(!r)return;
    if(UI.edit){const id=r.dataset.id;UI.chk.has(id)?UI.chk.delete(id):UI.chk.add(id);renderTree();return;}
    select(r.dataset.id);
  });
  T.addEventListener('dblclick',e=>{const r=e.target.closest('.trow');if(!r||UI.edit||!kids(r.dataset.id).length)return;
    const id=r.dataset.id;UI.open.has(id)?UI.open.delete(id):UI.open.add(id);saveUI();renderTree();});
  const clr=()=>T.querySelectorAll('.d-before,.d-after,.d-in').forEach(x=>x.classList.remove('d-before','d-after','d-in'));
  T.addEventListener('dragstart',e=>{const r=e.target.closest('.trow');if(!UI.edit||!r){e.preventDefault();return;}
    DRAG=r.dataset.id;e.dataTransfer.effectAllowed='move';try{e.dataTransfer.setData('text/plain',DRAG);}catch(_){}r.classList.add('drg');});
  T.addEventListener('dragover',e=>{if(!DRAG)return;const r=e.target.closest('.trow');clr();if(!r||r.dataset.id===DRAG)return;e.preventDefault();
    const rc=r.getBoundingClientRect(),y=(e.clientY-rc.top)/rc.height,pos=y<.28?'before':y>.72?'after':'in';r.classList.add('d-'+pos);r.dataset.pos=pos;});
  T.addEventListener('drop',e=>{const r=e.target.closest('.trow');if(!DRAG||!r)return;e.preventDefault();
    const id=DRAG,pos=r.dataset.pos||'in';DRAG=null;clr();moveNode(id,r.dataset.id,pos);});
  T.addEventListener('dragend',()=>{DRAG=null;clr();T.querySelectorAll('.drg').forEach(x=>x.classList.remove('drg'));});
  $('#search').addEventListener('input',()=>{clearTimeout(_sq);_sq=setTimeout(renderTree,150);});
  $('#tAll').onclick=()=>{UI.open.clear();if(UI.sel)revealOnly(UI.sel);saveUI();renderTree();};
  $('#tEdit').onclick=()=>{UI.edit=!UI.edit;UI.chk.clear();renderTree();};
  $('#editBar').addEventListener('click',e=>{if(e.target.id==='tDel')delChecked();});
})();
/* ===== 트리 전압·동 간단 구분 시작 ===== */
(function(){
  var css=document.createElement('style');
  css.textContent=
    '#tree .trow.vchg:not(.sel){background:#fffbeb;}'+
    '#tree .trow.vchg .rt{color:#b45309;font-weight:700;}'+
    '#tree .trow .bt{color:#0f766e;font-weight:700;}';
  document.head.appendChild(css);
  var base=rowHtml;
  rowHtml=function(n,d,vis){
    var h=base(n,d,vis);
    try{
      if(n.type==='TR'){
        h=h.replace('class="trow','class="trow vchg');
        var s=esc(spec(n));
        h=h.replace('<span class="rt">'+s+'</span>','<span class="rt">'+s.replace(' / ',' → ')+'</span>');
      }
    }catch(e){}
    return h;
  };
  try{renderTree();}catch(e){}
})();
/* ===== 트리 전압·동 간단 구분 끝 ===== */
/* ===== 비상 하위 빨간 점 시작 ===== */
(function(){
  var st=document.createElement('style');
  st.textContent='#tree .emDot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#dc2626;margin-right:4px;vertical-align:middle;flex-shrink:0}';
  document.head.appendChild(st);
  function isEm(n){try{return n.src!=='E'&&effSrc(n)==='E';}catch(e){return false;}}
  var busy=0,q=0;
  function run(){q=0;var t=document.getElementById('tree');if(!t||typeof byId!=='function')return;busy=1;
    try{var M=new Map();
      t.querySelectorAll('*').forEach(function(el){for(var k=0;k<el.attributes.length;k++){var a=el.attributes[k];
        if(a.name.indexOf('data-')!==0||!a.value||M.has(a.value))continue;var n=byId(a.value);if(n){M.set(a.value,{el:el,n:n});break;}}});
      M.forEach(function(o){var el=o.el,n=o.n,d=el.querySelector('.emDot');
        if(!isEm(n)){if(d)d.remove();return;}if(d)return;
        var tg=null,L=el.querySelectorAll('*');
        for(var j=0;j<L.length&&!tg;j++){var x=L[j],s=(x.textContent||'').trim();
          if(x.children.length||!s)continue;if((n.no&&s===String(n.no))||(n.name&&s.indexOf(n.name)>=0))tg=x;}
        var dot=document.createElement('span');dot.className='emDot';dot.title='비상 계통 (상위에서 따라옴)';
        if(tg)tg.parentNode.insertBefore(dot,tg);else el.insertBefore(dot,el.firstChild);});
    }catch(e){}busy=0;}
  new MutationObserver(function(){if(busy||q)return;q=1;requestAnimationFrame(run);}).observe(document.body,{childList:true,subtree:true});
  setTimeout(run,300);
})();
/* ===== 비상 하위 빨간 점 끝 ===== */
/* ===== 트리 여기부터 보기 · 너비 조절 · 검색 칩 시작 ===== */
(function(){
  var FK='ckd_elec2_tfz',WK='ckd_elec2_lw';
  UI.fz=localStorage.getItem(FK)||'';
  var css=document.createElement('style');
  css.textContent=
    '#tree .fz{margin-left:auto;flex:none;padding:0 6px;border:1px solid #c7cdf0;border-radius:4px;color:#262f7d;font-size:11px;background:#fff;visibility:hidden}'+
    '#tree .trow:hover .fz,#tree .trow.sel .fz{visibility:visible}#tree .fz:hover{background:#262f7d;color:#fff}'+
    '#tree .fzBar{position:sticky;top:-4px;z-index:2;background:#eef2ff;border:1px solid #c7cdf0;border-radius:6px;padding:4px 6px;margin-bottom:4px;font-size:12px;display:flex;flex-wrap:wrap;align-items:center;gap:2px}'+
    '#tree .fzBar a{color:#262f7d;cursor:pointer;padding:0 2px}#tree .fzBar a:hover{text-decoration:underline}#tree .fzBar b{color:#0f172a}'+
    '#tree .fzBar .x{margin-left:auto;cursor:pointer;color:#6b7280;padding:0 4px}#tree .fzBar .x:hover{color:#dc2626}'+
    '#lRsz{width:8px;margin:0 -4px;cursor:col-resize;flex:none;position:relative;z-index:3}'+
    '#lRsz:hover,#lRsz.on{background:linear-gradient(90deg,transparent 3px,#262f7d 3px,#262f7d 5px,transparent 5px)}'+
    '@media(max-width:900px){#lRsz{display:none}#left{width:auto!important}}'+
    '.srow .sh{display:flex;align-items:center;gap:4px;flex-wrap:wrap}.srow .cb{font-size:11px;border-radius:3px;padding:0 5px;flex:none}'+
    '.srow .cB{color:#0f766e;background:#ecfdf5;border:1px solid #a7f3d0}.srow .cV{color:#262f7d;background:#eef2ff;border:1px solid #c7cdf0}'+
    '.srow .cE{color:#fff;background:#dc2626}.sCnt{font-size:11px;color:#6b7280;padding:2px 8px 4px}';
  document.head.appendChild(css);

  function setFz(id){UI.fz=id;try{id?localStorage.setItem(FK,id):localStorage.removeItem(FK);}catch(e){}}
  function under(id,f){for(var c=byId(id),g=0;c&&g<200;g++){if(c.id===f)return true;c=par(c);}return false;}
  function V(n){try{if(n.type==='TR'){var i=inV(n),o=outV(n);if(i&&o&&i!==o)return i+' → '+o;}return n.volt||inV(n)||'';}catch(e){return n.volt||'';}}
  function EM(n){try{return effSrc(n)==='E';}catch(e){return false;}}

  /* 줄 끝 [⤵] 버튼 */
  var _row=rowHtml;
  rowHtml=function(n,d,vis){var h=_row(n,d,vis);
    try{if(!UI.edit&&kids(n.id).length&&n.id!==UI.fz)
      h=h.replace(/<\/div>$/,'<span class="fz" data-fz="'+esc(n.id)+'" title="이 항목을 맨 왼쪽으로 · 여기부터 보기">⤵</span></div>');}catch(e){}
    return h;};

  /* 경로 줄 */
  function bar(f){var P=pathOf(f).slice(0,-1),sh=P.length>3?P.slice(-3):P,s='<div class="fzBar"><a fzc="">🏠 전체</a>';
    if(P.length>3)s+=' › <span title="'+esc(P.slice(0,-3).map(label).join(' › '))+'">…</span>';
    sh.forEach(function(x){s+=' › <a fzc="'+esc(x.id)+'">'+esc(label(x))+'</a>';});
    return s+' › <b>'+esc(label(f))+'</b><span class="x" fzc="" title="여기부터 보기 끝내기">✕</span></div>';}

  /* 트리 그리기 */
  var _rt=renderTree;
  renderTree=function(){
    var el=$('#tree'),q=($('#search').value||'').trim();
    if(UI.fz&&!byId(UI.fz))setFz('');
    if(UI.fz&&UI.sel&&byId(UI.sel)&&!under(UI.sel,UI.fz))setFz('');
    if(q||!UI.fz)return _rt.apply(this,arguments);
    renderEditBar();
    var f=byId(UI.fz),vis=bldVisible();if(vis&&!vis.show.has(f.id))vis=null;
    var out=[bar(f),rowHtml(f,0,vis)];
    var rec=function(pid,d){kids(pid).forEach(function(n){if(vis&&!vis.show.has(n.id))return;out.push(rowHtml(n,d,vis));if(UI.open.has(n.id))rec(n.id,d+1);});};
    rec(f.id,1);el.innerHTML=out.join('');
  };

  /* 클릭 처리 */
  var TR=$('#tree');
  TR.addEventListener('click',function(e){
    var z=e.target.closest('[data-fz]'),c=e.target.closest('[fzc]');if(!z&&!c)return;
    e.stopPropagation();e.preventDefault();
    if(z){var id=z.getAttribute('data-fz');setFz(id);UI.open.add(id);UI.sel=id;saveUI();renderAll();TR.scrollTop=0;return;}
    var p=UI.fz;setFz(c.getAttribute('fzc'));
    if(p&&byId(p)){UI.sel=p;pathOf(byId(p)).slice(0,-1).forEach(function(x){UI.open.add(x.id);});}
    saveUI();renderAll();
    var r=TR.querySelector('.trow.sel');if(r)r.scrollIntoView({block:'center'});
  },true);
  TR.addEventListener('dblclick',function(e){if(e.target.closest('[data-fz],.fzBar'))e.stopPropagation();},true);

  /* 트리 칸 너비 조절 */
  var L=$('#left');
  if(L&&!document.getElementById('lRsz')){
    var w=+localStorage.getItem(WK);if(w>=240)L.style.width=w+'px';
    var h=document.createElement('div');h.id='lRsz';h.title='끌어서 트리 칸 너비 조절 · 더블클릭: 기본 너비';L.after(h);
    h.addEventListener('pointerdown',function(e){e.preventDefault();h.classList.add('on');h.setPointerCapture(e.pointerId);
      var x0=e.clientX,w0=L.getBoundingClientRect().width;
      function mv(ev){L.style.width=Math.max(240,Math.min(window.innerWidth*.7,w0+ev.clientX-x0))+'px';}
      function up(){h.classList.remove('on');h.removeEventListener('pointermove',mv);h.removeEventListener('pointerup',up);
        try{localStorage.setItem(WK,Math.round(L.getBoundingClientRect().width));}catch(e){}
        window.dispatchEvent(new Event('resize'));}
      h.addEventListener('pointermove',mv);h.addEventListener('pointerup',up);});
    h.addEventListener('dblclick',function(){L.style.width='';try{localStorage.removeItem(WK);}catch(e){}window.dispatchEvent(new Event('resize'));});
  }

  /* 검색 결과: 동·전압 칩 + 짧은 경로 */
  renderSearch=function(el,q){
    var hits=S.nodes.filter(function(n){return [n.no,n.name,n.model,n.loc,n.note,n.cbk].join(' ').toLowerCase().includes(q);}),tot=hits.length;
    hits=hits.slice(0,300);
    el.innerHTML=(tot?'<div class="sCnt">결과 '+tot+'개'+(tot>300?' (앞 300개만 표시)':'')+'</div>':'')+hits.map(function(n){
      var T=TYPES[n.type]||{c:'#64748b'},P=pathOf(n).slice(0,-1).map(label),b=effBld(n),v=V(n);
      var sp=P.length>3?'… › '+P.slice(-3).join(' › '):P.join(' › ');
      return '<div class="srow" data-id="'+esc(n.id)+'"><div class="sh"><span class="ty" style="background:'+T.c+'">'+esc(tlabel(n))+'</span><span>'+esc(label(n))+'</span>'+
        (b?'<span class="cb cB">🏢 '+esc(b)+'</span>':'')+(v?'<span class="cb cV">'+esc(v)+'</span>':'')+(EM(n)?'<span class="cb cE">비상</span>':'')+
        '</div><div class="sp" title="'+esc(P.join(' › '))+'">'+(esc(sp)||'(최상위)')+'</div></div>';}).join('')
      ||'<div class="empty">검색 결과가 없어요.</div>';
  };

  try{renderTree();}catch(e){}
})();
/* ===== 트리 여기부터 보기 · 너비 조절 · 검색 칩 끝 ===== */
/* ===== 빨간 점 위치 바로잡기 시작 ===== */
(function(){
  function fix(){
    document.querySelectorAll('#tree .trow > .emDot').forEach(function(d){
      var nm=d.parentElement.querySelector(':scope > .nm');
      if(nm&&d.nextElementSibling!==nm)d.parentElement.insertBefore(d,nm);
    });
  }
  var t=document.getElementById('tree');
  if(t)new MutationObserver(fix).observe(t,{childList:true,subtree:true});
  fix();
})();
/* ===== 빨간 점 위치 바로잡기 끝 ===== */
/* ===== 빨간 점 위치 바로잡기 시작 ===== */
(function(){
  function fix(){
    document.querySelectorAll('#tree .trow > .emDot').forEach(function(d){
      var nm=d.parentElement.querySelector(':scope > .nm');
      if(nm&&d.nextElementSibling!==nm)d.parentElement.insertBefore(d,nm);
    });
  }
  var t=document.getElementById('tree');
  if(t)new MutationObserver(fix).observe(t,{childList:true,subtree:true});
  fix();
})();
/* ===== 빨간 점 위치 바로잡기 끝 ===== */

