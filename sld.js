/* =========================================================
   sld.js — 전기 Flow : 수변전 단선도 (한전 ~ 배전반)
   - 트리에서 자동으로 그려요. 배전반·MCC·분전반·UPS에서 멈춤 (그 아래는 결선도·부하도면)
   - 기호: □ 차단기(VCB·ACB) · ◎ 변압기 · Ⓜ 고압 부하 · ⫴ 콘덴서 · ATS · ▭ 배전반
   - 발전기·태양광·ESS는 연결된 곳 옆에 붙여 그림 (속성창 [공급 위치])
   - 트리에서 아래쪽 분전반·부하를 골라도 어느 배전반·TR·피더인지 경로를 강조
   ========================================================= */

const SD_STOP = {MDB: 1, PNL: 1, MCC: 1, UPS: 1};   // 여기서 멈추고 상자로
const SD_COL = 84, SD_ROW = 108, SD_TOP = 74, SD_PH = 20;   // SD_PH = 반 그림 높이의 절반 (40×54 그림을 .75배)
const SD = {z: 0, out: false, sx: 0, sy: 0, lc: {id: '', t: 0}, _last: ''};
try { const o = JSON.parse(localStorage.getItem('ckd_elec2_sld2') || '{}'); SD.z = o.z || 0; } catch (e) {}
const sdKeep = () => { try { localStorage.setItem('ckd_elec2_sld2', JSON.stringify({z: SD.z})); } catch (e) {} };
// 글자 폭 기준으로 두 줄로 나눔 (넘치면 둘째 줄 끝을 …)
function sdWrap(s, w, fs) {
  s = String(s); let x = 0, i = 0;
  for (; i < s.length; i++) { x += (s.charCodeAt(i) > 255 ? 1 : .6) * fs; if (x > w) break; }
  if (i >= s.length) return [s, ''];
  let j = s.lastIndexOf(' ', i); if (j < i * .5) j = i;
  return [s.slice(0, j).trim(), sdFit(s.slice(j).trim(), w, fs)];
}
// 차단기 종류별 색 배지 (글씨를 안 읽어도 구분)
const SD_CBK = {VCB: {c: '#c2410c', l: '진공차단기 · 고압'}, ACB: {c: '#1d4ed8', l: '기중차단기 · 저압 메인'}, MCCB: {c: '#475569', l: '배선용차단기'},
  ELB: {c: '#0f766e', l: '누전차단기'}, LBS: {c: '#15803d', l: '부하개폐기'}};
const sdBadge = (k, x, y, dead) => { const t = SD_CBK[k]; if (!t) return ''; const w = k.length * 6.4 + 8;
  return `<rect x="${x - w / 2}" y="${y - 7.5}" width="${w}" height="15" rx="3.5" fill="${dead ? '#cbd5e1' : t.c}" stroke="#fff" stroke-width="1.5"/><text x="${x}" y="${y + 3.5}" text-anchor="middle" font-size="9.5" font-weight="bold" fill="#fff">${k}</text>`; };
const sdFit = (s, w, fs) => typeof pvFit === 'function' ? pvFit(s, w, fs) : String(s);

/* ---------- 무엇을 그릴지 · 배치 ---------- */
function sdLayout() {
  const srcOf = new Map(), outside = [];
  S.nodes.forEach(n => { if (!FP_SRC[n.type]) return; const t = byId(n.link); if (!t) { outside.push(n); return; } if (!srcOf.has(t.id)) srcOf.set(t.id, []); srcOf.get(t.id).push(n); });
  const V = new Map();
  function build(n, d) {
    const o = {n, d, kids: [], srcs: srcOf.get(n.id) || []};
    V.set(n.id, o);
    if (!SD_STOP[n.type]) o.kids = kids(n.id).filter(k => !FP_SRC[k.type]).map(k => build(k, d + 1));
    o.kids.forEach(k => { k.p = o; });
    // 같은 동으로 가는 피더끼리 옆으로 모으기 (동 상자가 조각나지 않게) · 그 안에서는 원래 순서
    if (o.kids.length > 1) {
      const pb = effBld(n), dest = k => { const st = [k]; while (st.length) { const q = st.shift(), b = effBld(q.n); if (b && b !== pb) return b; st.push(...q.kids); } return ''; };
      const ord = []; o.kids.forEach(k => { k.dst = dest(k); if (!ord.includes(k.dst)) ord.push(k.dst); });
      o.kids = ord.flatMap(b => o.kids.filter(k => k.dst === b));
    }
    return o;
  }
  const roots = kids('').filter(n => !FP_SRC[n.type]).map(n => build(n, 0));
  // 연결 대상이 그림 밖(배전반 아래 등)인 설비
  srcOf.forEach((a, id) => { if (!V.has(id)) outside.push(...a); });
  const wid = o => { o.kw = o.kids.reduce((s, k) => s + wid(k), 0); o.w = Math.max(SD_COL, o.kw) + (o.srcs.length ? o.srcs.length * SD_COL + 14 : 0); return o.w; };
  const nodes = [];
  function place(o, x0) {
    o.y = SD_TOP + o.d * SD_ROW; o.x0 = x0;
    let cx = x0;
    o.kids.forEach(k => { place(k, cx); cx += k.w; });
    o.x = o.kids.length ? (o.kids[0].x + o.kids[o.kids.length - 1].x) / 2 : x0 + SD_COL / 2;
    o.sp = o.srcs.map((s, i) => ({n: s, x: x0 + Math.max(SD_COL, o.kw) + 14 + (i + .5) * SD_COL, y: o.y}));
    nodes.push(o);
  }
  let x = 30;
  roots.forEach(o => { wid(o); place(o, x); x += o.w + 10; });
  // 동 상자: 위쪽 반과 동이 바뀌는 곳(예: 유틸리티동 VCB → 본동 TR)부터 그 아래 전부 · 옆으로 붙은 같은 동은 하나로
  const bot = o => Math.max(o.y, ...o.kids.map(bot));
  const rb = roots.length ? effBld(roots[0].n) : '', bx = nodes.filter(o => effBld(o.n) && effBld(o.n) !== (o.p ? effBld(o.p.n) : rb))
    .map(o => ({b: effBld(o.n), x1: o.x0 + 3, x2: o.x0 + o.w - 3, y1: o.y - 50, y2: bot(o) + 80, e: o}))
    .sort((a, c) => a.y1 - c.y1 || a.x1 - c.x1), boxes = [];
  bx.forEach(r => { const m = boxes.find(q => q.b === r.b && q.y1 === r.y1 && r.x1 - q.x2 <= 10 && r.x1 >= q.x1); if (m) { m.x2 = Math.max(m.x2, r.x2); m.y2 = Math.max(m.y2, r.y2); } else boxes.push(Object.assign({}, r)); });
  const W = Math.max(600, x + 40), H = Math.max(300, ...nodes.map(o => o.y + (o.kids.length ? 40 : 110)), ...boxes.map(q => q.y2 + 10));
  return {roots, nodes, V, W, H, outside, boxes};
}

/* ---------- 기호 ---------- */
function sdSym(n, x, y, c, st) {
  const sw = 2, f = st.dead ? '#f1f5f9' : '#fff', k = st.dead ? '#94a3b8' : '#1f2937';
  if (n.type === 'TR') {
    const c1 = st.dead ? '#94a3b8' : fpLineCol(n).c, c2 = st.dead ? '#94a3b8' : (pV(n.v2) >= 1000 ? '#ea580c' : '#2563eb');
    return `<circle cx="${x}" cy="${y - 7}" r="10" fill="${f}" stroke="${c1}" stroke-width="2.4"/><circle cx="${x}" cy="${y + 7}" r="10" fill="none" stroke="${c2}" stroke-width="2.4"/>`;
  }
  if (n.type === 'LOAD') return `<circle cx="${x}" cy="${y}" r="12" fill="${f}" stroke="${k}" stroke-width="${sw}"/><text x="${x}" y="${y + 4.5}" text-anchor="middle" font-size="12" font-weight="bold" fill="${k}">M</text>`;
  if (n.type === 'CAP') return `<line x1="${x - 11}" y1="${y - 3}" x2="${x + 11}" y2="${y - 3}" stroke="${k}" stroke-width="3"/><line x1="${x - 11}" y1="${y + 4}" x2="${x + 11}" y2="${y + 4}" stroke="${k}" stroke-width="3"/><line x1="${x}" y1="${y - 14}" x2="${x}" y2="${y - 3}" stroke="${c}" stroke-width="2"/>`;
  if (n.type === 'ATS') return `<rect x="${x - 16}" y="${y - 10}" width="32" height="20" rx="3" fill="${st.dead ? f : '#fff1f2'}" stroke="${st.dead ? k : '#9f1239'}" stroke-width="${sw}"/><text x="${x}" y="${y + 4}" text-anchor="middle" font-size="10" font-weight="bold" fill="${st.dead ? k : '#9f1239'}">ATS</text>`;
  if (SD_STOP[n.type]) {   // 배전반·MCC반·분전반·UPS: 실제 모습 그림 (건물 안 보기와 같은 그림)
    if (typeof bvPic === 'function') return `<g${st.dead ? ' opacity=".4" filter="url(#sdGray)"' : ''}>${bvPic(n, 0, 0).replace('translate(0,0)', `translate(${x - 15},${y - SD_PH}) scale(.75)`)}</g>`;
    const T = TYPES[n.type] || {c: '#334155'}, w = SD_COL - 20;
    return `<rect x="${x - w / 2}" y="${y - 14}" width="${w}" height="28" rx="4" fill="${st.dead ? f : '#f8fafc'}" stroke="${st.dead ? '#94a3b8' : T.c}" stroke-width="2"/>`;
  }
  // 차단기: 접점(×) + 비스듬한 칼날, VCB·ACB는 인출형(⌃⌄), LBS는 접점에 ○
  const wd = n.cbk === 'VCB' || n.cbk === 'ACB', lbs = n.cbk === 'LBS', o = [];
  o.push(`<line x1="${x}" y1="${y + 7}" x2="${x - 10}" y2="${y - 8}" stroke="${k}" stroke-width="2.4" stroke-linecap="round"/>`,
    `<circle cx="${x}" cy="${y + 7}" r="2" fill="${k}"/>`);
  if (lbs) o.push(`<circle cx="${x}" cy="${y - 7}" r="3" fill="#fff" stroke="${k}" stroke-width="1.6"/>`);
  else o.push(`<path d="M${x - 4} ${y - 11} L${x + 4} ${y - 3} M${x + 4} ${y - 11} L${x - 4} ${y - 3}" stroke="${k}" stroke-width="1.8"/>`);
  o.push(sdBadge(n.cbk, x, y - 32, st.dead));   // 기호 바로 위 전선 위
  if (wd) o.push(`<path d="M${x - 6} ${y - 22} L${x} ${y - 16} L${x + 6} ${y - 22} M${x - 6} ${y + 16} L${x} ${y + 22} L${x + 6} ${y + 16}" fill="none" stroke="${k}" stroke-width="1.8" stroke-linejoin="round"/>`);
  return o.join('');
}
function sdSrcSym(n, x, y, run, dead) {
  const c = run ? '#dc2626' : dead ? '#94a3b8' : '#475569';
  if (n.type === 'PV') return `<rect x="${x - 13}" y="${y - 11}" width="26" height="22" fill="#eff6ff" stroke="${c}" stroke-width="2"/><path d="M${x - 13} ${y} H${x + 13} M${x - 4} ${y - 11} V${y + 11} M${x + 5} ${y - 11} V${y + 11}" stroke="#60a5fa" stroke-width="1.2"/>`;
  if (n.type === 'ESS') return `<rect x="${x - 13}" y="${y - 9}" width="24" height="18" rx="2" fill="#f0fdf4" stroke="${c}" stroke-width="2"/><rect x="${x + 11}" y="${y - 4}" width="3" height="8" fill="${c}"/><path d="M${x - 6} ${y} h8 M${x - 2} ${y - 4} v8" stroke="${c}" stroke-width="1.6"/>`;
  return `<circle cx="${x}" cy="${y}" r="14" fill="${run ? '#fee2e2' : '#fff'}" stroke="${c}" stroke-width="2.4">${run ? '<animate attributeName="stroke-width" values="2.4;6;2.4" dur=".9s" repeatCount="indefinite"/>' : ''}</circle><text x="${x}" y="${y + 5}" text-anchor="middle" font-size="14" font-weight="bold" fill="${c}">G</text>`;
}

// 기호의 위·아래 끝까지 거리 (선이 여기까지 옴)
function sdHalf(n) {
  if (n.type === 'TR') return 17;
  if (SD_STOP[n.type]) return SD_PH;
  if (n.type === 'CAP') return 14;
  if (n.type === 'LOAD') return 12;
  if (n.type === 'ATS') return 10;
  return 7;   // 차단기: 접점까지
}

/* ---------- 그리기 ---------- */
function sdSvg(L, forPng) {
  const P = fpPower(), z = SD.z || 1, o = [];
  const dead = id => !P.alive.has(id), em = id => FP.black && P.emer.has(id);
  // 선택한 항목 → 그림에 있는 가장 가까운 상위까지 경로
  const sn = byId(UI.sel), path = new Set();
  let vis = null;
  if (sn) { vis = pathOf(sn).reverse().find(x => L.V.has(x.id)); if (vis) pathOf(vis).forEach(x => path.add(x.id)); }
  o.push(`<svg xmlns="http://www.w3.org/2000/svg" id="sdSvg" viewBox="0 0 ${L.W} ${L.H}" width="${Math.round(L.W * z)}" height="${Math.round(L.H * z)}" font-family="Malgun Gothic,sans-serif">`,
    `<rect class="sdBg" width="${L.W}" height="${L.H}" fill="#fff"/>`, typeof BV_DEFS === 'string' ? BV_DEFS.replace('</defs>', '<filter id="sdGray"><feColorMatrix type="saturate" values="0"/></filter></defs>') : '');
  // 동 상자 (유틸리티동은 바탕 그대로, 다른 동만) — 맨 뒤에
  (L.boxes || []).forEach(q => { const c = fpBcol(q.b), w = q.b.length * 12 + 12;
    o.push(`<g class="sdBx"><rect x="${q.x1}" y="${q.y1}" width="${q.x2 - q.x1}" height="${q.y2 - q.y1}" rx="14" fill="${c}" fill-opacity=".07" stroke="${c}" stroke-opacity=".55" stroke-width="1.6"/>`,
      `<rect x="${q.x1}" y="${q.y1}" width="${w}" height="20" rx="10" fill="${c}"/><text x="${q.x1 + w / 2}" y="${q.y1 + 14}" text-anchor="middle" font-size="12" font-weight="bold" fill="#fff">${esc(q.b)}</text></g>`); });
  const col = n => dead(n.id) ? {c: '#cbd5e1', d: '', w: 2.2} : em(n.id) ? {c: '#dc2626', d: '9 6', w: 3.4} : fpLineCol(n);
  const seg = (x1, y1, x2, y2, c, hl, w) => `${hl && !forPng ? `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#fde047" stroke-width="${(w || c.w) + 7}" stroke-linecap="round"/>` : ''}<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c.c}" stroke-width="${w || c.w}"${c.d ? ` stroke-dasharray="${c.d}"` : ''} stroke-linecap="square">${c.c === '#dc2626' && c.d ? '<animate attributeName="stroke-dashoffset" from="30" to="0" dur="1s" repeatCount="indefinite"/>' : ''}</line>`;

  // 한전 인입
  L.roots.forEach(r => {
    if (r.n.type === 'LOAD') return;
    const c = col(r.n);
    o.push(`<path d="M${r.x - 7} ${SD_TOP - 52} L${r.x} ${SD_TOP - 40} L${r.x + 7} ${SD_TOP - 52}" fill="none" stroke="${c.c}" stroke-width="2.4"/>`, seg(r.x, SD_TOP - 50, r.x, r.y - sdHalf(r.n), c, path.has(r.n.id)),
      `<text x="${r.x + 12}" y="${SD_TOP - 44}" font-size="12" font-weight="bold" fill="${FP.black ? '#b91c1c' : '#7f1d1d'}">한전 ${esc(effV(r.n) || '22.9kV')}${FP.black ? ' ✕ 정전' : ''}</text>`);
  });
  // 선: 부모 → (모선) → 자식
  L.nodes.forEach(p => {
    if (!p.kids.length) return;
    const by = p.y + SD_ROW * .5, k0 = p.kids[0], k1 = p.kids[p.kids.length - 1], c0 = col(k0.n), hlP = path.has(p.n.id);
    const anyHl = p.kids.some(k => path.has(k.n.id));
    o.push(seg(p.x, p.y + sdHalf(p.n), p.x, by, c0, hlP && anyHl));
    if (p.kids.length > 1) {
      const busW = p.kids.length >= 6 ? 7 : 4.5;
      o.push(`<line x1="${k0.x - 6}" y1="${by}" x2="${k1.x + 6}" y2="${by}" stroke="${dead(p.n.id) ? '#cbd5e1' : em(p.n.id) ? '#dc2626' : c0.c}" stroke-width="${busW}"/>`);
      if (p.kids.length >= 6) o.push(`<text x="${k0.x - 6}" y="${by - 8}" font-size="11" fill="#64748b">${esc(label(p.n))} 모선 ${esc(effV(k0.n) || '')}</text>`);
      p.kids.forEach(k => { if (path.has(k.n.id)) o.push(seg(p.x, by, k.x, by, col(k.n), true, 3)); });
    }
    p.kids.forEach(k => {
      const top = k.y - sdHalf(k.n);
      o.push(seg(k.x, by, k.x, top, col(k.n), path.has(k.n.id)));
      // 동이 바뀌는 곳
      const kb = effBld(k.n), pb = effBld(p.n);
      if (kb && kb !== pb && !(L.boxes || []).length) { const t = kb, w = t.length * 11 + 16; o.push(`<rect x="${k.x - w - 5}" y="${by + 6}" width="${w}" height="16" rx="8" fill="${fpBcol(kb)}"/><text x="${k.x - w / 2 - 5}" y="${by + 18}" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#fff">${esc(t)}</text>`); }
    });
  });
  // 같은 줄에서 오른쪽 이웃 기호까지 남은 폭 (이름이 넘어가지 않게)
  const halfW = n => SD_STOP[n.type] ? 22 : n.type === 'ATS' ? 16 : 12;
  const row = new Map();
  L.nodes.forEach(q => { const a = row.get(q.y) || []; a.push(q.x - halfW(q.n)); q.sp.forEach(s2 => a.push(s2.x - 16)); row.set(q.y, a); });
  const room = q => { const r = (row.get(q.y) || []).filter(x => x > q.x + 1); return (r.length ? Math.min(...r) : q.x + 200) - (q.x + 14) - 6; };
  // 기호 · 이름
  L.nodes.forEach(q => {
    const n = q.n, d = dead(n.id), off = P.off.has(n.id), sel = n.id === UI.sel || (vis && vis.id === n.id && UI.sel !== n.id);
    const c = col(n), leaf = !q.kids.length;
    o.push(`<g class="sdN" data-sd="${esc(n.id)}" style="cursor:pointer"><title>${esc(pathOf(n).map(label).join(' › '))}${SD_STOP[n.type] ? '\n더블클릭: 결선도' : ''}</title>`);
    if (sel && !forPng) o.push(SD_STOP[n.type] ? `<rect x="${q.x - 26}" y="${q.y - SD_PH - 6}" width="52" height="${SD_PH * 2 + 12}" rx="8" fill="#fde047" opacity=".55"/>` : `<circle cx="${q.x}" cy="${q.y}" r="24" fill="#fde047" opacity=".45"/>`);
    o.push(SD_STOP[n.type] ? `<rect x="${q.x - 22}" y="${q.y - SD_PH}" width="44" height="${SD_PH * 2}" fill="transparent"/>` : `<rect x="${q.x - 18}" y="${q.y - 18}" width="36" height="36" fill="transparent"/>`, sdSym(n, q.x, q.y, c.c, {dead: d}));
    if (off) o.push(`<text x="${q.x - 14}" y="${q.y + 4}" text-anchor="end" font-size="10" font-weight="bold" fill="#dc2626">OFF</text>`);
    const nm = label(n), sp = n.type === 'CB' ? (SD_CBK[n.cbk] ? spec(n) : [n.cbk, spec(n)].filter(Boolean).join(' ')) : n.type === 'TR' ? [n.kva ? n.kva + 'kVA' : '', `${effV(n) || '?'}/${n.v2 || '?'}`].filter(Boolean).join(' ') : spec(n) || (n.cbk || '');
    if (leaf && !SD_STOP[n.type]) {   // 아래 끝: 이름을 기호 밑에
      const [l1, l2] = sdWrap(nm, SD_COL - 4, 10.5);   // 이름은 두 줄까지
      const ly = q.y + (n.type === 'CB' ? 36 : 27);    // 차단기는 아래 인출 표시 밑으로
      o.push(`<text x="${q.x}" y="${ly}" text-anchor="middle" font-size="10.5" font-weight="bold" fill="${d ? '#94a3b8' : '#0f172a'}">${esc(l1)}</text>`,
        l2 ? `<text x="${q.x}" y="${ly + 13}" text-anchor="middle" font-size="10.5" font-weight="bold" fill="${d ? '#94a3b8' : '#0f172a'}">${esc(l2)}</text>` : '',
        sp ? `<text x="${q.x}" y="${ly + (l2 ? 26 : 13)}" text-anchor="middle" font-size="9.5" fill="#64748b">${esc(sdFit(sp, SD_COL - 4, 9.5))}</text>` : '');
    } else if (SD_STOP[n.type]) {   // 그림 밑에 이름 (두 줄까지) · 종류 · 회로 수
      const C = kids(n.id).filter(k => !isSlot(k)), [l1, l2] = sdWrap(n.name || nm, SD_COL - 4, 10.5), ly = q.y + SD_PH + 13, K = typeof pvKindOf === 'function' ? pvKindOf(n) : {l: '', c: '#64748b'};
      o.push(`<text x="${q.x}" y="${ly}" text-anchor="middle" font-size="10.5" font-weight="bold" fill="${d ? '#94a3b8' : '#0f172a'}">${esc(l1)}</text>`,
        l2 ? `<text x="${q.x}" y="${ly + 13}" text-anchor="middle" font-size="10.5" font-weight="bold" fill="${d ? '#94a3b8' : '#0f172a'}">${esc(l2)}</text>` : '',
        `<text x="${q.x}" y="${ly + (l2 ? 26 : 13)}" text-anchor="middle" font-size="9.5" fill="#64748b"><tspan fill="${d ? '#94a3b8' : K.c}" font-weight="bold">${esc(K.l)}</tspan>${C.length ? ' · 회로 ' + C.length : ''}</text>`);
    } else {                          // 중간: 이름을 오른쪽에
      // 오른쪽 이웃 칸까지 남은 폭만큼
      const wl = Math.max(30, Math.min(150, room(q)));
      const sp2 = n.type === 'TR' && wl < 90 ? [n.kva ? n.kva + 'kVA' : '', `${effV(n) || '?'}/${n.v2 || '?'}`] : [sp];
      o.push(`<text x="${q.x + 14}" y="${q.y - 2}" font-size="10.5" font-weight="bold" fill="${d ? '#94a3b8' : '#0f172a'}">${esc(sdFit(nm, wl, 10.5))}</text>`,
        ...sp2.filter(Boolean).map((t, i) => `<text x="${q.x + 14}" y="${q.y + 11 + i * 11}" font-size="9.5" fill="#64748b">${esc(sdFit(t, wl, 9.5))}</text>`));
    }
    o.push('</g>');
    // 이리로 들어오는 발전기·태양광·ESS
    q.sp.forEach(s => {
      const sn2 = s.n, st = P.src[sn2.id], run = FP.black ? st === 'run' : st === 'on' && sn2.type !== 'GEN';
      const lc = FP.black && st === 'run' ? {c: '#dc2626', d: '9 6', w: 3} : {c: '#fca5a5', d: '6 5', w: 2};
      o.push(seg(s.x - 16, s.y, q.x + 20, s.y, lc),
        `<g class="sdN" data-sd="${esc(sn2.id)}" style="cursor:pointer"><title>${esc(label(sn2))} → ${esc(label(n))}</title>${sdSrcSym(sn2, s.x, s.y, FP.black && st === 'run', st === 'off' || (FP.black && st !== 'run'))}
        <text x="${s.x}" y="${s.y + 27}" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#0f172a">${esc(sdFit(label(sn2), SD_COL - 4, 10.5))}</text>
        <text x="${s.x}" y="${s.y + 40}" text-anchor="middle" font-size="9.5" fill="${run ? '#dc2626' : '#64748b'}">${esc([sn2.kw ? sn2.kw + 'kW' : '', sn2.gk === 'CTTS' ? 'CTTS' : ''].filter(Boolean).join(' '))}</text></g>`);
    });
  });
  o.push('</svg>');
  return o.join('');
}

/* ---------- 화면 ---------- */
function sdView() {
  const L = sdLayout(), P = fpPower();
  const sn = byId(UI.sel), vis = sn && pathOf(sn).reverse().find(x => L.V.has(x.id));
  const where = sn && vis && vis.id !== sn.id ? `<div class="sdHint soft">선택한 <b>${esc(label(sn))}</b>은(는) <b>${esc(label(vis))}</b> 아래에 있어요 — 경로를 노란색으로 표시했어요. ${SD_STOP[vis.type] ? `<button data-sda="dg">▦ ${esc(label(vis))} 결선도</button>` : ''}</div>` : '';
  const out = L.outside.length ? `<div class="sdHint">⚡ 단선도 밖 전원 설비: ${L.outside.map(n => `<a data-sdgo="${esc(n.id)}">${esc(bk(n))} ${esc(label(n))}${n.kw ? ' ' + esc(n.kw) + 'kW' : ''}</a> → ${byId(n.link) ? esc(label(byId(n.link))) : '<i>공급 위치 조사 중</i>'}`).join(' · ')}</div>` : '';
  const hint = FP.black ? `<div class="sdHint bk"><b>🔌 한전 정전</b> — 회색 = 전기 없음 · <span style="color:#dc2626">빨간 점선 = 발전기 등 비상 전원</span></div>`
    : SD.out ? '<div class="sdHint bk">⏻ 차단기 내리기: 기호를 누르면 내리기/올리기 · 아래가 회색이 돼요</div>'
    : '';
  return `<div class="sdBar"><h2>전기 Flow</h2><span class="muted">수변전 단선도 (한전 → 배전반)</span><span class="sp"></span>
      <button data-sda="black" class="${FP.black ? 'dn' : ''}">🔌 한전 정전${FP.black ? ' 중 (복구)' : ''}</button>
      <button data-sda="out" class="${SD.out ? 'dn' : ''}">⏻ 차단기 내리기${SD.out ? ' 켜짐' : ''}</button>${P.off.size ? `<button data-sda="clr">모두 복구 (${P.off.size})</button>` : ''}<button data-rp="1" class="${P.off.size ? 'pri' : ''}">📄 계획정전 보고서</button>
      <span class="sdG"></span><button data-sda="zo">－</button><button data-sda="z1">${Math.round((SD.z || 1) * 100)}%</button><button data-sda="zi">＋</button><button data-sda="fit">⤢ 맞춤</button><button data-sda="png">🖼 PNG</button></div>
    <details class="sdLgW"${document.body.classList.contains('mob') ? '' : ' open'}><summary>범례</summary><div class="sdLg">${Object.keys(SD_CBK).map(k => `<span><b style="background:${SD_CBK[k].c}">${k}</b>${SD_CBK[k].l}</span>`).join('')}
      <span><i class="tr"></i>변압기</span><span><i class="m">M</i>고압 모터</span>${typeof bvPicMDB === 'function' ? `<span><svg viewBox="0 0 40 54" width="13" height="18" style="vertical-align:middle">${bvPicMDB(1)}</svg> 배전반 <svg viewBox="0 0 40 54" width="13" height="18" style="vertical-align:middle">${bvPicMCC()}</svg> MCC반 <svg viewBox="0 0 40 54" width="13" height="18" style="vertical-align:middle">${bvPicPNL()}</svg> 분전반 (더블클릭 = 회로도)</span>` : '<span><i class="bx"></i>배전반 (더블클릭 = 결선도)</span>'}
      <span><i class="ln" style="background:#eab308"></i>22.9kV</span><span><i class="ln" style="background:#ea580c"></i>3.3kV</span><span><i class="ln" style="background:#2563eb"></i>저압</span></div></details>
    ${hint}${where}${out}<div id="sdW">${sdSvg(L)}</div>`;
}
function sdAfter() {
  const w = document.getElementById('sdW'); if (!w || UI.tab !== 'sld') return;
  w.style.height = Math.max(260, window.innerHeight - w.getBoundingClientRect().top - (document.body.classList.contains('mob') ? 74 : 14)) + 'px';
  if (!SD.z) { sdFitNow(); return; }
  w.scrollLeft = SD.sx; w.scrollTop = SD.sy;
  if (UI.sel !== SD._last) {           // 선택이 바뀌면 그 자리로
    SD._last = UI.sel;
    const L = sdLayout(), sn = byId(UI.sel), vis = sn && pathOf(sn).reverse().find(x => L.V.has(x.id));
    const g = vis && w.querySelector(`.sdN[data-sd="${CSS.escape(vis.id)}"]`);
    if (g) { const r = g.getBoundingClientRect(), b = w.getBoundingClientRect();
      if (r.left < b.left || r.right > b.right || r.top < b.top || r.bottom > b.bottom) { w.scrollLeft += r.left - b.left - b.width / 2; w.scrollTop += r.top - b.top - b.height / 2; } }
  }
  SD.sx = w.scrollLeft; SD.sy = w.scrollTop;
  w.onscroll = () => { SD.sx = w.scrollLeft; SD.sy = w.scrollTop; };
}
function sdFitNow() {
  const w = document.getElementById('sdW'), sv = document.getElementById('sdSvg'); if (!w || !sv) return;
  if (!sdLayout().roots.length) return;   // 데이터를 불러오기 전이면 나중에 맞춤
  const vb = sv.viewBox.baseVal;
  SD.z = Math.max(.4, Math.min(1.3, Math.min((w.clientWidth - 10) / vb.width, (w.clientHeight - 10) / vb.height)));
  SD.sx = SD.sy = 0;
  if (document.body.classList.contains('mob')) {   // 핸드폰: 조금 크게, 메인 TR이 가운데 오게
    SD.z = Math.max(SD.z, .6); const r = sdLayout().roots[0];
    if (r) SD.sx = Math.max(0, r.x * SD.z - w.clientWidth / 2);
  }
  sdKeep(); renderView();
}
function sdZoom(z, cx, cy) {
  const w = document.getElementById('sdW'); if (!w) return;
  const old = SD.z || 1; SD.z = Math.max(.3, Math.min(2.5, z));
  const r = w.getBoundingClientRect(), px = cx == null ? r.width / 2 : cx - r.left, py = cy == null ? r.height / 2 : cy - r.top;
  SD.sx = (w.scrollLeft + px) * SD.z / old - px; SD.sy = (w.scrollTop + py) * SD.z / old - py;
  sdKeep(); renderView();
}
function sdPng() {
  const L = sdLayout(), s = sdSvg(L, true).replace(/ width="\d+" height="\d+"/, ` width="${L.W}" height="${L.H}"`), img = new Image();
  img.onload = () => { const c = document.createElement('canvas'); c.width = L.W * 2; c.height = L.H * 2;
    const g = c.getContext('2d'); g.scale(2, 2); g.drawImage(img, 0, 0); c.toBlob(b => download(b, `수변전단선도_${stamp()}.png`), 'image/png'); };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
}

// 계통 트리에서 그 항목만 펼치고(나머지는 접음) 그 줄로 이동해서 반짝
function sdReveal(id) {
  const n = byId(id); if (!n) return;
  if (typeof FV !== 'undefined' && FV.mode === 'fav') { FV.mode = 'tree'; FV.edit = false; favKeep(); }   // 즐겨찾기 화면이면 트리로
  if ($('#search').value) $('#search').value = '';                                                      // 검색 중이면 검색 지우기
  if (UI.bld && bk(n) !== UI.bld) UI.bld = '';                                                           // 다른 동 필터면 풀기
  select(id, true);
  const r = document.querySelector('#tree .trow.sel');
  if (r) { r.scrollIntoView({block: 'center'}); r.classList.remove('sdFlash'); void r.offsetWidth; r.classList.add('sdFlash'); }
}

/* ---------- 이벤트 ---------- */
let SD_DR = null;
document.addEventListener('click', e => {
  if (UI.tab !== 'sld' || !e.target.closest || !e.target.closest('#view')) return;
  if (SD_DR && SD_DR.moved) return;
  const t = e.target, a = t.closest('[data-sda]');
  if (a) {
    const v = a.dataset.sda;
    if (v === 'black') { FP.black = !FP.black; SD.out = false; fpKeep(); renderView(); }
    else if (v === 'out') { SD.out = !SD.out; renderView(); }
    else if (v === 'clr') { FP.off = []; try { FL.off.clear(); } catch (e2) {} fpKeep(); renderView(); }
    else if (v === 'zi') sdZoom((SD.z || 1) * 1.25); else if (v === 'zo') sdZoom((SD.z || 1) / 1.25); else if (v === 'z1') sdZoom(1);
    else if (v === 'fit') sdFitNow(); else if (v === 'png') sdPng();
    else if (v === 'dg') { const L = sdLayout(), sn = byId(UI.sel), vis = sn && pathOf(sn).reverse().find(x => L.V.has(x.id)); if (vis) { UI.tab = 'dg'; saveUI(); select(vis.id, true); } }
    return;
  }
  const go = t.closest('[data-sdgo]'); if (go) { sdReveal(go.dataset.sdgo); return; }
  const g = t.closest('.sdN');
  if (g) {
    const id = g.dataset.sd, n = byId(id); if (!n) return;
    const now = Date.now(), dbl = SD.lc.id === id && now - SD.lc.t < 400;
    SD.lc = {id: dbl ? '' : id, t: now};
    if (dbl && SD_STOP[n.type]) { UI.tab = 'dg'; saveUI(); select(id, true); return; }
    if (SD.out && (n.type !== 'LOAD' && n.type !== 'CAP' || FP_SRC[n.type])) {
      const s = new Set(FP.off); s.has(id) ? s.delete(id) : s.add(id); FP.off = [...s]; fpKeep();
      toast(s.has(id) ? `⏻ ${label(n)} 내렸어요.` : `↺ ${label(n)} 다시 올렸어요.`, false);
    }
    SD._last = id; sdReveal(id);
  }
});
document.addEventListener('pointerdown', e => {
  if (UI.tab !== 'sld' || e.button !== 0 || !e.target.closest || e.pointerType !== 'mouse') return;   // 손가락은 기본 스크롤
  const w = e.target.closest('#sdW'); if (!w || e.target.closest('.sdN')) return;
  SD_DR = {x: e.clientX, y: e.clientY, sl: w.scrollLeft, st: w.scrollTop, moved: false};
});
document.addEventListener('pointermove', e => {
  const d = SD_DR; if (!d) return;
  const dx = e.clientX - d.x, dy = e.clientY - d.y; if (!d.moved && Math.abs(dx) + Math.abs(dy) < 5) return;
  d.moved = true; const w = document.getElementById('sdW'); if (w) { w.scrollLeft = d.sl - dx; w.scrollTop = d.st - dy; }
});
document.addEventListener('pointerup', () => { setTimeout(() => { SD_DR = null; }, 0); });
document.addEventListener('wheel', e => {
  if (UI.tab !== 'sld' || !(e.ctrlKey || e.metaKey) || !e.target.closest || !e.target.closest('#sdW')) return;
  e.preventDefault(); sdZoom((SD.z || 1) * (e.deltaY < 0 ? 1.15 : 1 / 1.15), e.clientX, e.clientY);
}, {passive: false});
window.addEventListener('resize', () => { if (UI.tab === 'sld') sdAfter(); });

(function () {
  const s = document.createElement('style');
  s.textContent = `
#view .sdBar{display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin-bottom:6px}
#view .sdBar h2{color:#262f7d;margin:0 6px 0 0;font-size:17px}#view .sdBar .sp{flex:1}#view .sdG{width:8px}
#view .sdBar button,#view .sdHint button{padding:4px 9px;border:1px solid #d6dbe8;background:#fff;border-radius:6px;font-size:12px;cursor:pointer;color:#334155}
#view .sdBar button.dn{background:#dc2626;color:#fff;border-color:#dc2626}#view .sdBar button.pri{background:#262f7d;color:#fff;border-color:#262f7d}
#view .sdHint{font-size:12px;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:5px 9px;margin-bottom:6px;line-height:1.6}
#view .sdHint.soft{color:#475569;background:#f8fafc;border-color:#e2e8f0}#view .sdHint.bk{color:#7f1d1d;background:#fef2f2;border-color:#fecaca}
#view .sdHint a{color:#1d4ed8;cursor:pointer}
#view .sdLgW summary{display:none;font-size:12px;color:#4f46e5;cursor:pointer;margin-bottom:4px}body.mob #view .sdLgW summary{display:list-item}
#view .sdLg{display:flex;flex-wrap:wrap;gap:4px 12px;align-items:center;font-size:11.5px;color:#475569;margin-bottom:6px}
#view .sdLg span{display:inline-flex;align-items:center;gap:4px}
#view .sdLg b{color:#fff;font-size:10px;padding:1px 5px;border-radius:3px}
#view .sdLg i{display:inline-block}#view .sdLg i.ln{width:16px;height:3px}
#view .sdLg i.tr{width:10px;height:10px;border:2px solid #ea580c;border-radius:50%;box-shadow:0 6px 0 -2px #fff,0 6px 0 0 #2563eb}
#view .sdLg i.m{width:14px;height:14px;border:1.6px solid #1f2937;border-radius:50%;font-style:normal;font-size:9px;font-weight:bold;text-align:center;line-height:12px}
#view .sdLg i.bx{width:16px;height:10px;border:2px solid #1e3a8a;border-top-width:4px;border-radius:2px}
#sdW{overflow:auto;border:1px solid #e2e8f0;border-radius:8px;background:#fff;cursor:grab;user-select:none}
#tree .trow.sdFlash{animation:sdF .35s 4 alternate}@keyframes sdF{from{background:#fde68a}to{background:transparent}}
#sdW .sdN:hover rect,#sdW .sdN:hover circle{filter:drop-shadow(0 0 3px #6366f1)}`;
  document.head.appendChild(s);
})();
