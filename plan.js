/* ===== 위치 도면 스타일 (plan.js 내장) 시작 ===== */
(function(){const s=document.createElement('style');s.id='plStyle';s.textContent=`
#view .plBar{display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin-bottom:6px}
#view .plBar button,#view .plEd button{padding:4px 9px;border:1px solid #d6dbe8;background:#fff;border-radius:6px;font-size:12px;cursor:pointer;color:#334155;display:inline-flex;align-items:center;gap:4px;line-height:1.3}
#view .plBar button.on,#view .plEd button.on{background:#262f7d;color:#fff;border-color:#262f7d}
#view .plBar .seg{display:inline-flex;gap:2px}
#view .plBar .sp{flex:1}
#view .plChk{display:inline-flex;align-items:center;gap:4px;font-size:12px;color:#475569}
#view .plChk input[type=range]{width:80px}
#view .plBar .dragOver{box-shadow:inset 3px 0 0 #262f7d}
#view .plCrumb{font-size:12px;color:#475569}
#view .plCrumb a{color:#262f7d;cursor:pointer;text-decoration:underline}
#view .plCrumb b{color:#262f7d}
#view .plEd{display:flex;flex-wrap:wrap;gap:6px;align-items:center;background:#fff7d6;border:1px solid #f2d675;border-radius:6px;padding:5px 6px;margin-bottom:6px;font-size:12px}
#view .plEd .gp{display:inline-flex;flex-wrap:wrap;gap:3px;align-items:center;padding-right:6px;border-right:1px solid #f2d675}
#view .plEd button svg{width:16px;height:16px}
#view .plEd .dng{color:#dc2626}
#view .plHint{background:#eef2ff;border:1px solid #c7d2fe;color:#1e3a8a;border-radius:6px;padding:5px 8px;font-size:12px;margin-bottom:6px}
#view .plBtn{padding:6px 12px;border:1px solid #262f7d;background:#262f7d;color:#fff;border-radius:6px;cursor:pointer}
#view #plW{overflow:auto;max-height:calc(100vh - 250px);border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc}
#view #plS{position:relative;min-width:200px;margin:0}
#view #plImg{display:block;width:100%!important;max-width:none!important;height:auto;user-select:none;-webkit-user-drag:none}
#view .plNo{padding:40px 10px;text-align:center;color:#94a3b8;font-size:13px}
#view #plS.ed .mk{cursor:move}
#view #plS.put,#view #plS.put *{cursor:crosshair!important}
#view #plS .mk{position:absolute;width:var(--mks,13px);height:var(--mks,13px);transform:translate(-50%,-50%);border-radius:50%;background:#2563eb;border:2px solid #fff;box-shadow:0 0 0 1px #1e3a8a,0 1px 3px rgba(0,0,0,.35);z-index:2;cursor:pointer;box-sizing:border-box;padding:0}
#view #plS .mk.sel{background:#dc2626;box-shadow:0 0 0 1px #7f1d1d,0 0 0 5px rgba(220,38,38,.25);z-index:6}
#view #plS .mk.dim{opacity:.3}
#view #plS .mk .lb{position:absolute;left:50%;bottom:calc(100% + 7px);transform:translateX(-50%);white-space:nowrap;background:rgba(255,255,255,.92);border:1px solid #94a3b8;border-radius:4px;padding:1px 5px;font-size:11px;font-weight:600;color:#0f172a;pointer-events:none;line-height:1.4}
#view #plS .mk .lb::after{content:'';position:absolute;left:50%;top:100%;transform:translateX(-50%);border:5px solid transparent;border-top-color:#94a3b8}
#view #plS .mk .lb-d{top:calc(100% + 7px);bottom:auto}
#view #plS .mk .lb-d::after{top:auto;bottom:100%;border-top-color:transparent;border-bottom-color:#94a3b8}
#view #plS .mk .lb-l{right:calc(100% + 7px);left:auto;top:50%;bottom:auto;transform:translateY(-50%)}
#view #plS .mk .lb-l::after{left:100%;top:50%;transform:translateY(-50%);border-top-color:transparent;border-left-color:#94a3b8}
#view #plS .mk .lb-r{left:calc(100% + 7px);top:50%;bottom:auto;transform:translateY(-50%)}
#view #plS .mk .lb-r::after{left:auto;right:100%;top:50%;transform:translateY(-50%);border-top-color:transparent;border-right-color:#94a3b8}
#view #plS .mk.sel .lb{background:#262f7d;color:#fff;border-color:#262f7d;font-weight:700}
#view #plS .mk.sel .lb-u::after{border-top-color:#262f7d}
#view #plS .mk.sel .lb-d::after{border-bottom-color:#262f7d}
#view #plS .mk.sel .lb-l::after{border-left-color:#262f7d}
#view #plS .mk.sel .lb-r::after{border-right-color:#262f7d}
#view #plS .ic{position:absolute;width:calc(var(--mks,13px) + 6px);height:calc(var(--mks,13px) + 6px);transform:translate(-50%,-50%);z-index:3;cursor:pointer}
#view #plS .ic svg{width:100%;height:100%;display:block}
#view #plS .ic.hot{filter:drop-shadow(0 0 3px #dc2626)}
#view #plS .ic.sel{outline:2px solid #262f7d;outline-offset:1px;border-radius:3px}
#view #plS .ic.dim{opacity:.25}
#view #plS .bx{position:absolute;background:rgba(250,204,21,.22);border:2px dashed #ca8a04;z-index:1;box-sizing:border-box}
#view #plS .bx.hot{background:rgba(250,204,21,.38);border-color:#dc2626}
#view #plS .bx.sel{border-color:#262f7d;border-style:solid}
#view #plS .bx.dim{opacity:.3}
#view #plS .bx .rz{position:absolute;right:-5px;bottom:-5px;width:10px;height:10px;background:#262f7d;border:1px solid #fff;cursor:nwse-resize}
`;document.head.appendChild(s);})();
/* ===== 위치 도면 스타일 (plan.js 내장) 끝 ===== */
/* =========================================================
   plan.js — 위치 도면 (층 도면 = 분전반 위치 / 부하도면 = 부하 위치)
   ========================================================= */
const PL_IC={
 light:{l:'전등',s:'<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="7" fill="#fef9c3" stroke="#a16207" stroke-width="1.6"/><path d="M5 5L15 15M15 5L5 15" stroke="#a16207" stroke-width="1.6"/></svg>'},
 out:{l:'콘센트',s:'<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="7" fill="#fff" stroke="#1e3a8a" stroke-width="1.6"/><path d="M7.5 7v6M12.5 7v6" stroke="#1e3a8a" stroke-width="1.8"/></svg>'},
 ex:{l:'방폭콘센트',s:'<svg viewBox="0 0 20 20"><path d="M10 2L18 17H2Z" fill="#ffedd5" stroke="#c2410c" stroke-width="1.5"/><text x="10" y="15" text-anchor="middle" font-size="6.5" font-weight="bold" fill="#c2410c">Ex</text></svg>'},
 eq:{l:'설비(직결)',s:'<svg viewBox="0 0 20 20"><rect x="3" y="3" width="14" height="14" rx="2" fill="#dcfce7" stroke="#15803d" stroke-width="1.6"/><text x="10" y="14" text-anchor="middle" font-size="9" font-weight="bold" fill="#15803d">M</text></svg>'},
 inv:{l:'INV PNL',s:'<svg viewBox="0 0 20 20"><rect x="1.5" y="4" width="17" height="12" rx="2" fill="#ede9fe" stroke="#6d28d9" stroke-width="1.5"/><text x="10" y="12.8" text-anchor="middle" font-size="6" font-weight="bold" fill="#6d28d9">INV</text></svg>'}
};
const PL={cur:'',z:1,edit:false,tool:'',place:null,lastSel:null,keep:false,img:{},selIc:'',vf:'',mig:false,drag:''};
try{const o=JSON.parse(localStorage.getItem('ckd_elec2_plan')||'{}');PL.cur=o.cur||'';PL.z=o.z||1;}catch(e){}
function plKeep(){try{localStorage.setItem('ckd_elec2_plan',JSON.stringify({cur:PL.cur,z:PL.z}));}catch(e){}}
const r2d=v=>Math.round(v*100)/100;
const PL_P=t=>t==='PNL'||t==='UPS'||t==='MDB'||t==='MCC';
const plFK=f=>'F|'+f,plZK=(id,s)=>'Z|'+id+'|'+s;
function plParse(k){const a=String(k||'').split('|');return a[0]==='Z'?{z:1,id:a[1],s:+a[2]||1}:a[0]==='F'?{f:a.slice(1).join('|')}:null;}
const plOnF=n=>n.floor&&n.x!==''&&n.x!=null;
const plVF=n=>!PL.vf||(PL.vf==='E'?effSrc(n)==='E':pV(effV(n))===+PL.vf);
function plDesc(id,out){kids(id).forEach(k=>{out.push(k);plDesc(k.id,out);});return out;}
function plFloors(){return S.floors.filter(f=>!UI.bld||!f.bld||f.bld===UI.bld);}

/* ---------- 기존 데이터 · 이미지 옮기기 ---------- */
function plInit(){
  if(!Array.isArray(S.floors)){const L=(S.ext&&S.ext.legacy)||{};
    S.floors=(L.floors||[]).map(f=>({name:String(f),bld:(S.blds||[]).find(b=>String(f).startsWith(b))||''}));
    S.zones={};(L.zones||[]).forEach(id=>S.zones[id]=1);
    S.icons=Array.isArray(L.icons)?L.icons:[];
    if(!S.cfg.mks){const m=parseInt(localStorage.getItem('ckd_mks'));if(m)S.cfg.mks=m;}
    save();}
  if(!S.zones)S.zones={};if(!Array.isArray(S.icons))S.icons=[];
  if(S.ext&&S.ext.legacy&&!S.cfg.imgMig&&!PL.mig){PL.mig=true;plMigImg();}
}
function plMigImg(){
  let q;try{q=indexedDB.open('ckd_cheonan_elec_img');}catch(e){return;}
  q.onerror=()=>{};
  q.onsuccess=()=>{const db=q.result;
    if(!db.objectStoreNames.contains('img')){db.close();S.cfg.imgMig=1;save();return;}
    const t=db.transaction('img'),s=t.objectStore('img'),rk=s.getAllKeys(),rv=s.getAll();
    t.oncomplete=async()=>{db.close();let n=0;
      for(let i=0;i<rk.result.length;i++){const k=String(rk.result[i]);let v=rv.result[i];
        if(v&&typeof v==='object'&&!(v instanceof Blob))v=v.data||v.src||v.url||v.img||'';
        if(v instanceof Blob)v=await new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result);f.readAsDataURL(v);});
        if(typeof v!=='string'||!v.startsWith('data:'))continue;
        const m=k.match(/^@([^#|:_-]+)(?:[#|:_-](\d))?$/);let nk;
        if(m){const sh=Math.min(3,+(m[2]||1));nk=plZK(m[1],sh);S.zones[m[1]]=Math.max(S.zones[m[1]]||1,sh);}
        else{nk=plFK(k);if(!S.floors.some(f=>f.name===k))S.floors.push({name:k,bld:S.blds.find(b=>k.startsWith(b))||''});}
        try{await Store.img.put(nk,v);PL.img[nk]=v;n++;}catch(e){}}
      S.cfg.imgMig=1;save();if(n)toast(`기존 도면 이미지 ${n}장을 가져왔어요.`,false);if(UI.tab==='plan')renderView();};
  };
}

/* ---------- 어느 도면을 열지 ---------- */
function plFloorOf(n){let c=n,g=0;while(c&&g++<80){if(plOnF(c)&&S.floors.some(f=>f.name===c.floor))return plFK(c.floor);c=par(c);}return '';}
function plHost(n){let c=par(n),first=null,g=0;while(c&&g++<80){if(S.zones[c.id])return c;if(!first&&PL_P(c.type))first=c;c=par(c);}return first;}
function plTarget(n){if(!n)return '';
  if(plOnF(n)&&S.floors.some(f=>f.name===n.floor))return plFK(n.floor);
  if(PL_P(n.type))return plFloorOf(n);
  if(n.type==='LOAD'||n.type==='CB'){const H=plHost(n);if(H){if(n.zp&&n.zp.split('|')[0]===H.id)return 'Z|'+n.zp;const c=plParse(PL.cur);return plZK(H.id,c&&c.z&&c.id===H.id?c.s:1);}}
  return plFloorOf(n);}
function plFocus(H){const s=byId(UI.sel);if(!s||s.id===H.id||!isAnc(H,s))return null;const p=pathOf(s),i=p.findIndex(x=>x.id===H.id);
  for(let j=i+1;j<p.length;j++)if(PL_P(p[j].type))return p[j];return null;}
function plIcNid(P){const s=byId(UI.sel),H=byId(P.id);return s&&H&&s.id!==H.id&&isAnc(H,s)?s.id:'';}
function plCrumb(H){const s=byId(UI.sel),foc=(s&&isAnc(H,s))?s:H,fp=plParse(plFloorOf(H)),a=[];
  if(fp)a.push(`<a data-plf="${esc(fp.f)}">${esc(fp.f)}</a>`);
  pathOf(foc).filter(x=>PL_P(x.type)||x.id===H.id).forEach(x=>a.push(x.id===H.id?`<b>${esc(label(x))}</b>`:S.zones[x.id]?`<a data-plz="${esc(x.id)}">${esc(label(x))}</a>`:`<span>${esc(label(x))}</span>`));
  return '📍 '+a.join(' › ');}

/* ---------- 그리기 ---------- */
function plMk(n,x,y,dim){const sel=n.id===UI.sel,d=n.lbd||'u';
  return `<div class="mk${sel?' sel':''}${dim?' dim':''}" data-id="${esc(n.id)}" style="left:${x}%;top:${y}%" title="${esc(label(n))}">${S.cfg.lbl===false&&!sel?'':`<span class="lb lb-${d}">${esc(n.name||label(n))}</span>`}</div>`;}
function plIc(i,dim){const c=`${i.nid&&i.nid===UI.sel?' hot':''}${dim?' dim':''}${i.id===PL.selIc?' sel':''}`,nn=i.nid&&byId(i.nid);
  if(i.t==='box')return `<div class="bx${c}" data-ic="${i.id}" style="left:${i.x}%;top:${i.y}%;width:${i.w}%;height:${i.h}%" title="범위${nn?' · '+esc(label(nn)):''}">${PL.edit?'<i class="rz"></i>':''}</div>`;
  return `<div class="ic${c}" data-ic="${i.id}" style="left:${i.x}%;top:${i.y}%" title="${esc((PL_IC[i.t]||{}).l||'')}${nn?' · '+esc(label(nn)):''}">${(PL_IC[i.t]||PL_IC.eq).s}</div>`;}
async function plLoadImg(k){const im=$('#plImg'),no=$('#plNo');if(!im)return;let u=PL.img[k];
  if(u===undefined){try{u=await Store.img.get(k);}catch(e){}PL.img[k]=u||'';}
  if($('#plImg')!==im)return;
  if(u){im.src=u;if(no)no.remove();}else if(no)no.innerHTML='도면 이미지가 없어요. <button class="plBtn" data-pla="img">🖼 이미지 올리기</button>';}

function plView(){
  plInit();
  if(PL.keep){PL.keep=false;PL.lastSel=UI.sel;}
  else if(UI.sel!==PL.lastSel){PL.lastSel=UI.sel;const t=plTarget(byId(UI.sel));if(t&&t!==PL.cur){PL.cur=t;PL.place=null;PL.tool='';PL.selIc='';}}
  const FL=plFloors();let P=plParse(PL.cur);
  if(P&&P.f&&!FL.some(f=>f.name===P.f))P=null;
  if(P&&P.z&&!byId(P.id))P=null;
  if(!P){PL.cur=FL.length?plFK(FL[0].name):'';P=plParse(PL.cur);}
  if(P&&P.z){const c=S.zones[P.id]||0;if(c&&P.s>c){P.s=1;PL.cur=plZK(P.id,1);}}
  plKeep();
  const H=P&&P.z?byId(P.id):null,zc=H?(S.zones[H.id]||0):0,sel=byId(UI.sel);
  let h=`<div class="ph" style="max-width:none"><div class="plBar">`+FL.map(f=>`<button draggable="true" data-plf="${esc(f.name)}"${P&&P.f===f.name?' class="on"':''} title="끌어서 순서 변경">${esc(f.name)}</button>`).join('')+`<button data-pla="addF">+ 층 도면</button>`;
  if(P&&P.f){h+=`<span class="seg">`+[['','전체'],['380','380V'],['220','220V'],['440','440V'],['E','비상']].map(([v,t])=>`<button data-plv="${v}"${PL.vf===v?' class="on"':''}>${t}</button>`).join('')+`</span>`;
    if(sel&&PL_P(sel.type))h+=`<button data-plz="${esc(sel.id)}">📄 ${esc(sel.name||label(sel))} 부하도면 ›</button>`;}
  h+=`<span class="sp"></span><label class="plChk"><input type="checkbox" data-pla="lbl"${S.cfg.lbl===false?'':' checked'}> 이름표</label><label class="plChk">마커 <input type="range" min="6" max="28" value="${S.cfg.mks||13}" data-pla="mks"></label>`+
    `<span class="seg"><button data-pla="zo">－</button><button data-pla="z1">${Math.round(PL.z*100)}%</button><button data-pla="zi">＋</button></span><button data-pla="edit"${PL.edit?' class="on"':''}>✎ 배치 편집</button></div>`;
  if(H){let sh='';for(let i=1;i<=zc;i++)sh+=`<button data-pls="${i}"${i===P.s?' class="on"':''}>도면 ${i}</button>`;if(zc&&zc<3)sh+=`<button data-pla="addS">+ 도면 추가</button>`;
    h+=`<div class="plBar"><span class="plCrumb">${plCrumb(H)}</span><span class="sp"></span>${sh}</div>`;}
  if(PL.edit&&P&&(!H||zc)){
    const hasM=sel&&(P.f?(sel.floor===P.f&&plOnF(sel)):sel.zp===P.id+'|'+P.s);
    h+=`<div class="plEd"><span class="gp"><button data-pla="put">📍 선택 항목 배치</button><button data-pla="seq">⋯ 연속 배치</button>${hasM?`<button data-pla="unput">마커 지우기</button> 이름표 ${['u','d','l','r'].map((d,i)=>`<button data-lbd="${d}"${(sel.lbd||'u')===d?' class="on"':''}>${'↑↓←→'[i]}</button>`).join('')}`:''}</span>`;
    if(H)h+=`<span class="gp">${Object.entries(PL_IC).map(([k,v])=>`<button data-plt="${k}"${PL.tool===k?' class="on"':''}>${v.s} ${v.l}</button>`).join('')}<button data-plt="box"${PL.tool==='box'?' class="on"':''}>▭ 범위</button>${PL.selIc?'<button data-pla="delIc" class="dng">선택 아이콘 삭제</button>':''}</span>`;
    h+=(P.f?`<button data-pla="img">🖼 도면 이미지 교체</button><button data-pla="renF">✎ 층 이름 변경</button><button data-pla="bldF">🏢 동 지정</button><button data-pla="delF" class="dng">🗑 층 도면 삭제</button>`:`<button data-pla="img">🖼 이미지 교체</button><button data-pla="delS" class="dng">🗑 이 장 삭제</button>`)+'</div>';}
  if(PL.place){const n=byId(PL.place.ids[0]);h+=`<div class="plHint">📍 도면을 클릭해 <b>${esc(n?label(n):'')}</b> 위치를 찍으세요 · 남은 ${PL.place.ids.length}개 · Esc 종료</div>`;}
  else if(PL.tool&&H){const n=byId(plIcNid(P));h+=`<div class="plHint">${PL.tool==='box'?'▭ 도면에서 끌어서 범위를 그리세요':'도면을 클릭할 때마다 <b>'+PL_IC[PL.tool].l+'</b> 추가'} · 연결 회로: <b>${n?esc(label(n)):'없음 (트리에서 회로를 먼저 고르면 연결돼요)'}</b> · Esc 종료</div>`;}
  if(!P)h+=`<div class="empty">아직 층 도면이 없어요. 위쪽 <b>[+ 층 도면]</b>으로 층 도면 이미지를 올려 주세요.${UI.bld?'<br>(지금은 '+esc(UI.bld)+'만 보고 있어요)':''}</div>`;
  else if(H&&!zc)h+=`<div class="empty"><b>${esc(label(H))}</b>의 부하도면이 아직 없어요.<br><br><button class="plBtn" data-pla="mkZ">📄 부하도면 만들기</button></div>`;
  else{const key=P.f?plFK(P.f):plZK(P.id,P.s),zk=H?P.id+'|'+P.s:'',foc=H?plFocus(H):null,dimOf=n=>!!(foc&&(!n||!isAnc(foc,n)));let m='';
    if(P.f)S.nodes.forEach(n=>{if(n.floor===P.f&&plOnF(n)&&plVF(n))m+=plMk(n,n.x,n.y,false);});
    else{S.icons.forEach(i=>{if(i.z===zk)m+=plIc(i,i.nid?dimOf(byId(i.nid)):!!foc);});S.nodes.forEach(n=>{if(n.zp===zk)m+=plMk(n,n.zx,n.zy,dimOf(n));});}
    h+=`<div id="plW"><div id="plS" class="${PL.edit?'ed':''}${PL.place||PL.tool?' put':''}" style="width:${PL.z*100}%;--mks:${S.cfg.mks||13}px"><img id="plImg" alt="" draggable="false"><div id="plNo" class="plNo">도면 이미지를 불러오는 중…</div>${m}</div></div>`;
    setTimeout(()=>plLoadImg(key));}
  return h+'</div>';
}

/* ---------- 이미지 올리기 ---------- */
function plPickImg(k){const f=document.createElement('input');f.type='file';f.accept='image/*';f.onchange=()=>{const x=f.files[0];if(x)plSetImg(k,x);};f.click();}
function plSetImg(k,file){const r=new FileReader();r.onload=()=>{const im=new Image();
  im.onload=async()=>{const sc=Math.min(1,2400/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.round(im.width*sc);c.height=Math.round(im.height*sc);
    const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.drawImage(im,0,0,c.width,c.height);const u=c.toDataURL('image/jpeg',.85);
    try{await Store.img.put(k,u);PL.img[k]=u;toast('도면 이미지를 저장했어요.',false);}catch(e){alert('이미지 저장 실패: '+e.message);}renderView();};
  im.onerror=()=>alert('이미지를 읽지 못했어요. JPG나 PNG로 바꿔서 올려 주세요.');im.src=r.result;};r.readAsDataURL(file);}

/* ---------- 버튼 동작 ---------- */
function plDelIc(){const i=S.icons.findIndex(x=>x.id===PL.selIc);if(i<0)return;S.icons.splice(i,1);PL.selIc='';save();renderView();}
function plPutAt(p){const P=plParse(PL.cur),n=byId(PL.place.ids.shift());
  if(n){if(P.f){n.floor=P.f;n.x=r2d(p.x);n.y=r2d(p.y);}else{n.zp=P.id+'|'+P.s;n.zx=r2d(p.x);n.zy=r2d(p.y);}save();}
  if(!PL.place.ids.length)PL.place=null;renderView();}
function plAct(a,P,sel){
  const H=P&&P.z?byId(P.id):null,go=()=>{plKeep();renderView();};
  if(a==='zi'||a==='zo'||a==='z1'){PL.z=a==='z1'?1:Math.max(.5,Math.min(6,PL.z*(a==='zi'?1.25:.8)));return go();}
  if(a==='edit'){PL.edit=!PL.edit;PL.place=null;PL.tool='';PL.selIc='';return go();}
  if(a==='addF'){const nm=(prompt('새 층 도면 이름 (예: 본동 4층, 유틸리티동 1층)',UI.bld?UI.bld+' ':'')||'').trim();if(!nm)return;
    if(S.floors.some(f=>f.name===nm))return alert('같은 이름의 층 도면이 이미 있어요.');
    S.floors.push({name:nm,bld:UI.bld||S.blds.find(b=>nm.startsWith(b))||''});PL.cur=plFK(nm);PL.keep=true;save();go();return plPickImg(plFK(nm));}
  if(!P)return;
  const curKey=P.f?plFK(P.f):plZK(P.id,P.s);
  if(a==='img')return plPickImg(curKey);
  if(a==='put'){if(!sel)return alert('트리에서 배치할 항목을 먼저 고르세요.');PL.place={ids:[sel.id]};PL.tool='';return go();}
  if(a==='seq'){let L;
    if(P.f){if(!sel)return alert('트리에서 시작할 항목(예: 303A 배전반)을 고르세요.');
      const ok=n=>PL_P(n.type)||(n.type==='CB'&&par(n)&&['SS','MDB','HV','ATS','TR'].includes(par(n).type));
      L=[sel].concat(plDesc(sel.id,[])).filter(n=>ok(n)&&!plOnF(n));}
    else L=plDesc(H.id,[]).filter(n=>(n.type==='LOAD'||(n.type==='CB'&&!kids(n.id).length))&&!n.zp&&plHost(n)===H);
    if(!L.length)return toast('배치할 항목이 없어요 (이미 다 찍혀 있어요).',false);
    PL.place={ids:L.map(n=>n.id)};PL.tool='';return go();}
  if(a==='unput'){if(!sel)return;if(P.f){if(sel.floor===P.f){sel.floor='';sel.x='';sel.y='';}}else{delete sel.zp;delete sel.zx;delete sel.zy;}save();return go();}
  if(a==='delIc')return plDelIc();
  if(a==='mkZ'){S.zones[P.id]=1;PL.cur=plZK(P.id,1);PL.keep=true;save();go();return plPickImg(PL.cur);}
  if(a==='addS'){const c=S.zones[P.id]||0;if(c>=3)return alert('부하도면은 3장까지예요.');S.zones[P.id]=c+1;PL.cur=plZK(P.id,c+1);PL.keep=true;save();go();return plPickImg(PL.cur);}
  if(a==='delS'){const c=S.zones[P.id]||0,s=P.s,zk=P.id+'|'+s,ni=S.icons.filter(i=>i.z===zk).length,nm=S.nodes.filter(n=>n.zp===zk).length;
    if(!confirm(`도면 ${s}을(를) 삭제할까요?\n이 장의 아이콘·범위 ${ni}개, 부하 마커 ${nm}개도 같이 지워져요.`))return;
    S.icons=S.icons.filter(i=>i.z!==zk);S.nodes.forEach(n=>{if(n.zp===zk){delete n.zp;delete n.zx;delete n.zy;}});
    (async()=>{try{for(let k=s;k<c;k++){const nk=plZK(P.id,k),ok=plZK(P.id,k+1),u=await Store.img.get(ok);
        if(u)await Store.img.put(nk,u);else await Store.img.del(nk);PL.img[nk]=u||'';
        const A=P.id+'|'+(k+1),B=P.id+'|'+k;S.icons.forEach(i=>{if(i.z===A)i.z=B;});S.nodes.forEach(n=>{if(n.zp===A)n.zp=B;});}
      await Store.img.del(plZK(P.id,c));}catch(e){}delete PL.img[plZK(P.id,c)];
      if(c<=1){delete S.zones[P.id];PL.cur=plFloorOf(H);}else{S.zones[P.id]=c-1;PL.cur=plZK(P.id,Math.min(s,c-1));}
      PL.keep=true;save();go();})();return;}
  if(a==='renF'){const old=P.f,nm=(prompt('층 도면 이름',old)||'').trim();if(!nm||nm===old)return;if(S.floors.some(f=>f.name===nm))return alert('같은 이름이 이미 있어요.');
    S.floors.find(f=>f.name===old).name=nm;S.nodes.forEach(n=>{if(n.floor===old)n.floor=nm;});
    (async()=>{try{const u=await Store.img.get(plFK(old));if(u){await Store.img.put(plFK(nm),u);await Store.img.del(plFK(old));PL.img[plFK(nm)]=u;}}catch(e){}
      delete PL.img[plFK(old)];PL.cur=plFK(nm);PL.keep=true;save();go();})();return;}
  if(a==='bldF'){const f=S.floors.find(x=>x.name===P.f),v=prompt('이 층 도면이 속한 동을 입력하세요.\n('+S.blds.join(', ')+')',f.bld||'');if(v==null)return;f.bld=v.trim();save();return renderAll();}
  if(a==='delF'){const nm=P.f,cnt=S.nodes.filter(n=>n.floor===nm&&plOnF(n)).length;
    if(prompt(`"${nm}" 층 도면을 삭제해요.\n찍혀 있는 마커 ${cnt}개도 같이 지워져요 (트리 항목은 그대로예요).\n지우려면 "삭제"라고 입력하세요.`)!=='삭제')return;
    S.floors=S.floors.filter(f=>f.name!==nm);S.nodes.forEach(n=>{if(n.floor===nm){n.floor='';n.x='';n.y='';}});
    Store.img.del(plFK(nm)).catch(()=>{});delete PL.img[plFK(nm)];PL.cur='';save();return go();}
}

/* ---------- 클릭 ---------- */
document.addEventListener('click',e=>{const t=e.target;if(!t.closest||UI.tab!=='plan'||!t.closest('#view'))return;
  const P=plParse(PL.cur),sel=byId(UI.sel),go=()=>{plKeep();renderView();};let b;
  if(b=t.closest('[data-plf]')){PL.cur=plFK(b.dataset.plf);PL.place=null;PL.tool='';PL.keep=true;return go();}
  if(b=t.closest('[data-plz]')){PL.cur=plZK(b.dataset.plz,1);PL.place=null;PL.tool='';PL.keep=true;return go();}
  if(b=t.closest('[data-pls]')){PL.cur=plZK(P.id,+b.dataset.pls);PL.selIc='';PL.keep=true;return go();}
  if(b=t.closest('[data-plv]')){PL.vf=b.dataset.plv;return go();}
  if(b=t.closest('[data-plt]')){const k=b.dataset.plt;PL.tool=PL.tool===k?'':k;PL.place=null;return go();}
  if(b=t.closest('[data-lbd]')){if(sel){if(b.dataset.lbd==='u')delete sel.lbd;else sel.lbd=b.dataset.lbd;save();}return go();}
  if(b=t.closest('[data-pla]')){if(b.tagName!=='INPUT')plAct(b.dataset.pla,P,sel);return;}
  if(PL.edit||PL.place||PL.tool)return;
  const m=t.closest('#plS .mk'),ic=t.closest('#plS [data-ic]');
  if(m){const n=byId(m.dataset.id);if(!n)return;
    if(e.detail>=2&&P&&P.f&&PL_P(n.type)){PL.cur=plZK(n.id,1);PL.keep=true;if(UI.sel!==n.id)select(n.id,true);else go();return;}
    if(UI.sel!==n.id){PL.keep=true;select(n.id,true);}return;}
  if(ic){const i=S.icons.find(x=>x.id===ic.dataset.ic);if(i&&i.nid&&byId(i.nid)&&UI.sel!==i.nid){PL.keep=true;select(i.nid,true);}}
});
document.addEventListener('change',e=>{if(e.target.dataset&&e.target.dataset.pla==='lbl'){S.cfg.lbl=e.target.checked;save();renderView();}});
document.addEventListener('input',e=>{if(e.target.dataset&&e.target.dataset.pla==='mks'){S.cfg.mks=+e.target.value;const s=$('#plS');if(s)s.style.setProperty('--mks',S.cfg.mks+'px');save();}});

/* ---------- 찍기 · 끌기 ---------- */
let PD=null;
function plPos(e){const r=$('#plS').getBoundingClientRect();return {x:Math.max(0,Math.min(100,(e.clientX-r.left)/r.width*100)),y:Math.max(0,Math.min(100,(e.clientY-r.top)/r.height*100))};}
document.addEventListener('pointerdown',e=>{
  const st=e.target.closest&&e.target.closest('#plS');if(!st||e.button!==0||e.target.closest('button'))return;
  const P=plParse(PL.cur);if(!P)return;const p=plPos(e);
  if(PL.place){e.preventDefault();return plPutAt(p);}
  if(PL.tool&&P.z){e.preventDefault();const zk=P.id+'|'+P.s,nid=plIcNid(P);
    if(PL.tool==='box'){const el=document.createElement('div');el.className='bx';st.appendChild(el);PD={m:'new',i:{id:uid(),z:zk,t:'box',x:p.x,y:p.y,w:0,h:0,nid},el,p0:p};return;}
    S.icons.push({id:uid(),z:zk,t:PL.tool,x:r2d(p.x),y:r2d(p.y),nid});save();renderView();return;}
  if(!PL.edit)return;
  const ic=e.target.closest('[data-ic]'),mk=e.target.closest('.mk');
  if(ic){const i=S.icons.find(x=>x.id===ic.dataset.ic);if(!i)return;e.preventDefault();PL.selIc=i.id;
    PD={m:e.target.classList.contains('rz')?'rz':'mvi',i,el:ic,p0:p,o:{x:i.x,y:i.y}};return;}
  if(mk){const n=byId(mk.dataset.id);if(!n)return;e.preventDefault();PD={m:'mvm',n,el:mk,p0:p,f:!!P.f};return;}
  if(PL.selIc){PL.selIc='';renderView();}
});
document.addEventListener('pointermove',e=>{if(!PD||!$('#plS'))return;const D=PD,p=plPos(e),dx=p.x-D.p0.x,dy=p.y-D.p0.y;
  if(Math.abs(dx)+Math.abs(dy)>.4)D.mv=true;if(!D.mv)return;
  if(D.m==='new'){const i=D.i;i.x=r2d(Math.min(p.x,D.p0.x));i.y=r2d(Math.min(p.y,D.p0.y));i.w=r2d(Math.abs(dx));i.h=r2d(Math.abs(dy));}
  else if(D.m==='rz'){D.i.w=r2d(Math.max(1,Math.min(100-D.i.x,p.x-D.i.x)));D.i.h=r2d(Math.max(1,Math.min(100-D.i.y,p.y-D.i.y)));}
  else if(D.m==='mvi'){const i=D.i;i.x=r2d(Math.max(0,Math.min(100-(i.w||0),D.o.x+dx)));i.y=r2d(Math.max(0,Math.min(100-(i.h||0),D.o.y+dy)));}
  else{if(D.f){D.n.x=r2d(p.x);D.n.y=r2d(p.y);}else{D.n.zx=r2d(p.x);D.n.zy=r2d(p.y);}}
  const s=D.el.style;if(D.m==='mvm'){s.left=p.x+'%';s.top=p.y+'%';}else{s.left=D.i.x+'%';s.top=D.i.y+'%';if(D.i.t==='box'){s.width=D.i.w+'%';s.height=D.i.h+'%';}}
});
document.addEventListener('pointerup',()=>{if(!PD)return;const D=PD;PD=null;
  if(D.m==='new'){if(D.i.w>=1&&D.i.h>=1){S.icons.push(D.i);PL.selIc=D.i.id;PL.tool='';save();}renderView();return;}
  if(!D.mv){const id=D.m==='mvm'?D.n.id:D.i.nid;if(id&&byId(id)&&UI.sel!==id){PL.keep=true;select(id,true);return;}renderView();return;}
  save();renderView();});

/* ---------- 키보드 · 층 순서 끌기 ---------- */
document.addEventListener('keydown',e=>{if(UI.tab!=='plan'||/INPUT|TEXTAREA|SELECT/.test((document.activeElement||{}).tagName||''))return;
  if(e.key==='Escape'&&(PL.place||PL.tool)){PL.place=null;PL.tool='';renderView();}
  else if(e.key==='Delete'&&PL.edit&&PL.selIc){e.preventDefault();plDelIc();}});
const plDB=t=>t.closest&&t.closest('.plBar [data-plf][draggable]');
document.addEventListener('dragstart',e=>{const b=plDB(e.target);if(!b)return;PL.drag=b.dataset.plf;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',PL.drag);});
document.addEventListener('dragover',e=>{const b=PL.drag&&plDB(e.target);if(!b)return;e.preventDefault();document.querySelectorAll('.plBar .dragOver').forEach(x=>x.classList.remove('dragOver'));b.classList.add('dragOver');});
document.addEventListener('drop',e=>{const b=PL.drag&&plDB(e.target),d=PL.drag;PL.drag='';if(!b||b.dataset.plf===d)return;e.preventDefault();
  const F=S.floors,i=F.findIndex(f=>f.name===d),j=F.findIndex(f=>f.name===b.dataset.plf);if(i<0||j<0)return;const [it]=F.splice(i,1);F.splice(j,0,it);save();renderView();});
document.addEventListener('dragend',()=>{PL.drag='';document.querySelectorAll('.plBar .dragOver').forEach(x=>x.classList.remove('dragOver'));});
