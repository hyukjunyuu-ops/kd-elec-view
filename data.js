/* =========================================================
   data.js — 데이터 · 계산 · 저장 · 백업 (1단계 뼈대)
   서버화(Firebase) 때는 맨 아래 [저장소] 부분만 바꾸면 돼요.
   ========================================================= */
const APP='ckd_elec2',APPVER=1;
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ---------- 종류 · 목록 ---------- */
const TYPES={
  IN:{l:'한전 인입',s:'인입',c:'#7f1d1d'},
  HV:{l:'수전반',s:'수전',c:'#9a3412'},
  TR:{l:'변압기',s:'TR',c:'#a16207'},
  GEN:{l:'발전기',s:'발전기',c:'#b91c1c'},
  PV:{l:'태양광',s:'태양광',c:'#1d4ed8'},
  ESS:{l:'ESS',s:'ESS',c:'#15803d'},
  ATS:{l:'ATS',s:'ATS',c:'#9f1239'},
  SS:{l:'변전실',s:'변전',c:'#334155'},
  MDB:{l:'배전반',s:'배전',c:'#1e3a8a'},
  CB:{l:'차단기',s:'CB',c:'#52525b'},
  PNL:{l:'분전반',s:'분전',c:'#0f766e'},
  MCC:{l:'MCC반',s:'MCC',c:'#7c3aed'},UPS:{l:'UPS',s:'UPS',c:'#6d28d9'},
  CAP:{l:'콘덴서',s:'콘덴서',c:'#0891b2'},
  LOAD:{l:'부하',s:'부하',c:'#6b7280'}
};
const TYPE_ORDER=Object.keys(TYPES);
const CHILD={IN:'HV',HV:'CB',TR:'CB',GEN:'ATS',PV:'CB',ESS:'CB',ATS:'MDB',SS:'MDB',MDB:'CB',PNL:'CB',MCC:'CB',UPS:'LOAD',LOAD:'LOAD'};
const CBK=['VCB','ACB','MCCB','ELB','LBS'];
const BLDS=['유틸리티동','본동','물류동','바이오동','세파동','페니동','신관','품질동','폐수처리장','동물실험동','지하 펌프장','위험물창고','경비실','야외'];
const VOLTS=['22.9kV','6.6kV','3.3kV','440V','380V','220V'];
const WIRES={'3P4W':{l:'3상4선 380V'},'3P3W':{l:'3상3선 380V'},'3P3W440':{l:'3상3선 440V'},'3P3W220':{l:'3상3선 220V'},'1P220':{l:'단상 220V'},'1P380':{l:'단상 380V (사용 안 함)'}};
const LOWW=['3P4W','3P3W','3P3W440','3P3W220','1P220'];
const SYSW={380:['3P4W','3P3W','1P220'],220:['3P3W220','1P220'],440:['3P3W440']};
const POLES={'3P4W':'4','3P3W':'3','3P3W440':'3','3P3W220':'3','1P220':'2','1P380':'2'};
const SRC={N:'상용',E:'비상'};


/* ---------- 상태 ---------- */
function blank(){return {app:APP,ver:APPVER,nodes:[],blds:BLDS.slice(),cfg:{},ext:{}};}
let S=blank();
let IX=null;
function dirty(){IX=null;}
function idx(){
  if(IX)return IX;
  const m=new Map(),k=new Map();
  S.nodes.forEach(n=>m.set(n.id,n));
  S.nodes.forEach(n=>{const p=(n.pid&&m.has(n.pid))?n.pid:'';if(!k.has(p))k.set(p,[]);k.get(p).push(n);});
  return IX={m,k};
}
const byId=id=>idx().m.get(id);
const kids=id=>idx().k.get(id||'')||[];
const par=n=>(n&&n.pid)?byId(n.pid)||null:null;
const sibs=n=>kids(par(n)?n.pid:'');
let _uc=0;
const uid=()=>'n'+Date.now().toString(36)+(_uc++).toString(36)+Math.random().toString(36).slice(2,5);
function pathOf(n){const a=[];let c=n,g=0;while(c&&g++<100){a.unshift(c);c=par(c);}return a;}
function isAnc(a,b){let c=b,g=0;while(c&&g++<100){if(c.id===a.id)return true;c=par(c);}return false;}

/* ---------- 전압 (TR 2차 전압이 아래로 이어짐) ---------- */
function pV(s){if(!s)return 0;const m=String(s).replace(/,/g,'').match(/([\d.]+)\s*(k?)/i);return m?parseFloat(m[1])*(m[2]?1000:1):0;}
function outV(n,d){d=d||0;if(!n||d>80)return '';if(n.type==='TR')return n.v2||'';return n.volt||outV(par(n),d+1);}
function inV(n){return outV(par(n));}
function effV(n){return n.type==='TR'?(n.v1||inV(n)):(n.volt||inV(n));}
function wireList(n){const v=pV(effV(n));if(v>=1000)return [];return SYSW[v]||LOWW;}

/* ---------- 전원 (발전기·ATS 아래는 비상) ---------- */
function effSrc(n,d){d=d||0;if(!n||d>80)return 'N';if(n.src==='E'||n.src==='N')return n.src;if(n.type==='GEN')return 'E';
  const p=par(n);if(!p)return 'N';if(p.type==='GEN'||p.type==='ATS')return 'E';return effSrc(p,d+1);}
function inSrc(n){const p=par(n);if(!p)return 'N';if(p.type==='GEN'||p.type==='ATS')return 'E';return effSrc(p);}

/* ---------- 동 ---------- */
function effBld(n,d){d=d||0;if(!n||d>80)return '';return n.bld||effBld(par(n),d+1);}
const bk=n=>effBld(n)||'(미지정)';

/* ---------- 표시용 ---------- */
// 분전반 빈 자리 (차단기 없음) — 현장 순서를 맞추려고 넣은 칸. 번호 X·이름 X/칸채우기도 빈칸으로 봄
const isSlot=n=>!!n&&(n.slot==='E'||/^x$/i.test(String(n.no||'').trim())||/^(x+|칸\s*채우기|빈\s*칸)$/i.test(String(n.name||'').trim()));
const label=n=>[n.no,n.name].filter(Boolean).join(' ')||'(이름 없음)';
const tlabel=n=>(n.type==='CB'&&n.cbk)?n.cbk:(TYPES[n.type]||{s:n.type}).s;
function spec(n){
  if(n.type==='TR')return [n.kva?n.kva+'kVA':'',(n.v1||inV(n)||'?')+' / '+(n.v2||'?')].filter(Boolean).join(' ');
  const a=[],r=String(n.rating||'').trim(),p=String(n.poles||'').trim();
  if(r)a.push(/^[\d.]+$/.test(r)?r+'A':r);
  if(p)a.push(/^\d+$/.test(p)?p+'P':p);
  if(['LOAD','GEN','UPS','IN'].includes(n.type)&&n.kw)a.push(n.kw+'kW');
  return a.join(' ');
}
function childType(n){if(n.type==='CB'){const p=par(n);return p&&(p.type==='PNL'||p.type==='UPS')?'LOAD':'PNL';}return CHILD[n.type]||'LOAD';}
function mkNode(type,pid){
  const n={id:uid(),pid:pid||'',type,no:'',name:'',bld:'',loc:'',volt:'',src:'',note:''};
  if(type==='CB')n.cbk=pV(pid?outV(byId(pid)):'')>=1000?'VCB':'';
  if(type==='GEN')n.src='E';
  return n;
}

/* ---------- 데이터 점검 ---------- */
function fixCycles(){dirty();const m=idx().m;
  S.nodes.forEach(n=>{const seen=new Set([n.id]);let c=n.pid?m.get(n.pid):null;
    while(c){if(seen.has(c.id)){n.pid='';break;}seen.add(c.id);c=c.pid?m.get(c.pid):null;}});dirty();}
function fixData(){
  if(!Array.isArray(S.nodes))S.nodes=[];
  S.nodes.forEach(n=>{n.id=String(n.id);n.pid=n.pid?String(n.pid):'';if(!TYPES[n.type])n.type='LOAD';});
  if(!Array.isArray(S.blds)||!S.blds.length)S.blds=BLDS.slice();
  BLDS.forEach(b=>{if(!S.blds.includes(b)){const i=S.blds.indexOf('경비실');S.blds.splice(i<0?S.blds.length:i,0,b);}}); // 새로 생긴 동 이름 추가 (기존 목록은 그대로)
  S.cfg=S.cfg||{};S.ext=S.ext||{};fixCycles();
}

/* ---------- 기존(본동) 백업 변환 ---------- */
function findNodes(o,d){if(!o||typeof o!=='object'||d>3)return null;if(Array.isArray(o.nodes))return o;
  for(const k in o){const r=findNodes(o[k],d+1);if(r)return r;}return null;}
function conv(o){
  const n=Object.assign({},o);n.id=String(n.id);n.pid=n.pid?String(n.pid):'';
  if(!TYPES[n.type])n.type='LOAD';
  const sys=String(n.sys||'');if(!n.volt&&/^(380|220|440)$/.test(sys))n.volt=sys+'V';delete n.sys;
  n.src=/^(E|EM|비상)/i.test(String(n.src||''))?'E':'';
  if(n.type==='CB'&&!n.cbk){const m=String(n.model||'');n.cbk=/ELB|ELCB|EBS|누전|RCD/i.test(m)?'ELB':/MCCB|MC|AB|배선/i.test(m)?'MCCB':'';}
  n.bld=n.bld||'';return n;
}
function fromLegacy(raw){
  const base=findNodes(raw,0);if(!base)throw new Error('계통 항목(nodes)을 찾지 못했어요.');
  const imgs={},grab=o=>{if(o&&o.images&&typeof o.images==='object'&&!Array.isArray(o.images))
    for(const k in o.images){const v=o.images[k];if(typeof v==='string'&&v.startsWith('data:'))imgs[k]=v;}};
  grab(raw);grab(base);
  const ext={};[raw,base].forEach(o=>{for(const k in o){if(['nodes','images','app','version','data','state'].includes(k))continue;if(!(k in ext))ext[k]=o[k];}});
  const nodes=base.nodes.filter(o=>o&&o.id!=null).map(conv),ids=new Set(nodes.map(n=>n.id));
  nodes.forEach(n=>{if(!n.pid||!ids.has(n.pid)){n.pid='';if(!n.volt)n.volt='380V';if(!n.bld)n.bld='본동';}});
  return {nodes,imgs,ext};
}

/* ---------- 파일 ---------- */
function stamp(){const d=new Date(),p=x=>String(x).padStart(2,'0');return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;}
function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1000);}

async function exportBackup(){
  setStatus('백업 만드는 중…');const images={};
  try{const ks=(await Store.img.keys())||[];for(const k of ks)images[k]=await Store.img.get(k);}catch(e){}
  download(new Blob([JSON.stringify({app:APP,ver:APPVER,at:new Date().toISOString(),state:S,images})],{type:'application/json'}),`전기계통_전체백업_${stamp()}.json`);
  setStatus(`백업 받음 · 항목 ${S.nodes.length}개 · 도면 ${Object.keys(images).length}장`);
}
async function importFile(file){
  let o;try{o=JSON.parse(await file.text());}catch(e){alert('JSON 파일을 읽지 못했어요.');return;}
  if(o&&o.app===APP&&o.state){
    if(!confirm(`새 버전 백업이에요.\n항목 ${(o.state.nodes||[]).length}개 · 도면 ${Object.keys(o.images||{}).length}장\n\n지금 데이터를 이 백업으로 바꿀까요?`))return;
    S=Object.assign(blank(),o.state);fixData();
    try{await Store.img.clear();for(const k in (o.images||{}))await Store.img.put(k,o.images[k]);}catch(e){}
    UNDO=null;UI.sel='';save();renderAll();alert('복원했어요.');return;
  }
  let L;try{L=fromLegacy(o);}catch(e){alert('알 수 없는 백업 형식이에요.\n'+e.message);return;}
  if(L.nodes.some(n=>byId(n.id))){alert('이미 같은 항목이 들어 있어요. 이미 불러온 백업일 수 있어요.');return;}
  const has=S.nodes.length>0;
  if(!confirm(`기존 버전(본동) 백업이에요.\n항목 ${L.nodes.length}개 · 도면 이미지 ${Object.keys(L.imgs).length}장\n\n`+
    (has?`지금 데이터(${S.nodes.length}개)에 최상위 항목으로 추가할까요?`:'불러올까요?')+
    '\n\n· 맨 위 항목은 "본동 / 380V"로 지정돼요.\n· 도면·마커·즐겨찾기 정보는 보관해 두고 2단계에서 다시 연결해요.'))return;
  S.nodes.push(...L.nodes);S.ext.legacy=L.ext;
  try{for(const k in L.imgs)await Store.img.put(k,L.imgs[k]);}catch(e){}
  fixData();save();renderAll();alert(`${L.nodes.length}개 불러왔어요.`);
}
function exportCSV(){
  const rows=[];let maxD=1;
  const walk=(pid,path)=>kids(pid).forEach(n=>{const p=path.concat(label(n));maxD=Math.max(maxD,p.length);rows.push([n,p]);walk(n.id,p);});
  walk('',[]);
  const C=[['종류',n=>(TYPES[n.type]||{}).l||n.type],['차단기 종류',n=>n.cbk||''],['번호',n=>n.no||''],['명칭',n=>n.name||''],
    ['동',n=>effBld(n)],['전기실/설치 위치',n=>n.loc||''],['전압',n=>n.type==='TR'?(effV(n)||'?')+'/'+(n.v2||'?'):effV(n)],
    ['결선',n=>(WIRES[n.wire]||{}).l||''],['전원',n=>SRC[effSrc(n)]],['정격(A)',n=>n.rating||''],['극수',n=>n.poles||''],
    ['형식',n=>n.model||''],['용량(kVA)',n=>n.kva||''],['kW',n=>n.kw||''],['비고',n=>n.note||''],['ID',n=>n.id]];
  const q=v=>{v=String(v??'');return /[",\n\r]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;};
  const H=['레벨'];for(let i=1;i<=maxD;i++)H.push('L'+i);
  const lines=[H.concat(C.map(c=>c[0])).map(q).join(',')];
  rows.forEach(([n,p])=>{const L=[];for(let i=0;i<maxD;i++)L.push(p[i]||'');lines.push([p.length].concat(L,C.map(c=>c[1](n))).map(q).join(','));});
  download(new Blob(['\ufeff'+lines.join('\r\n')],{type:'text/csv'}),`전기계통_목록_${stamp()}.csv`);
}

/* ================= [저장소] — 서버화 때 여기만 교체 ================= */
const DB={db:null,
  open(){return new Promise(res=>{try{const r=indexedDB.open('ckd_elec2',1);
    r.onupgradeneeded=()=>{const d=r.result;['kv','img'].forEach(s=>{if(!d.objectStoreNames.contains(s))d.createObjectStore(s);});};
    r.onsuccess=()=>{DB.db=r.result;res(true);};r.onerror=()=>res(false);}catch(e){res(false);}});},
  _t(st,mode,fn){return new Promise((res,rej)=>{if(!DB.db)return res(undefined);
    try{const t=DB.db.transaction(st,mode),rq=fn(t.objectStore(st));let out;
      if(rq)rq.onsuccess=()=>{out=rq.result;};t.oncomplete=()=>res(out);t.onerror=t.onabort=()=>rej(t.error);}catch(e){rej(e);}});},
  get(st,k){return DB._t(st,'readonly',s=>s.get(k));},
  put(st,k,v){return DB._t(st,'readwrite',s=>s.put(v,k));},
  del(st,k){return DB._t(st,'readwrite',s=>s.delete(k));},
  keys(st){return DB._t(st,'readonly',s=>s.getAllKeys());},
  clear(st){return DB._t(st,'readwrite',s=>s.clear());}
};
const Store={
  async load(){await DB.open();let d=null;try{d=await DB.get('kv','state');}catch(e){}
    if(!d){try{const t=localStorage.getItem('ckd_elec2_state');if(t)d=JSON.parse(t);}catch(e){}}return d;},
  async save(st){if(DB.db)await DB.put('kv','state',st);else localStorage.setItem('ckd_elec2_state',JSON.stringify(st));},
  img:{get:k=>DB.get('img',k),put:(k,v)=>DB.put('img',k,v),del:k=>DB.del('img',k),keys:()=>DB.keys('img'),clear:()=>DB.clear('img')}
};
let _sv=0,_pend=false;
function save(){dirty();_pend=true;clearTimeout(_sv);setStatus('저장 중…');
  _sv=setTimeout(async()=>{try{await Store.save(S);_pend=false;setStatus('저장됨 '+new Date().toLocaleTimeString('ko-KR',{hour12:false}));}
    catch(e){console.error(e);setStatus('⚠ 저장 실패 — 백업을 받아 두세요',true);}},400);}
window.addEventListener('beforeunload',e=>{if(_pend){e.preventDefault();e.returnValue='';}});
