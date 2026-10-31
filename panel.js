/* =========================================================
   panel.js — 분전반 외형 (결선도 탭)
   ========================================================= */
const PV_SZ={s:{RH:34,bh:24,pw:12},m:{RH:44,bh:32,pw:15},l:{RH:58,bh:44,pw:18}};
const PV_OFF=[-27,-9,9,27],PV_COL=['#92400e','#18181b','#9ca3af','#2563eb'];
const PV_E=/ELB|ELCB|EBS|누전|RCD/i,PV_M=/MCCB|ACB|VCB|MC|AB|배선/i;
let PV_HOST='',PV_PIN=null,PV_ED=null,_pvT=0;

function pvCan(h){if(!h||!['MDB','PNL','UPS','CB'].includes(h.type))return false;const v=pV(effV(h));return !v||v<1000;}
function pvHost(n){if(PV_PIN&&PV_PIN.sel===n.id){const h=byId(PV_PIN.host);if(h)return h;}return kids(n.id).length?n:(par(n)||n);}
function pvKind(n){const m=String(n.model||'');if(n.cbk==='ELB'||PV_E.test(m))return 'E';if(['MCCB','ACB','VCB'].includes(n.cbk)||PV_M.test(m))return 'M';return 'U';}
const pvSpare=n=>/spare|예비/i.test(n.name||'');
function pvPoles(n){const p=parseInt(n.poles)||parseInt(POLES[n.wire])||3;return Math.max(1,Math.min(4,p));}
function pvAmp(n){const r=String(n.rating||'').trim();return r?(/^[\d.]+$/.test(r)?r+'A':r):'';}
function pvFit(s,w,fs){s=String(s);let x=0;for(let i=0;i<s.length;i++){x+=(s.charCodeAt(i)>255?1:.6)*fs;if(x>w)return s.slice(0,Math.max(0,i-1))+'…';}return s;}

/* 차단기 한 개 */
function pvBrk(x,y,P,bh,pw,k,amp){
  const afs=Math.max(8,Math.round(bh*.3)),ex=k==='E'?10:0;
  let w=pw*P+5+ex;if(amp)w=Math.max(w,Math.ceil(amp.length*afs*.62)+10+ex);
  const B={M:'fill="#27272a" stroke="#000"',E:'fill="#d4d4d8" stroke="#71717a"',U:'fill="#f1f5f9" fill-opacity=".55" stroke="#94a3b8" stroke-dasharray="3 2"'}[k];
  const hc=k==='U'?'#cbd5e1':'#09090b',tc=k==='U'?'#e2e8f0':'#f4f4f5',txt={M:'#fff',E:'#18181b',U:'#64748b'}[k],hh=Math.round(bh*.45);
  let o=`<rect x="${x}" y="${y}" width="${w}" height="${bh}" rx="2" ${B}/>`;
  const hx0=x+(w-ex-(pw*P-3))/2;
  for(let i=0;i<P;i++){const hx=hx0+i*pw;o+=`<rect x="${hx}" y="${y+3}" width="${pw-3}" height="${hh}" rx="1" fill="${hc}"/><rect x="${hx+2}" y="${y+4}" width="${pw-7}" height="${Math.round(hh*.45)}" rx="1" fill="${tc}"/>`;}
  if(amp)o+=`<text x="${x+(w-ex)/2}" y="${y+bh-3}" text-anchor="middle" font-size="${afs}" font-weight="bold" fill="${txt}">${esc(amp)}</text>`;
  if(k==='E')o+=`<circle cx="${x+w-7}" cy="${y+bh-7}" r="3.2" fill="#facc15" stroke="#a16207" stroke-width=".8"/>`;
  return {o,w};
}

/* 분전반 그림 */
// 반 종류별 색 (외함 테두리·명판·배지) — 배전반·MCC반·UPS·분전반을 한눈에 구분
const PV_KIND={MDB:{l:'배전반',c:'#1e3a8a'},MCC:{l:'MCC반',c:'#7c3aed'},UPS:{l:'UPS',c:'#15803d'},PNL:{l:'분전반',c:'#4b5563'}};
function pvKindOf(h){if(h.type==='PNL'&&/UPS/i.test(h.name||''))return {l:'UPS 분전반',c:'#0f766e'};return PV_KIND[h.type]||{l:(TYPES[h.type]||{}).l||h.type,c:'#4b5563'};}
function pvSvg(h){
  const Z=PV_SZ[S.cfg.pvSz]||PV_SZ.m,RH=Z.RH,bh=Z.bh,pw=Z.pw,fs=bh>=40?14:bh>=30?12:11;
  const C=kids(h.id),rows=Math.max(1,Math.ceil(C.length/2)),W=760,cx=380,y0=214,H=y0+rows*RH+60;
  const mp=Math.max(3,Math.min(4,parseInt(h.poles)||parseInt(POLES[h.wire])||(!effV(h)||pV(effV(h))===380?4:3))),hasN=mp>=4,pc=hasN?[0,1,2,3]:[0,1,2];
  const o=[`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Malgun Gothic,sans-serif">`,
   `<defs><linearGradient id="pvC" x1="0" x2="1"><stop offset="0" stop-color="#c7cdd4"/><stop offset=".5" stop-color="#eef1f4"/><stop offset="1" stop-color="#c7cdd4"/></linearGradient><linearGradient id="pvM" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3f3f46"/><stop offset="1" stop-color="#111113"/></linearGradient></defs>`,
   `<rect width="${W}" height="${H}" fill="#fff"/><rect x="12" y="12" width="${W-24}" height="${H-24}" rx="8" fill="url(#pvC)" stroke="${pvKindOf(h).c}" stroke-width="5"/><rect x="30" y="30" width="${W-60}" height="${H-60}" rx="4" fill="#e7e9ec" stroke="#9ca3af"/>`,
   `<rect x="5" y="70" width="9" height="34" rx="2" fill="#9ca3af" stroke="#6b7280"/><rect x="5" y="${H-104}" width="9" height="34" rx="2" fill="#9ca3af" stroke="#6b7280"/>`];
  [[42,42],[W-42,42],[42,H-42],[W-42,H-42]].forEach(([x,y])=>o.push(`<circle cx="${x}" cy="${y}" r="4" fill="#d1d5db" stroke="#6b7280"/>`));
  /* 명판 */
  const sub=[h.rating?`MAIN ${pvAmp(h)} ${mp}P`:'',`회로 ${C.filter(n=>!isSlot(n)).length}`].filter(Boolean).join(' · ');
  const K=pvKindOf(h),kw=K.l.length*13+20;
  o.push(`<rect x="${cx-kw/2}" y="20" width="${kw}" height="20" rx="10" fill="${K.c}"/><text x="${cx}" y="34" text-anchor="middle" font-size="12" font-weight="bold" fill="#fff">${esc(K.l)}</text>`);
  o.push(`<rect x="${cx-150}" y="42" width="300" height="46" rx="4" fill="${K.c==='#4b5563'?'#111827':K.c}"/><text x="${cx}" y="67" text-anchor="middle" font-size="18" font-weight="bold" fill="#fff">${esc(pvFit(label(h),280,18))}</text><text x="${cx}" y="82" text-anchor="middle" font-size="11" fill="#d1d5db">${esc(sub)}</text>`);
  /* 범례 */
  [['M','배선용 (MCCB)'],['E','누전 (ELB)'],['U','형식 미입력']].forEach(([k,t],j)=>{const y=44+j*18;o.push(pvBrk(54,y,2,14,8,k,'').o,`<text x="94" y="${y+11}" font-size="11" fill="#374151">${t}</text>`);});
  o.push(`<text x="${W-48}" y="58" text-anchor="end" font-size="10.5" fill="#4b5563">몸통 숫자 = 정격</text><text x="${W-48}" y="74" text-anchor="end" font-size="10.5" fill="#4b5563">손잡이 수 = 극수</text>`);
  /* 메인 차단기 */
  const mw=26*mp+22,mx=cx-mw/2,my=100,mh=80;
  pc.forEach(i=>o.push(`<line x1="${cx+PV_OFF[i]}" y1="${my+mh}" x2="${cx+PV_OFF[i]}" y2="${y0-10}" stroke="${PV_COL[i]}" stroke-width="4"/>`));
  o.push(`<rect x="${mx}" y="${my}" width="${mw}" height="${mh}" rx="4" fill="url(#pvM)" stroke="#000"/><text x="${cx}" y="${my+13}" text-anchor="middle" font-size="9" fill="#e5e7eb" font-weight="bold">MAIN</text>`);
  for(let i=0;i<mp;i++){const sx=mx+13+i*26;o.push(`<rect x="${sx}" y="${my+19}" width="18" height="38" rx="2" fill="#09090b"/><rect x="${sx+3}" y="${my+21}" width="12" height="15" rx="2" fill="#f4f4f5"/>`);}
  o.push(`<text x="${cx}" y="${my+mh-8}" text-anchor="middle" font-size="11" fill="#fff" font-weight="bold">${esc((h.rating?pvAmp(h)+' ':'')+mp+'P')}</text>`);
  /* 모선 */
  const bt=y0-10,bl=rows*RH+14;
  pc.forEach(i=>o.push(`<rect x="${cx+PV_OFF[i]-3}" y="${bt}" width="6" height="${bl}" fill="${PV_COL[i]}"/><text x="${cx+PV_OFF[i]}" y="${bt+bl+16}" text-anchor="middle" font-size="9" fill="#374151">${['L1','L2','L3','N'][i]}</text>`));
  o.push(`<rect x="${cx-34}" y="${bt-4}" width="68" height="8" rx="2" fill="#d6d3d1" stroke="#78716c"/><rect x="${cx-34}" y="${bt+bl-4}" width="68" height="8" rx="2" fill="#d6d3d1" stroke="#78716c"/>`);
  if(!C.length)o.push(`<text x="${cx}" y="${y0+30}" text-anchor="middle" font-size="13" fill="#6b7280">회로가 없어요 – 위쪽 [+ …] 버튼으로 추가하세요</text>`);
  /* 분기 회로 */
  let ph=0;
  C.forEach((n,i)=>{
    const L=i%2===0,y=y0+Math.floor(i/2)*RH+(RH-bh)/2;
    if(isSlot(n)){ // 빈 자리: 차단기 없이 칸만 (현장 순서 유지)
      const sel=n.id===UI.sel,bw=pw*2+8,bx=L?cx-48-bw:cx+48,c0=L?44:bx+bw+10,cw=L?bx-10-44:W-44-c0;
      o.push(`<g class="pvr" data-id="${esc(n.id)}" style="cursor:pointer"><title>빈 자리 (차단기 없음)</title><rect x="${bx}" y="${y}" width="${bw}" height="${bh}" rx="3" fill="none" stroke="${sel?'#262f7d':'#d1d5db'}" stroke-dasharray="3 3"/>`+
        `<rect x="${c0}" y="${y}" width="${cw}" height="${bh}" rx="3" fill="${sel?'#e0e7ff':'transparent'}" stroke="${sel?'#262f7d':'#e5e7eb'}" stroke-dasharray="3 3"/><text x="${c0+8}" y="${y+bh/2+fs*.36}" font-size="${fs-1}" fill="#cbd5e1">빈 자리</text></g>`);
      return;}
    const P=pvPoles(n),k=pvKind(n),sp=pvSpare(n),kc=kids(n.id).length,sel=n.id===UI.sel,amp=pvAmp(n);
    const bw=pvBrk(0,0,P,bh,pw,k,amp).w,bx=L?cx-48-bw:cx+48,b=pvBrk(bx,y,P,bh,pw,k,amp);
    let ar;
    if(P>=4)ar=pc.slice();else if(P===3)ar=[0,1,2];
    else{const a=ph%3;ph++;ar=P===1?[a]:(hasN&&n.wire!=='1P380')?[a,3]:[a,(a+1)%3];}
    const xe=L?bx+bw:bx;let ln='';
    ar.forEach((ci,j)=>{const yy=ar.length>1?y+5+j*(bh-10)/(ar.length-1):y+bh/2,xs=cx+PV_OFF[ci];
      ln+=`<line x1="${xe}" y1="${yy}" x2="${xs}" y2="${yy}" stroke="${PV_COL[ci]}" stroke-width="2"/><circle cx="${xs}" cy="${yy}" r="3" fill="${PV_COL[ci]}" stroke="#fff" stroke-width=".8"/>`;});
    const c0=L?44:bx+bw+10,cw=L?bx-10-44:W-44-c0,arw=kc?bh-4:0;
    const fill=sel?'#262f7d':sp?'#f1f5f9':'#fff',st=sel?'#262f7d':sp?'#cbd5e1':'#9ca3af',tc=sel?'#fff':sp?'#94a3b8':n.name?'#111827':'#9ca3af';
    const tx=L&&kc?c0+arw+8:c0+8,tw=cw-16-arw,nm=n.name?label(n):(n.no?n.no+' ':'')+'(이름 없음)';
    let card=`<rect data-card="1" x="${c0}" y="${y}" width="${cw}" height="${bh}" rx="3" fill="${fill}" stroke="${st}"${sp&&!sel?' stroke-dasharray="4 3"':''}/>`+
      `<text x="${tx}" y="${y+bh/2+fs*.36}" font-size="${fs}" font-weight="${sel?'bold':'normal'}" fill="${tc}">${esc(pvFit(nm,tw,fs))}</text>`;
    if(kc){const r=arw/2-1,ax=L?c0+arw/2+3:c0+cw-arw/2-3,cy=y+bh/2;
      card+=`<g data-open="${esc(n.id)}" style="cursor:pointer"><title>하위 ${kc}개 열기</title><circle cx="${ax}" cy="${cy}" r="${r}" fill="${sel?'#fff':'#0f766e'}"/><path d="M${ax-r*.35} ${cy-r*.45}L${ax+r*.5} ${cy}L${ax-r*.35} ${cy+r*.45}Z" fill="${sel?'#262f7d':'#fff'}"/></g>`;}
    o.push(`<g class="pvr" data-id="${esc(n.id)}" style="cursor:pointer"><title>${esc(label(n))} — 클릭: 선택 · 더블클릭: 이름 입력</title>${ln}${b.o}${sel?`<rect x="${bx-3}" y="${y-3}" width="${bw+6}" height="${bh+6}" rx="4" fill="none" stroke="#262f7d" stroke-width="2"/>`:''}${card}</g>`);
  });
  o.push('</svg>');return o.join('');
}

/* 결선도 탭 화면 */
function pvHtml(h){
  PV_HOST=h.id;const z=S.cfg.pvSz||'m';
  const sz=['s','m','l'].map((k,i)=>`<button data-pvsz="${k}"${k===z?' class="on"':''}>${['작게','보통','크게'][i]}</button>`).join('');
  const qa=wireList(h).map(k=>`<button data-pvadd="${k}">+ ${esc((WIRES[k]||{l:k}).l)}</button>`).join('');
  return `<div class="ph" style="max-width:none"><div class="pvBar"><span class="pvKind" style="background:${pvKindOf(h).c}">${esc(pvKindOf(h).l)}</span><h2>${esc(label(h))}</h2><span class="muted">회로 ${kids(h.id).filter(n=>!isSlot(n)).length}개<span class="edOnly"> · 더블클릭: 이름 입력 (Enter·Tab 다음 / Esc 취소)</span></span><span class="sp"></span><span class="seg">${sz}</span><button data-pvmode="list">📋 목록</button><button data-pvpng="1">🖼 PNG</button></div>
  ${typeof pvSum==="function"?pvSum(h):""}<div class="pvAdd">${qa}<button data-pvadd="">+ 미지정</button><button data-pvslot="1" title="차단기가 없는 자리 (현장 순서 맞추기)">+ 빈 자리</button></div><div id="pvW">${pvSvg(h)}</div></div>`;
}

/* 빠른 추가 → 바로 이름 입력 */
function pvAdd(w){
  const h=byId(PV_HOST);if(!h)return;
  const t=(h.type==='PNL'||h.type==='MDB')?'CB':childType(h),n=mkNode(t,h.id);
  n.no=String(kids(h.id).length+1).padStart(2,'0');if(w){n.wire=w;n.poles=POLES[w];}
  S.nodes.push(n);UI.open.add(h.id);PV_PIN={sel:n.id,host:h.id};UI.sel=n.id;
  save();saveUI();renderAll();requestAnimationFrame(()=>pvEdit(n.id));
}

/* 이름 바로 입력 */
function pvEdit(id){
  pvEditEnd(false);
  const W=$('#pvW'),g=W&&W.querySelector(`.pvr[data-id="${CSS.escape(id)}"]`),n=byId(id);if(!g||!n)return;
  const r=g.querySelector('[data-card]').getBoundingClientRect(),w=W.getBoundingClientRect();
  const i=document.createElement('input');i.className='pvEd';i.value=n.name||'';i.placeholder='명칭 입력';
  Object.assign(i.style,{left:(r.left-w.left)+'px',top:(r.top-w.top)+'px',width:Math.max(150,r.width)+'px',height:Math.max(24,r.height)+'px',fontSize:Math.max(12,Math.round(r.height*.45))+'px'});
  W.appendChild(i);i.focus();i.select();i.scrollIntoView({block:'nearest'});
  PV_ED={id,i,done:false};
  i.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();pvEditEnd(false);}
    else if(e.key==='Enter'||e.key==='Tab'){e.preventDefault();pvEditEnd(true,e.shiftKey?-1:1);}
  });
  i.addEventListener('blur',()=>pvEditEnd(true,0));
}
function pvEditEnd(keep,step){
  const E=PV_ED;if(!E||E.done)return;E.done=true;PV_ED=null;
  const n=byId(E.id),v=E.i.value.trim();E.i.remove();
  let next=null;if(n&&step){const C=kids(n.pid),j=C.indexOf(n)+step;if(j>=0&&j<C.length)next=C[j].id;}
  if(keep&&n&&v!==(n.name||'')){n.name=v;save();renderAll();}
  if(next)requestAnimationFrame(()=>pvEdit(next));
}

/* PNG 저장 */
function pvPng(){
  const s=$('#pvW svg'),h=byId(PV_HOST);if(!s)return;
  const W=+s.getAttribute('width'),H=+s.getAttribute('height'),img=new Image();
  img.onload=()=>{const c=document.createElement('canvas');c.width=W*2;c.height=H*2;const g=c.getContext('2d');g.scale(2,2);g.drawImage(img,0,0);
    c.toBlob(b=>download(b,`분전반_${(h?label(h):'').replace(/[\\/:*?"<>|]/g,'_')}_${stamp()}.png`),'image/png');};
  img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(s));
}

/* 클릭 처리 */
document.addEventListener('click',e=>{
  const t=e.target;if(!t.closest)return;
  const sz=t.closest('[data-pvsz]');if(sz){S.cfg.pvSz=sz.dataset.pvsz;save();renderView();return;}
  const md=t.closest('[data-pvmode]');if(md){S.cfg.pvMode=md.dataset.pvmode;save();renderView();return;}
  if(t.closest('[data-pvpng]')){pvPng();return;}
  const ad=t.closest('[data-pvadd]');if(ad){pvAdd(ad.dataset.pvadd);return;}
  if(t.closest('[data-pvslot]')){const h=byId(PV_HOST);if(!h)return;snap('빈 자리');const n=mkNode('LOAD',h.id);n.slot='E';S.nodes.push(n);save();renderAll();toast('빈 자리를 넣었어요. 순서는 트리에서 ▲▼로 맞추세요.',true);return;}
  if(!t.closest('#pvW')||t.closest('.pvEd'))return;
  const op=t.closest('[data-open]');
  if(op){clearTimeout(_pvT);const n=byId(op.dataset.open);if(!n)return;const k=kids(n.id);PV_PIN=null;select(k.length===1?k[0].id:n.id,true);return;}
  const g=t.closest('.pvr');if(!g)return;clearTimeout(_pvT);if(e.detail>=2)return;
  const id=g.dataset.id;_pvT=setTimeout(()=>{PV_PIN={sel:id,host:PV_HOST};select(id,true);},250);
});
document.addEventListener('dblclick',e=>{
  if(!e.target.closest)return;const g=e.target.closest('#pvW .pvr');
  if(!g||e.target.closest('[data-open]'))return;clearTimeout(_pvT);pvEdit(g.dataset.id);
});
