/* =========================================================
   app.js — 화면 조립 · 속성창 · 탭 · 버튼 · 시작
   ========================================================= */
let UNDO=null,_toastT=0,_ts=0;
function snap(what){UNDO={what,nodes:JSON.stringify(S.nodes)};}
function undo(){if(!UNDO)return;S.nodes=JSON.parse(UNDO.nodes);UNDO=null;if(UI.sel&&!byId(UI.sel))UI.sel='';save();renderAll();hideToast();}
function toast(msg,canUndo){$('#tMsg').textContent=msg;$('#tUndo').hidden=!canUndo;$('#toast').hidden=false;clearTimeout(_toastT);_toastT=setTimeout(hideToast,30000);}
function hideToast(){$('#toast').hidden=true;}
function setStatus(t,bad){const s=$('#status');s.textContent=t;s.classList.toggle('bad',!!bad);}
function treeSoon(){clearTimeout(_ts);_ts=setTimeout(()=>{renderTree();renderView();},200);}
function renderAll(){dirty();renderLogo();renderBld();renderTree();renderForm();renderView();renderFav();}
function renderLogo(){$('#logo').innerHTML=S.cfg.logo?`<img src="${S.cfg.logo}" alt="로고">`:'CKD';}

/* ---------- 동 버튼 줄 ---------- */
function renderBld(){
  const cnt={};S.nodes.forEach(n=>{const b=bk(n);cnt[b]=(cnt[b]||0)+1;});
  const B=S.blds.slice();Object.keys(cnt).forEach(b=>{if(!B.includes(b))B.push(b);});
  const all=typeof UIX!=='undefined'&&UIX.allB,hid=B.filter(b=>!cnt[b]&&UI.bld!==b).length; // 항목 없는 동은 [모든 동]을 눌렀을 때만
  $('#bldBar').innerHTML=`<span class="lb">동</span><button data-b=""${UI.bld?'':' class="on"'}>전체<i>${S.nodes.length}</i></button>`+
    B.filter(b=>all||cnt[b]||UI.bld===b).map(b=>`<button data-b="${esc(b)}"${UI.bld===b?' class="on"':''}>${esc(b)}<i>${cnt[b]||0}</i></button>`).join('')+
    (hid?`<button id="bAllB" class="lnk">${all?'▴ 접기':`+ 모든 동 (${hid})`}</button>`:'')+
    `<button id="bBld" class="edOnly" title="동 목록 편집 (추가·순서·이름)">⚙</button>`;
}
const bldOpts=cur=>{const L=S.blds.slice();if(cur&&!L.includes(cur))L.push(cur);return L.map(b=>`<option${b===cur?' selected':''}>${esc(b)}</option>`).join('');};

/* ---------- 속성창 ---------- */
const r2=(a,b)=>`<div class="r2">${a}${b}</div>`;
function inp(f,l,n,o){o=o||{};return `<label>${l}<input data-f="${f}"${o.r?' data-r':''}${o.list?` list="${o.list}"`:''} value="${esc(n[f]||'')}" placeholder="${esc(o.ph||'')}"></label>`;}
const tOpt=sel=>TYPE_ORDER.map(k=>`<option value="${k}"${k===sel?' selected':''}>${TYPES[k].l}</option>`).join('');
function renderForm(){
  const el=$('#form'),n=byId(UI.sel);
  if(n&&typeof UIX!=='undefined'&&!UIX.edit){el.innerHTML=uiFormView(n);return;} // 보기 모드: 요약만
  if(!n){el.innerHTML=`<div class="hint"><b>왼쪽 트리에서 항목을 고르세요.</b><br><br>처음 시작할 때는<br>· 위쪽 <b>[📂 백업 불러오기]</b>로 기존 본동 백업(JSON)을 넣거나<br>· <b>[+ 최상위 항목]</b>으로 한전 인입부터 만들어도 돼요.<br><br>기존 본동 항목 위에 TR·VCB를 넣을 때는 그 항목을 고르고 <b>[↑ 위에 상위 추가]</b>를 쓰세요.</div>`;return;}
  const t=n.type,p=par(n),iv=inV(n),pb=p?effBld(p):'';
  let h=favFormBtn(n)+`<div class="path">${pathOf(n).map(x=>`<a data-go="${esc(x.id)}">${esc(label(x))}</a>`).join(' › ')}</div>`;
  h+=r2(`<label>종류<select data-f="type">${tOpt(t)}</select></label>`,
    t==='CB'?`<label>차단기 종류<select data-f="cbk"><option value="">(미지정)</option>${CBK.map(k=>`<option${k===n.cbk?' selected':''}>${k}</option>`).join('')}</select></label>`:'<span></span>');
  h+=r2(inp('no','번호',n),inp('name','명칭',n));
  h+=r2(`<label>동<select data-f="bld"><option value="">${pb?'상위 따름 ('+esc(pb)+')':'(미지정)'}</option>${bldOpts(n.bld)}</select></label>`,inp('loc','전기실 / 설치 위치',n));
  h+='<div class="sec">전압 · 전원</div>';
  if(t==='TR'){
    h+=r2(inp('v1','1차 전압',n,{list:'dlV',ph:iv?'상위 따름 ('+iv+')':'예: 22.9kV',r:1}),inp('v2','2차 전압',n,{list:'dlV',ph:'예: 3.3kV',r:1}));
    h+=r2(inp('kva','용량 (kVA)',n),inp('conn','결선 (예: Δ-Y)',n));h+=r2(inp('pz','%Z',n),'<span></span>');
  }else h+=inp('volt','전압',n,{list:'dlV',ph:iv?'상위 따름 ('+iv+')':'예: 380V',r:1});
  const wl=wireList(n);
  if(wl.length&&!['IN','HV','TR'].includes(t)){const A=wl.slice();if(n.wire&&!A.includes(n.wire))A.push(n.wire);
    h+=`<label>결선<select data-f="wire"><option value="">(미지정)</option>${A.map(k=>`<option value="${k}"${k===n.wire?' selected':''}>${WIRES[k]?WIRES[k].l:k}${wl.includes(k)?'':' ⚠ 전압 불일치'}</option>`).join('')}</select></label>`;}
  h+=`<label>전원 구분<select data-f="src"><option value="">상위 따름 (${SRC[inSrc(n)]})</option><option value="N"${n.src==='N'?' selected':''}>상용</option><option value="E"${n.src==='E'?' selected':''}>비상</option></select></label>`;
  const showR=!['IN','TR','SS','GEN','PV','ESS'].includes(t),showK=['IN','GEN','UPS','LOAD','PV','ESS'].includes(t);
  if(showR||showK){h+='<div class="sec">사양</div>';
    if(showR){h+=r2(inp('rating','정격 (A)',n),inp('poles','극수',n));h+=inp('model','형식 / 모델',n);}
    if(showK)h+=inp('kw',t==='IN'?'계약전력 (kW)':'용량 (kW)',n);}
  if(typeof impForm==='function'&&!FP_SRC[t])h+=impForm(n);
  if(typeof fpForm==='function')h+=fpForm(n);
  h+=`<label>비고<textarea data-f="note" rows="2">${esc(n.note||'')}</textarea></label>`;
  h+=`<div class="act"><div class="ah">+ 하위 추가</div><div class="ln"><select id="aT">${tOpt(childType(n))}</select><input id="aN" type="number" min="1" max="50" value="1" title="개수"><button id="aGo" class="pri">추가</button></div></div>`;
  h+=`<div class="act"><div class="ah">↑ 위에 상위 추가</div><div class="ln"><select id="pT">${tOpt('TR')}</select><button id="pGo">끼워 넣기</button></div><div class="muted">지금 항목(하위 포함)이 새 항목 아래로 들어가요.</div></div>`;
  h+=`<div class="btns"><button id="bUp">▲ 위로</button><button id="bDn">▼ 아래로</button><button id="bDup">⧉ 하위 포함 복제</button></div><div class="muted">삭제·끌어서 옮기기는 트리의 [✎ 편집]에서 해요.${kids(n.id).length?' · 하위 '+kids(n.id).length+'개':''}</div>`;
  el.innerHTML=h;
}

/* ---------- 추가 · 이동 · 복제 ---------- */
function addKids(pid,type,cnt){
  cnt=Math.max(1,Math.min(50,parseInt(cnt)||1));const base=kids(pid).length;let last;
  for(let i=0;i<cnt;i++){const n=mkNode(type,pid);if(type==='CB'||type==='LOAD')n.no=String(base+i+1).padStart(2,'0');
    if(type!=='CB')n.name='새 '+TYPES[type].l+(cnt>1?' '+(i+1):'');S.nodes.push(n);last=n;}
  if(pid)UI.open.add(pid);if(cnt===1)UI.sel=last.id;save();saveUI();renderAll();toast(`${TYPES[type].l} ${cnt}개 추가했어요.`,false);
}
function addParent(id,type){
  const n=byId(id);if(!n)return;snap('상위 추가');
  const m=mkNode(type,n.pid);m.name='새 '+TYPES[type].l;if(type==='TR')m.v2=effV(n);
  S.nodes.splice(S.nodes.indexOf(n),0,m);n.pid=m.id;UI.open.add(m.id);UI.sel=m.id;
  save();saveUI();renderAll();toast(`"${label(n)}" 위에 ${TYPES[type].l}을(를) 넣었어요.`,true);
}
function moveSib(id,dir){
  const n=byId(id),sb=sibs(n),i=sb.indexOf(n),j=i+dir;if(j<0||j>=sb.length)return;
  const a=S.nodes.indexOf(n),b=S.nodes.indexOf(sb[j]);S.nodes[a]=sb[j];S.nodes[b]=n;save();renderAll();
}
function dupTree(id){
  const n=byId(id);if(!n)return;const list=[];
  const rec=(x,np)=>{const c=Object.assign({},x,{id:uid(),pid:np});['x','y','floor','lbd','zp','zx','zy'].forEach(k=>delete c[k]);list.push(c);kids(x.id).forEach(k=>rec(k,c.id));};
  rec(n,n.pid);if(list.length>1&&!confirm(`하위 포함 ${list.length}개를 복제할까요?`))return;
  snap('복제');list[0].name=(n.name||'')+' (복사)';S.nodes.push(...list);UI.sel=list[0].id;save();renderAll();toast(`${list.length}개 복제했어요.`,true);
}

/* ---------- 가운데 화면 ---------- */
function renderView(){
  if(!['dg','plan','zone','chk','map'].includes(UI.tab))UI.tab='sld'; // 전기 Flow = 수변전 단선도 (예전 손그림·동별 화면은 데이터만 보관)
  document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===UI.tab));
  $('#view').innerHTML=UI.tab==='dg'?viewDg():UI.tab==='plan'?plView():UI.tab==='zone'?zoneView():UI.tab==='chk'?chkView():UI.tab==='map'?mapView():sdView();
  if(UI.tab==='sld')sdAfter();
  if(UI.tab==='plan'&&typeof ZO!=='undefined'){const P=plParse(PL.cur);if(P&&P.z){UI.tab='zone';ZO.last=UI.sel;saveUI();renderView();}}   // 부하도면은 부하도면 탭에서
}
function viewFlow(){
  const c={};S.nodes.forEach(n=>c[n.type]=(c[n.type]||0)+1);
  const kp=TYPE_ORDER.filter(k=>c[k]).map(k=>`<div>${TYPES[k].l}<b>${c[k]}</b></div>`).join('')||'<div>항목<b>0</b></div>';
  const v={};S.nodes.forEach(n=>{const k=n.type==='TR'?(effV(n)||'?')+' → '+(n.v2||'?'):(effV(n)||'전압 미지정');v[k]=(v[k]||0)+1;});
  const vk=Object.entries(v).sort((a,b)=>pV(b[0])-pV(a[0])).map(([k,x])=>`<div>${esc(k)}<b>${x}</b></div>`).join('');
  return `<div class="ph"><h2>전기 Flow</h2><div class="muted" style="font-size:13px">3단계에서 천안공장 항공사진 위에 수전·TR·발전기 아이콘을 놓고 특고압(빨강)·고압(주황)·저압(파랑)·비상(빨강 점선) 라인을 그리는 화면이 여기에 들어와요.</div>
  <div class="sec">종류별 항목 수</div><div class="kp">${kp}</div><div class="sec">전압별 항목 수</div><div class="kp">${vk}</div></div>`;
}
function viewDg(){
  const n=byId(UI.sel);if(!n)return '<div class="empty">트리에서 항목을 고르세요.</div>';
  const host=pvHost(n),K=kids(host.id);if(pvCan(host)&&S.cfg.pvMode!=='list')return pvHtml(host);
  const rows=K.map(k=>{const T=TYPES[k.type]||{c:'#64748b'};return `<tr class="c${k.id===UI.sel?' sel':''}" data-id="${esc(k.id)}"><td>${esc(k.no||'')}</td><td><span class="ty" style="background:${T.c}">${esc(tlabel(k))}</span></td><td>${esc(k.name||'')}</td><td>${esc(spec(k))}</td><td>${esc(k.type==='TR'?(effV(k)||'?')+'/'+(k.v2||'?'):effV(k))}</td><td>${esc((WIRES[k.wire]||{}).l||'')}</td><td>${effSrc(k)==='E'?'<span class="em">비상</span>':''}</td><td>${esc([effBld(k),k.loc].filter(Boolean).join(' / '))}</td><td>${kids(k.id).length||''}</td></tr>`;}).join('');
  return `<div class="ph" style="max-width:none"><h2>${esc(label(host))}</h2><div class="muted">하위 ${K.length}개 ${pvCan(host)?`<button data-pvmode="pv" style="margin-left:6px;border:1px solid #c9cfe3;background:#fff;color:#262f7d;border-radius:6px;padding:2px 8px;cursor:pointer">▦ 분전반 외형으로 보기</button>`:''}</div>
  ${K.length?`<table class="tb" style="margin-top:10px"><thead><tr><th>번호</th><th>종류</th><th>명칭</th><th>사양</th><th>전압</th><th>결선</th><th>전원</th><th>동 / 위치</th><th>하위</th></tr></thead><tbody>${rows}</tbody></table>`:'<div class="empty">하위 항목이 없어요.</div>'}</div>`;
}
function viewPlan(){
  setTimeout(async()=>{let ks=[];try{ks=(await Store.img.keys())||[];}catch(e){}const e=$('#planInfo');if(e)e.textContent=ks.length+'장';});
  return `<div class="ph"><h2>위치 도면</h2><div class="muted" style="font-size:13px">2단계에서 기존 층 도면·부하도면·마커·아이콘·범위박스 기능을 그대로 옮겨 와요. 층 도면은 동별로 나눠요.</div>
  <div class="kp"><div>보관 중인 도면 이미지<b id="planInfo">…</b></div></div>${S.ext.legacy?'<div class="muted">기존 본동 백업의 도면·마커 정보를 보관하고 있어요.</div>':''}</div>`;
}

/* ---------- 이벤트 ---------- */
(function(){
  const F=$('#form');
  F.addEventListener('input',e=>{
    const f=e.target.dataset.f;if(!f||e.target.tagName==='SELECT')return;
    const n=byId(UI.sel);if(!n)return;n[f]=e.target.value;save();
    if(e.target.hasAttribute('data-r')){clearTimeout(_ts);_ts=setTimeout(renderAll,500);}else treeSoon();
  });
  F.addEventListener('change',e=>{
    const f=e.target.dataset.f;if(!f||e.target.tagName!=='SELECT')return;
    const n=byId(UI.sel);if(!n)return;const v=e.target.value;
    if(f==='type'&&n.type!==v){n.type=v;if(v==='CB'&&!n.cbk)n.cbk=pV(inV(n))>=1000?'VCB':'';}
    else n[f]=v;
    if(f==='wire'&&POLES[v]&&!n.poles)n.poles=POLES[v];
    save();renderAll();
  });
  F.addEventListener('click',e=>{
    const n=byId(UI.sel);const go=e.target.closest('[data-go]');
    if(go){select(go.dataset.go,true);return;}
    if(!n)return;const id=e.target.id;
    if(id==='aGo')addKids(n.id,$('#aT').value,$('#aN').value);
    else if(id==='pGo')addParent(n.id,$('#pT').value);
    else if(id==='bUp')moveSib(n.id,-1);
    else if(id==='bDn')moveSib(n.id,1);
    else if(id==='bDup')dupTree(n.id);
  });
  $('#tabs').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;UI.tab=b.dataset.t;saveUI();renderView();});
  $('#view').addEventListener('click',e=>{const r=e.target.closest('tr.c');if(r)select(r.dataset.id,true);});
  $('#bldBar').addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.id==='bBld'){const t=prompt('동 목록 (쉼표로 구분, 순서대로)',S.blds.join(', '));if(t==null)return;
      const L=t.split(',').map(s=>s.trim()).filter(Boolean);if(!L.length)return;S.blds=[...new Set(L)];save();renderAll();return;}
    setBld(b.dataset.b);
  });
  $('#bRoot').onclick=()=>{const t=$('#rootT').value;const n=mkNode(t,'');n.name='새 '+TYPES[t].l;
    if(t==='IN')n.volt='22.9kV';S.nodes.push(n);UI.sel=n.id;save();saveUI();renderAll();};
  $('#bImp').onclick=()=>$('#fImp').click();
  $('#fImp').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(f)await importFile(f);};
  $('#bExp').onclick=exportBackup;
  $('#bCsv').onclick=exportCSV;
  $('#bReset').onclick=async()=>{
    if(prompt('모든 데이터(트리·도면)를 지워요.\n백업을 받아 두셨나요? 지우려면 "초기화"라고 입력하세요.')!=='초기화')return;
    S=blank();UI.sel='';UI.open.clear();UNDO=null;try{await Store.img.clear();}catch(e){}save();saveUI();renderAll();};
  $('#logo').onclick=()=>$('#fLogo').click();
  $('#fLogo').onchange=e=>{const f=e.target.files[0];e.target.value='';if(!f)return;const r=new FileReader();
    r.onload=()=>{S.cfg.logo=r.result;save();renderLogo();};r.readAsDataURL(f);};
  $('#tUndo').onclick=undo;$('#tX').onclick=hideToast;
  window.addEventListener('keydown',e=>{if(e.key==='Escape'&&UI.edit){UI.edit=false;UI.chk.clear();renderTree();}});
})();

/* ---------- 시작 ---------- */
(async function init(){
  $('#dlV').innerHTML=VOLTS.map(v=>`<option value="${v}">`).join('');
  $('#rootT').innerHTML=TYPE_ORDER.map(k=>`<option value="${k}"${k==='IN'?' selected':''}>${TYPES[k].l}</option>`).join('');
  loadUI();
  try{const d=await Store.load();if(d&&Array.isArray(d.nodes))S=Object.assign(blank(),d);}catch(e){console.error(e);}
  fixData();if(UI.sel&&!byId(UI.sel))UI.sel='';
  if(!DB.db)setStatus('⚠ 브라우저 저장소를 못 열었어요 (용량 제한)',true);else setStatus('불러옴 · 항목 '+S.nodes.length+'개');
  renderAll();
})();
/* ===== 오른쪽 속성창 접기 시작 ===== */
(function(){
  var K='ckd_elec2_formHide',col=null,P=null,orig=null,btn=null;
  function find(){
    var f=$('#form'),v=$('#view');if(!f||!v)return false;
    col=f;while(col.parentElement&&!col.parentElement.contains(v))col=col.parentElement;
    P=col.parentElement;return !!P;
  }
  function isHide(){return localStorage.getItem(K)==='1';}
  function place(){
    if(!btn||!col)return;var h=isHide();
    btn.textContent=h?'◀ 속성':'▶';
    btn.title=h?'오른쪽 속성창 펼치기':'오른쪽 속성창 접기 (Flow 넓게 보기)';
    if(h){var pr=P.getBoundingClientRect();btn.style.left='';btn.style.right='0';btn.style.top=Math.max(4,pr.top+6)+'px';btn.style.borderRadius='8px 0 0 8px';}
    else{var r=col.getBoundingClientRect();btn.style.right='';btn.style.left=(r.left-22)+'px';btn.style.top=Math.max(4,r.top+6)+'px';btn.style.borderRadius='8px 0 0 8px';}
  }
  function apply(h){
    if(!col&&!find())return;
    var cs=getComputedStyle(P),grid=cs.display.indexOf('grid')>=0;
    if(h){
      if(grid){
        if(orig===null)orig=P.style.gridTemplateColumns;
        var cols=cs.gridTemplateColumns.split(' '),ch=[].slice.call(P.children).filter(function(x){return getComputedStyle(x).display!=='none'&&getComputedStyle(x).position!=='absolute'&&getComputedStyle(x).position!=='fixed';}),
            i=ch.indexOf(col),j=ch.findIndex(function(x){return x.contains($('#view'));});
        if(i>=0&&i<cols.length)cols[i]='0px';
        if(j>=0&&j<cols.length)cols[j]='minmax(0,1fr)';
        P.style.gridTemplateColumns=cols.join(' ');
      }
      col.style.display='none';
    }else{
      col.style.display='';
      if(grid&&orig!==null){P.style.gridTemplateColumns=orig;orig=null;}
    }
    setTimeout(function(){window.dispatchEvent(new Event('resize'));try{flRe();}catch(e){}place();},30);
  }
  function init(){
    if(!find())return;
    btn=document.createElement('button');
    btn.id='formTog';
    btn.style.cssText='position:fixed;z-index:50;height:34px;min-width:22px;padding:0 6px;border:1px solid #c9cfe3;border-right:none;background:#262f7d;color:#fff;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.15)';
    btn.onclick=function(){var h=!isHide();localStorage.setItem(K,h?'1':'0');apply(h);};
    document.body.appendChild(btn);
    if(isHide())apply(true);else place();
    window.addEventListener('resize',place);
    window.addEventListener('scroll',place,true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(init,300);});
  else setTimeout(init,300);
})();
/* ===== 오른쪽 속성창 접기 끝 ===== */
