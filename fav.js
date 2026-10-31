/* =========================================================
   fav.js v2 — 즐겨찾기 (트리와 분리 · 그룹 · 전압별 · CSV)
   ========================================================= */
const FV={mode:'tree',vf:'',lastG:'',edit:false,chk:new Set(),drag:'',need:false};
try{const o=JSON.parse(localStorage.getItem('ckd_elec2_fav')||'{}');FV.mode=o.mode==='fav'?'fav':'tree';FV.lastG=o.lastG||'';}catch(e){}
function favKeep(){try{localStorage.setItem('ckd_elec2_fav',JSON.stringify({mode:FV.mode,lastG:FV.lastG}));}catch(e){}}

/* ---------- 스타일 ---------- */
(function(){const s=document.createElement('style');s.textContent=`
#lTabs{display:flex;gap:4px;margin-bottom:8px}
#lTabs button{flex:1;padding:7px 6px;border:1px solid #d6dbe8;background:#fff;border-radius:8px;cursor:pointer;font-size:13px;color:#334155}
#lTabs button.on{background:#262f7d;color:#fff;border-color:#262f7d;font-weight:700}
#lTabs i{font-style:normal;font-size:11px;opacity:.85;margin-left:3px}
#favBox{flex-direction:column;flex:1;min-height:0;gap:6px}
.fv2Bar{display:flex;flex-wrap:wrap;gap:4px;align-items:center}
.fv2Bar button{padding:3px 8px;border:1px solid #d6dbe8;background:#fff;border-radius:6px;font-size:12px;cursor:pointer;color:#334155}
.fv2Bar button.on{background:#262f7d;color:#fff;border-color:#262f7d}
.fv2Bar .sp{flex:1}
.fv2Ed{display:flex;flex-wrap:wrap;gap:4px;align-items:center;background:#fff7d6;border:1px solid #f2d675;border-radius:6px;padding:4px 6px;font-size:12px}
.fv2Ed span{flex:1;color:#7a5a00}
.fv2Ed select,.fv2Ed button{font-size:12px;padding:2px 6px;border:1px solid #d6dbe8;border-radius:4px;background:#fff;cursor:pointer}
.fv2Ed .dng{color:#dc2626}
.fv2List{flex:1;min-height:0;overflow:auto;border-top:1px solid #eef0f5;padding-top:4px}
.fv2G{margin-bottom:2px;border-radius:6px}
.fv2G.ov{background:#eef2ff;outline:2px dashed #262f7d}
.fv2Gh{display:flex;align-items:center;gap:6px;padding:6px;cursor:pointer;border-radius:6px;font-size:13px;user-select:none}
.fv2Gh:hover{background:#f1f5f9}
.fv2Gh .ar{width:12px;color:#94a3b8;font-size:11px}
.fv2Gh i{font-style:normal;color:#94a3b8;font-size:12px}
.fv2Gh .vt{font-size:11px;color:#64748b;border:1px solid #e2e8f0;border-radius:4px;padding:0 4px}
.fv2Gh .vt.e{color:#dc2626;border-color:#fecaca}
.fv2Gh .sp{flex:1}
.fv2Gh button{padding:1px 6px;font-size:11px;border:1px solid #d6dbe8;background:#fff;border-radius:4px;cursor:pointer}
.fv2V{font-size:11px;color:#94a3b8;padding:4px 8px 2px 26px}
.fv2V.e{color:#dc2626}
.fv2R{display:flex;align-items:center;gap:6px;padding:4px 8px 4px 24px;cursor:pointer;border-radius:6px;font-size:13px;white-space:nowrap;user-select:none}
.fv2R:hover{background:#f5f7fb}
.fv2R.sel{background:#e8ebf7;box-shadow:inset 3px 0 0 #262f7d;font-weight:700}
.fv2R.ck{background:#fff7d6}
.fv2R .nm{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis}
.fv2R .rt{color:#64748b;font-size:11px;flex:none}
.fv2R .ty,.fv2R .cb{flex:none}
.fv2R .cb{color:#262f7d}
.fv2No{color:#94a3b8;font-size:12px;padding:4px 8px 6px 26px}
.fv2Empty{color:#94a3b8;font-size:12px;text-align:center;padding:30px 10px;line-height:1.8}
.fv2Fb{display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap}
.fv2Fb button{padding:5px 10px;border:1px solid #d6dbe8;background:#fff;border-radius:6px;cursor:pointer;font-size:12px;color:#334155}
.fv2Fb .fv2Add.on{background:#fff8e1;border-color:#f2c94c;color:#8a6100;font-weight:700}
#fv2Pop{position:fixed;z-index:9999;background:#fff;border:1px solid #d6dbe8;border-radius:8px;box-shadow:0 8px 24px rgba(15,23,42,.18);padding:6px;min-width:180px;max-height:60vh;overflow:auto;display:flex;flex-direction:column;gap:2px}
#fv2Pop .h{font-size:12px;color:#64748b;padding:2px 6px 4px}
#fv2Pop button{text-align:left;padding:6px 8px;border:0;background:none;border-radius:5px;cursor:pointer;font-size:13px}
#fv2Pop button:hover{background:#f1f5f9}
#fv2Pop button.on{background:#e8ebf7;font-weight:700}
#fv2Pop .nw{color:#262f7d;border-top:1px solid #eef0f5;margin-top:2px}
#fv2Pop .rm{color:#dc2626}
`;document.head.appendChild(s);})();

/* ---------- 데이터 ---------- */
function F(){
  const L=S.ext&&S.ext.legacy&&S.ext.legacy.fav;
  if(!S.fav||!Array.isArray(S.fav.groups))S.fav={groups:[],items:[]};
  if(!Array.isArray(S.fav.items))S.fav.items=[];
  if(L&&!S.cfg.favMig&&!S.fav.groups.length&&!S.fav.items.length){
    S.fav.groups=(L.groups||[]).map(g=>({id:String(g.id),name:String(g.name||'그룹'),open:g.open!==false}));
    S.fav.items=(L.items||[]).filter(i=>i&&i.id!=null).map(i=>({id:String(i.id),g:String(i.g||'')}));
    S.cfg.favMig=1;FV.need=true;}
  return S.fav;
}
function favFix(){const f=F(),ids=new Set(f.groups.map(g=>g.id)),bad=f.items.filter(i=>!ids.has(i.g));
  if(bad.length){if(!f.groups.length)f.groups.push({id:'g'+uid(),name:'기본',open:true});bad.forEach(i=>i.g=f.groups[0].id);}
  const seen=new Set();f.items=f.items.filter(i=>!seen.has(i.id)&&seen.add(i.id));}
const favItem=id=>F().items.find(i=>i.id===id);
const favGrp=gid=>F().groups.find(g=>g.id===gid);
function favAddG(nm){const g={id:'g'+uid(),name:nm,open:true};F().groups.push(g);return g.id;}
function favDone(){save();renderForm();renderFav();}

/* ---------- 전압 구분 ---------- */
function favVL(v){const x=pV(v);if(!x)return '';return x>=1000?(+(x/1000).toFixed(1))+'kV':x+'V';}
function favBk(n){return effSrc(n)==='E'?'E':(favVL(effV(n))||'?');}
function favCmp(a,b){const r=k=>k==='E'?-2:k==='?'?-1:pV(k);return r(b)-r(a);}
const favName=k=>k==='E'?'비상':k==='?'?'전압 미지정':k;

/* ---------- 다른 파일과 연결되는 자리 ---------- */
function favStar(){return '';}   /* 트리에는 별을 표시하지 않음 */
function favFormBtn(n){const it=favItem(n.id),g=it&&favGrp(it.g);
  return `<div class="fv2Fb"><button class="fv2Add${it?' on':''}" data-fvf="${esc(n.id)}" title="${it?'누르면 그룹 이동 · 빼기':'즐겨찾기 그룹에 추가'}">${it?'★ '+esc(g?g.name:'즐겨찾기'):'☆ 즐겨찾기 추가'}</button>${FV.mode==='fav'?`<button data-fvtree="${esc(n.id)}">🌲 트리에서 보기</button>`:''}</div>`;}

/* ---------- 추가 · 이동 · 빼기 ---------- */
function favAdd(id,gid){const f=F();f.items=f.items.filter(i=>i.id!==id);f.items.push({id,g:gid});
  FV.lastG=gid;favKeep();const g=favGrp(gid);if(g)g.open=true;favDone();
  toast(`★ "${label(byId(id)||{})}" → ${g?g.name:''}`,false);}
function favRemove(id){const f=F();f.items=f.items.filter(i=>i.id!==id);FV.chk.delete(id);favDone();
  toast(`"${label(byId(id)||{})}" 즐겨찾기에서 뺐어요.`,false);}
function favPop(){const p=$('#fv2Pop');if(p)p.remove();}
function favOpen(id,a){const f=F();
  if(!f.groups.length){const nm=(prompt('첫 즐겨찾기 그룹 이름을 정해 주세요 (예: 생산1팀)','기본')||'').trim();if(nm)favAdd(id,favAddG(nm));return;}
  const cur=favItem(id),r=a.getBoundingClientRect(),d=document.createElement('div');d.id='fv2Pop';d.dataset.id=id;
  const def=cur?cur.g:(f.groups.some(g=>g.id===FV.lastG)?FV.lastG:'');
  d.innerHTML=`<div class="h">${cur?'다른 그룹으로 옮기거나 빼기':'어느 그룹에 넣을까요?'}</div>`+
    f.groups.map(g=>`<button data-fpg="${esc(g.id)}"${g.id===def?' class="on"':''}>${cur&&g.id===cur.g?'✓ ':''}${esc(g.name)}</button>`).join('')+
    `<button data-fpg="+" class="nw">+ 새 그룹</button>`+(cur?`<button data-fpg="-" class="rm">☆ 즐겨찾기에서 빼기</button>`:'');
  document.body.appendChild(d);const w=d.offsetWidth,h=d.offsetHeight;
  d.style.left=Math.max(4,Math.min(r.left,innerWidth-w-4))+'px';
  d.style.top=(r.bottom+h+4>innerHeight?Math.max(4,r.top-h-4):r.bottom+4)+'px';}

/* ---------- 탭 전환 (트리 / 즐겨찾기 완전 분리) ---------- */
function favApplyMode(){const fav=FV.mode==='fav';
  const top=document.querySelector('#left .top'),eb=$('#editBar'),tr=$('#tree'),B=$('#favBox'),L=$('#left');
  if(top)top.style.display=fav?'none':'';
  if(tr)tr.style.display=fav?'none':'';
  if(eb)eb.style.display=fav?'none':'';
  if(B)B.style.display=fav?'flex':'none';
  if(L)L.classList.remove('favMode');
  document.querySelectorAll('#lTabs [data-lt]').forEach(b=>b.classList.toggle('on',b.dataset.lt===FV.mode));}

/* ---------- 즐겨찾기 화면 ---------- */
function favRow(n){const T=TYPES[n.type]||{c:'#64748b'},sp=spec(n),ck=FV.chk.has(n.id);
  return `<div class="fv2R${n.id===UI.sel?' sel':''}${ck?' ck':''}" data-fid="${esc(n.id)}"${FV.edit?' draggable="true"':''} title="${esc(pathOf(n).map(label).join(' › '))}\n(더블클릭: 트리에서 보기)">${FV.edit?`<span class="cb">${ck?'☑':'☐'}</span>`:''}<span class="ty" style="background:${T.c}">${esc(tlabel(n))}</span><span class="nm">${esc(label(n))}</span>${sp?`<span class="rt">${esc(sp)}</span>`:''}</div>`;}
function renderFav(){
  const f=F();if(FV.need){FV.need=false;favFix();save();}
  const live=f.items.filter(i=>byId(i.id)),c=$('#favCnt');if(c)c.textContent=live.length?String(live.length):'';
  favApplyMode();
  const B=$('#favBox');if(!B)return;
  if(FV.mode!=='fav'){B.innerHTML='';return;}
  const old=B.querySelector('.fv2List'),st=old?old.scrollTop:0;
  const cnt={};live.forEach(i=>{const k=favBk(byId(i.id));cnt[k]=(cnt[k]||0)+1;});
  const ks=Object.keys(cnt).sort(favCmp);if(FV.vf&&!cnt[FV.vf])FV.vf='';
  const anyOpen=f.groups.some(g=>g.open);
  let h=`<div class="fv2Bar"><button data-fvv=""${FV.vf?'':' class="on"'}>전체 ${live.length}</button>${ks.map(k=>`<button data-fvv="${esc(k)}"${FV.vf===k?' class="on"':''}>${favName(k)} ${cnt[k]}</button>`).join('')}</div>`;
  h+=`<div class="fv2Bar"><button data-fva="addG">+ 그룹</button><button data-fva="edit"${FV.edit?' class="on"':''}>${FV.edit?'✓ 편집 완료':'✎ 편집'}</button><button data-fva="fold">${anyOpen?'⊟ 모두 접기':'⊞ 모두 펼치기'}</button><span class="sp"></span><button data-fva="csvAll">⬇ 전체 CSV</button></div>`;
  if(FV.edit){const k=FV.chk.size;
    h+=`<div class="fv2Ed"><span>${k?k+'개 선택':'항목을 눌러 선택 · 끌어서 그룹 이동'}</span><select id="fv2Mv"${k?'':' disabled'}><option value="">그룹 이동…</option>${f.groups.map(g=>`<option value="${esc(g.id)}">${esc(g.name)}</option>`).join('')}</select><button data-fva="rm" class="dng"${k?'':' disabled'}>☆ 빼기</button></div>`;}
  h+='<div class="fv2List">';
  if(!f.groups.length)h+='<div class="fv2Empty">즐겨찾기가 없어요.<br>[계통 트리]에서 항목을 고르고<br>오른쪽 속성창 맨 위 <b>☆ 즐겨찾기 추가</b>를 누르세요.</div>';
  f.groups.forEach(g=>{
    const its=live.filter(i=>i.g===g.id).map(i=>byId(i.id)),sh=FV.vf?its.filter(n=>favBk(n)===FV.vf):its;
    if(FV.vf&&!sh.length)return;
    const by={};sh.forEach(n=>{const k=favBk(n);(by[k]=by[k]||[]).push(n);});const bk=Object.keys(by).sort(favCmp);
    const vt=bk.length===1?`<span class="vt${bk[0]==='E'?' e':''}">${favName(bk[0])}</span>`:'';
    h+=`<div class="fv2G" data-g="${esc(g.id)}"><div class="fv2Gh"${FV.edit?' draggable="true"':''}><span class="ar">${g.open?'▾':'▸'}</span><b>${esc(g.name)}</b><i>${FV.vf?sh.length+'/':''}${its.length}</i>${vt}${FV.edit?'<span class="sp"></span><button data-fva="csvG" title="이 그룹 CSV">CSV</button><button data-fva="renG" title="이름 변경">✎</button><button data-fva="delG" title="그룹 삭제">🗑</button>':''}</div>`;
    if(g.open){
      if(!sh.length)h+='<div class="fv2No">비어 있어요</div>';
      else bk.forEach(k=>{if(bk.length>1)h+=`<div class="fv2V${k==='E'?' e':''}">${favName(k)} · ${by[k].length}</div>`;h+=by[k].map(favRow).join('');});}
    h+='</div>';});
  h+='</div>';
  B.innerHTML=h;const nl=B.querySelector('.fv2List');if(nl)nl.scrollTop=st;
}

/* ---------- 버튼 ---------- */
function favAct(a,gid){const f=F(),g=favGrp(gid);
  if(a==='addG'){const nm=(prompt('새 그룹 이름 (예: 생산1팀, 1-1구역)')||'').trim();if(nm){favAddG(nm);save();renderFav();}return;}
  if(a==='edit'){FV.edit=!FV.edit;FV.chk.clear();return renderFav();}
  if(a==='fold'){const any=f.groups.some(x=>x.open);f.groups.forEach(x=>x.open=!any);save();return renderFav();}
  if(a==='csvAll')return favCSV(f.groups,'전체');
  if(a==='rm'){if(!FV.chk.size||!confirm(`${FV.chk.size}개를 즐겨찾기에서 뺄까요?\n(트리 항목은 그대로예요)`))return;
    f.items=f.items.filter(i=>!FV.chk.has(i.id));FV.chk.clear();return favDone();}
  if(!g)return;
  if(a==='csvG')return favCSV([g],g.name);
  if(a==='renG'){const nm=(prompt('그룹 이름',g.name)||'').trim();if(nm){g.name=nm;favDone();}return;}
  if(a==='delG'){const n=f.items.filter(i=>i.g===g.id).length;
    if(!confirm(`"${g.name}" 그룹을 지울까요?`+(n?`\n안에 있는 즐겨찾기 ${n}개도 같이 빠져요 (트리 항목은 그대로예요).`:'')))return;
    f.groups=f.groups.filter(x=>x!==g);f.items=f.items.filter(i=>i.g!==g.id);if(FV.lastG===g.id)FV.lastG='';favKeep();favDone();}
}

/* ---------- CSV (하위 포함, 계통 칸별) ---------- */
function favCSV(gs,nm){
  const rows=[];let maxD=1;
  gs.forEach(g=>F().items.filter(i=>i.g===g.id).forEach(i=>{const n=byId(i.id);if(!n)return;
    const add=(x,top)=>{const p=pathOf(x).map(label);maxD=Math.max(maxD,p.length);rows.push([g.name,top,x,p]);kids(x.id).forEach(k=>add(k,false));};add(n,true);}));
  if(!rows.length)return alert('내보낼 즐겨찾기가 없어요.');
  const C=[['종류',n=>(TYPES[n.type]||{}).l||n.type],['차단기 종류',n=>n.cbk||''],['번호',n=>n.no||''],['명칭',n=>n.name||''],['동',n=>effBld(n)],['설치 위치',n=>n.loc||''],
    ['전압',n=>n.type==='TR'?(effV(n)||'?')+'/'+(n.v2||'?'):effV(n)],['결선',n=>(WIRES[n.wire]||{}).l||''],['전원',n=>SRC[effSrc(n)]],
    ['정격(A)',n=>n.rating||''],['극수',n=>n.poles||''],['형식',n=>n.model||''],['kW',n=>n.kw||''],['비고',n=>n.note||'']];
  const q=v=>{v=String(v??'');return /[",\n\r]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;};
  const H=['그룹','구분','즐겨찾기','레벨'];for(let i=1;i<=maxD;i++)H.push('L'+i);
  const out=[H.concat(C.map(c=>c[0])).map(q).join(',')];
  rows.forEach(([g,top,n,p])=>{const k=favBk(n),L=[];for(let i=0;i<maxD;i++)L.push(p[i]||'');
    out.push([g,favName(k),top?'★':'하위',p.length].concat(L,C.map(c=>c[1](n))).map(q).join(','));});
  download(new Blob(['\ufeff'+out.join('\r\n')],{type:'text/csv'}),`즐겨찾기_${String(nm).replace(/[\\/:*?"<>|]/g,'_')}_${stamp()}.csv`);
}

/* ---------- 이벤트 ---------- */
(function(){
  /* 탭 */
  const LT=$('#lTabs');
  if(LT)LT.addEventListener('click',e=>{const b=e.target.closest('[data-lt]');if(!b)return;
    FV.mode=b.dataset.lt==='fav'?'fav':'tree';FV.edit=false;FV.chk.clear();favPop();favKeep();renderFav();renderForm();});

  /* 속성창 버튼 · 그룹 선택 창 */
  document.addEventListener('click',e=>{const t=e.target;if(!t.closest)return;
    const pop=$('#fv2Pop'),pg=t.closest('#fv2Pop [data-fpg]');
    if(pg){const id=pop.dataset.id;let g=pg.dataset.fpg;favPop();
      if(g==='-'){favRemove(id);return;}
      if(g==='+'){const nm=(prompt('새 그룹 이름 (예: 생산1팀)')||'').trim();if(!nm)return;g=favAddG(nm);}
      favAdd(id,g);return;}
    if(t.closest('#fv2Pop'))return;
    const b=t.closest('[data-fvf]');
    if(b){const same=pop&&pop.dataset.id===b.dataset.fvf;favPop();if(!same)favOpen(b.dataset.fvf,b);return;}
    if(pop)favPop();
    const go=t.closest('[data-fvtree]');
    if(go){FV.mode='tree';FV.edit=false;favKeep();select(go.dataset.fvtree,true);}
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape')favPop();});

  /* 즐겨찾기 목록 */
  const FB=$('#favBox');if(!FB)return;
  FB.addEventListener('click',e=>{const t=e.target;
    const v=t.closest('[data-fvv]');if(v){FV.vf=v.dataset.fvv;renderFav();return;}
    const a=t.closest('[data-fva]');if(a){const G=a.closest('.fv2G');favAct(a.dataset.fva,G?G.dataset.g:'');return;}
    const gh=t.closest('.fv2Gh');if(gh){const g=favGrp(gh.parentNode.dataset.g);if(g){g.open=!g.open;save();renderFav();}return;}
    const r=t.closest('[data-fid]');if(!r)return;const id=r.dataset.fid;
    if(FV.edit){FV.chk.has(id)?FV.chk.delete(id):FV.chk.add(id);renderFav();return;}
    if(byId(id))select(id,true);
  });
  FB.addEventListener('dblclick',e=>{if(FV.edit)return;const r=e.target.closest('[data-fid]');if(!r||!byId(r.dataset.fid))return;
    FV.mode='tree';favKeep();select(r.dataset.fid,true);});
  FB.addEventListener('change',e=>{if(e.target.id!=='fv2Mv'||!e.target.value)return;const gid=e.target.value,f=F();
    f.items.forEach(i=>{if(FV.chk.has(i.id))i.g=gid;});const G=favGrp(gid);if(G)G.open=true;FV.chk.clear();favDone();});

  /* 끌어서 옮기기 (편집 중에만) */
  const clr=()=>FB.querySelectorAll('.ov').forEach(x=>x.classList.remove('ov'));
  FB.addEventListener('dragstart',e=>{if(!FV.edit)return;const r=e.target.closest('[data-fid]'),gh=e.target.closest('.fv2Gh');
    FV.drag=r?'i:'+r.dataset.fid:gh?'g:'+gh.parentNode.dataset.g:'';if(!FV.drag)return;
    e.dataTransfer.effectAllowed='move';try{e.dataTransfer.setData('text/plain',FV.drag);}catch(_){}});
  FB.addEventListener('dragover',e=>{if(!FV.drag)return;const g=e.target.closest('.fv2G');clr();if(!g)return;e.preventDefault();g.classList.add('ov');});
  FB.addEventListener('drop',e=>{if(!FV.drag)return;const g=e.target.closest('.fv2G'),d=FV.drag;FV.drag='';clr();if(!g)return;e.preventDefault();
    const f=F(),gid=g.dataset.g;
    if(d.startsWith('i:')){const id=d.slice(2),ids=FV.chk.has(id)?[...FV.chk]:[id];f.items.forEach(i=>{if(ids.includes(i.id))i.g=gid;});
      const G=favGrp(gid);if(G)G.open=true;FV.chk.clear();}
    else{const a=f.groups.findIndex(x=>x.id===d.slice(2)),b=f.groups.findIndex(x=>x.id===gid);if(a<0||b<0||a===b)return renderFav();
      const [x]=f.groups.splice(a,1);f.groups.splice(b,0,x);}
    favDone();});
  FB.addEventListener('dragend',()=>{FV.drag='';clr();});
})();
favApplyMode();
