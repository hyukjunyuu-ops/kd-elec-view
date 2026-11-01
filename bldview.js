/* =========================================================
   bldview.js — 건물 안 보기 (공장 지도에서 건물 더블클릭)
   - 기본 = [▤ 현황]: 위 요약 줄(TR·배전반·MCC·분전반·UPS 수, 누르면 목록) · UPS 목록(→ 그 UPS 부하) · 중요 부하 목록(UPS 부하 제외, 분류 칩, 백업) · 오른쪽 건물 단면
   - [▦ 층 배치]: 한 화면에 층을 가로 띠로 (위가 높은 층), 반은 박스 (실제 모습 그림 · 이름 · 전압 · 회로/ACB 수)
     그림: 분전반(문 연 외함·차단기 줄) · MCC반(서랍 유닛) · 배전반(ACB) · 고압반(VCB) · 몰드 TR · UPS
   - 맨 위 '수전' 줄에서 들어오는 선 → TR → 배전반은 늘 선으로. 나머지 반은 흐리게
   - 배전반(하위가 있는 반)을 누르면 하위 분전반·MCC반·배전반·바로 나가는 부하까지 선이 이어짐
     → 하위 반을 누르면 '배전반/분전반/MCC반' 도면, 부하 칩을 누르면 부하도면
   - [✎ 편집]에서 박스를 끌어서 배치, 다른 층 띠로 끌면 층도 바뀜, 겹치면 옆으로 비켜 놓음 · [겹침 정리] [자동 배치]
   - 배치·층은 S.cfg.bv[동] 에 저장 (백업 포함). 처음 층은 '위치 도면'의 층 정보로
   - 오른쪽 현황표: 수전·받는 곳·배전반·ACB·MCC·분전반·UPS·비상부하·중요 부하·층별
   ========================================================= */

const BV = {b: '', drag: null, rows: null, f: '', K: null, mode: 'card', u: '', ic: ''};   // mode: card = 현황(UPS·중요 부하·건물 단면) · band = 층 배치
try { BV.mode = localStorage.getItem('ckd_elec2_bvmode') || 'card'; } catch (e) {}   // f = 눌러서 하위 계통을 펼친 반
const BV_PT = {TR: 1, MDB: 1, MCC: 1, PNL: 1, UPS: 1};                // 박스로 그리는 종류

/* ---------- 저장된 배치 ---------- */
function bvCfg(bld) {
  S.cfg.bv = S.cfg.bv || {};
  const c = S.cfg.bv[bld] = S.cfg.bv[bld] || {floors: null, pos: {}};
  if (!c.floors) {   // 처음: 위치 도면 층에서 1F·2F… 만들기
    const L = S.floors.filter(f => f.bld === bld).map(f => bvFL(f.name)).filter(Boolean);
    c.floors = [...new Set(L)].sort((a, b) => bvLv(a) - bvLv(b));
    if (!c.floors.length) c.floors = ['1F'];
  }
  c.pos = c.pos || {};
  return c;
}
const bvLv = f => { const s = String(f || ''), m = s.match(/^B(\d+)/i); return m ? -(+m[1]) : (parseInt(s) || 0); };
function bvFL(name) {   // '본동 3층' → '3F' · '지하1층' → 'B1'
  const s = String(name || ''), m = s.match(/(B|지하)\s*(\d+)/i); if (m) return 'B' + m[2];
  const k = s.match(/(\d+)\s*(층|F)/i); return k ? k[1] + 'F' : '';
}
const bvPanels = bld => S.nodes.filter(n => BV_PT[n.type] && !isSlot(n) && bk(n) === bld);
// 그 반이 있는 층: 직접 정한 것('-' = 층 미지정) → 위치 도면 층 → 없음
function bvFloorOf(n, c) {
  const p = c.pos[n.id]; if (p && p.f) return c.floors.includes(p.f) ? p.f : '';
  const f = bvFL(n.floor); if (f && c.floors.includes(f)) return f;
  if (n.type === 'TR') { const k = bvCh(n.id).find(x => x.type !== 'TR' && bvFloorOf(x, c)); if (k) return bvFloorOf(k, c); }   // TR은 아래 배전반 층을 따라감
  return '';
}
// 회로 등은 위쪽 반의 층을 따라감
function bvFloorUp(n, c) { let x = n, g = 0; while (x && g++ < 80) { if (BV_PT[x.type]) { const f = bvFloorOf(x, c); if (f) return f; } x = par(x); } return ''; }

/* ---------- 현황 ---------- */
function bvStats(bld, c) {
  const N = S.nodes.filter(n => bk(n) === bld && !isSlot(n)), leaf = n => !kids(n.id).length && (n.type === 'LOAD' || n.type === 'CB') && !ckSpare(n);
  const kw = a => a.reduce((s, n) => s + (parseFloat(n.kw) || 0), 0), kwN = a => a.filter(n => parseFloat(n.kw)).length;
  const TR = N.filter(n => n.type === 'TR'), em = N.filter(n => leaf(n) && effSrc(n) === 'E'), ups = N.filter(n => n.type === 'UPS' || n.imp === 'UPS');
  const byF = {}; [...c.floors, ''].forEach(f => { byF[f] = {mdb: 0, mcc: 0, pnl: 0, ups: 0, imp: 0}; });
  N.forEach(n => { const r = byF[bvFloorUp(n, c)] || byF['']; if (n.type === 'MDB') r.mdb++; if (n.type === 'MCC') r.mcc++; if (n.type === 'PNL') r.pnl++; if (n.type === 'UPS' || n.imp === 'UPS') r.ups++; if (n.imp) r.imp++; });
  const imp = {}; N.forEach(n => { if (n.imp) imp[n.imp] = (imp[n.imp] || 0) + 1; });
  const PA = typeof mapPaths === 'function' ? mapPaths(bld) : {paths: []};
  return {N, TR, mdb: N.filter(n => n.type === 'MDB'), acb: N.filter(n => n.type === 'CB' && n.cbk === 'ACB'), mcc: N.filter(n => n.type === 'MCC'),
    pnl: N.filter(n => n.type === 'PNL'), ups, em, emKw: kw(em), emKwN: kwN(em), cir: N.filter(leaf), kw: kw(N.filter(leaf)), kwN: kwN(N.filter(leaf)),
    kva: TR.reduce((s, n) => s + (parseFloat(n.kva) || 0), 0), byF, imp, PA,
    gen: S.nodes.filter(n => FP_SRC[n.type] && (bk(n) === bld || (byId(n.link) && bk(byId(n.link)) === bld)))};
}

/* ---------- 계통 (박스끼리 부모·자식) ---------- */
// 박스의 위쪽 박스 = 가장 가까운 TR·배전반·MCC·분전반·UPS
function bvBoxPar(n) { let c = par(n), g = 0; while (c && g++ < 80) { if (BV_PT[c.type] && !isSlot(c)) return c; c = par(c); } return null; }
// 그리기 전에 한 번: 박스별 하위 박스 목록
function bvIndex() {
  const ch = new Map();
  S.nodes.forEach(n => { if (!BV_PT[n.type] || isSlot(n)) return; const p = bvBoxPar(n); if (!p) return; if (!ch.has(p.id)) ch.set(p.id, []); ch.get(p.id).push(n); });
  BV.K = {ch};
  return BV.K;
}
const bvCh = (id, bld) => ((BV.K || bvIndex()).ch.get(id) || []).filter(n => !bld || bk(n) === bld);
// 그 반에서 박스를 거치지 않고 바로 나가는 부하 · 다른 동으로 나가는 반
function bvLoads(P, bld) {
  const L = [], out = []; let sp = 0;
  const walk = n => kids(n.id).forEach(k => {
    if (isSlot(k)) return;
    if (BV_PT[k.type]) { if (bk(k) !== bld) out.push(k); return; }
    if (bk(k) !== bld) { out.push(k); return; }
    if (kids(k.id).length) return walk(k);
    if (ckSpare(k)) { sp++; return; }
    if (k.type === 'LOAD' || k.type === 'CB') L.push(k);
  });
  walk(P);
  return {L, out, sp};
}
// 누르면 하위 계통을 펼치는 박스 (하위 반이 있거나, 배전반·TR에서 바로 나가는 부하가 있음)
function bvCanOpen(n, bld) {
  if (bvCh(n.id, bld).length) return true;
  if (n.type !== 'MDB' && n.type !== 'TR') return false;
  const d = bvLoads(n, bld); return d.L.length + d.out.length > 0;
}

/* ---------- 층 띠 배치 ---------- */
const BV_LW = 92, BV_GUT = 40, BV_X0 = BV_LW + BV_GUT, BV_W = 1150;   // 층 이름 칸 · 왼쪽 간선 자리 · 전체 폭
const BV_BX = 172, BV_BY = 62, BV_GX = 12, BV_GY = 24, BV_PAD = 12, BV_HDR = 60;   // 박스 · 간격(가로/세로) · 위쪽 수전 줄
const BV_CW = 164, BV_CH = 28;                                                     // 부하 칩
const BV_ORD = {TR: -1, MDB: 0, MCC: 1, UPS: 2, PNL: 3};
const BV_VC = v => { const x = pV(v); return x >= 1000 ? '#ea580c' : x >= 440 ? '#7c3aed' : x >= 380 ? '#2563eb' : x >= 220 ? '#0d9488' : '#64748b'; };
const bvKind = n => n.type === 'TR' ? {l: '변압기', c: '#b45309'} : pvKindOf(n);
const bvHit = (a, b) => a.x < b.x + BV_BX + BV_GX / 2 && b.x < a.x + BV_BX + BV_GX / 2 && a.y < b.y + BV_BY + BV_GY / 2 && b.y < a.y + BV_BY + BV_GY / 2;
// 빈자리 찾기: (x,y)부터 오른쪽 → 다음 줄
function bvFree(x, y, taken) {
  const maxX = BV_W - BV_X0 - BV_BX - BV_PAD;
  for (let g = 0; g < 400; g++) {
    if (!taken.some(t => bvHit({x, y}, t))) return {x, y};
    x += BV_BX + BV_GX; if (x > maxX) { x = BV_PAD; y += BV_BY + BV_GY; }
  }
  return {x, y};
}
// 한 층(f, '' = 층 미지정)의 박스 자리: 저장된 자리 먼저, 나머지는 종류·전압 순으로 빈자리에
function bvBand(bld, f, c) {
  const P = bvPanels(bld).filter(n => bvFloorOf(n, c) === f);
  const fixed = [], auto = [];
  P.forEach(n => { const p = c.pos[n.id]; (p && p.x != null ? fixed : auto).push(n); });
  // 저장된 자리라도 겹치면 (박스 크기가 바뀐 경우 등) 옆 빈자리로
  const taken = [];
  fixed.sort((a, b) => c.pos[a.id].y - c.pos[b.id].y || c.pos[a.id].x - c.pos[b.id].x).forEach(n => { const q = bvFree(c.pos[n.id].x, c.pos[n.id].y, taken); taken.push({n, ...q, fixed: 1}); });
  auto.sort((a, b) => BV_ORD[a.type] - BV_ORD[b.type] || pV(effV(b)) - pV(effV(a)) || label(a).localeCompare(label(b)));
  let cx = BV_PAD, cy = BV_PAD;
  auto.forEach(n => { const q = bvFree(cx, cy, taken); taken.push({n, ...q}); cx = q.x; cy = q.y; });
  const H = Math.max(BV_BY + BV_PAD * 2, ...taken.map(t => t.y + BV_BY + BV_PAD));
  return {items: taken, H};
}
// 맨 아래 '바로 나가는 부하' 줄의 칩 자리
function bvChipBand(d) {
  const A = [...d.out.map(n => ({n, out: 1})), ...d.L.map(n => ({n}))], MAX = 30;
  const items = A.slice(0, MAX); if (A.length > MAX) items.push({more: A.length - MAX});
  const per = Math.max(1, Math.floor((BV_W - BV_X0 - BV_PAD) / (BV_CW + 10)));
  items.forEach((t, i) => { t.x = BV_PAD + (i % per) * (BV_CW + 10); t.y = 22 + Math.floor(i / per) * (BV_CH + 14); });
  return {items: [], chips: items, H: 22 + Math.ceil(items.length / per) * (BV_CH + 14) + 4};
}
/* ---------- 설비 그림 (실제 모습 비슷하게, 40×54) ---------- */
const BV_DEFS = `<defs>
  <linearGradient id="bvGc" x1="0" x2="1"><stop offset="0" stop-color="#b8bcb4"/><stop offset=".5" stop-color="#d3d6cf"/><stop offset="1" stop-color="#aeb2aa"/></linearGradient>
  <linearGradient id="bvGd" x1="0" x2="1"><stop offset="0" stop-color="#c3c6bf"/><stop offset="1" stop-color="#d9dcd5"/></linearGradient>
  <linearGradient id="bvGk" x1="0" x2="1"><stop offset="0" stop-color="#9a5a1c"/><stop offset=".35" stop-color="#e3a04a"/><stop offset=".65" stop-color="#c47a2c"/><stop offset="1" stop-color="#8a4f17"/></linearGradient>
  <linearGradient id="bvGa" x1="0" x2="1"><stop offset="0" stop-color="#e2e8f0"/><stop offset=".5" stop-color="#ffffff"/><stop offset="1" stop-color="#e2e8f0"/></linearGradient>
</defs>`;
// 분전반: 문 열린 외함 · 위 메인 MCCB · 가운데 부스바 · 양쪽 분기 차단기 줄
function bvPicPNL(ups) {
  let r = '';
  for (let y = 18.5; y < 47; y += 3.1) {
    r += `<rect x="5.5" y="${y}" width="8.5" height="2.6" rx=".4" fill="#fbfbfb" stroke="#9ca3af" stroke-width=".35"/><rect x="8.6" y="${y + .75}" width="2.4" height="1.1" fill="#1f2937"/>`;
    r += `<rect x="26" y="${y}" width="8.5" height="2.6" rx=".4" fill="#fbfbfb" stroke="#9ca3af" stroke-width=".35"/><rect x="29" y="${y + .75}" width="2.4" height="1.1" fill="#1f2937"/>`;
    r += `<path d="M14.6 ${y + 1.3}h10.8" stroke="${(y * 10 | 0) % 2 ? '#2f55c8' : '#b8732f'}" stroke-width="1.1"/>`;
  }
  return `<rect x=".5" y=".5" width="39" height="53" rx="1.5" fill="url(#bvGc)" stroke="#6b7068"/>
    <rect x="2.6" y="2.6" width="34.8" height="48.8" fill="#e7e9e4" stroke="#9aa096" stroke-width=".5"/>
    <rect x="15" y="16.5" width="10" height="32" fill="#cfd8f3" opacity=".7"/>
    <rect x="14.5" y="5" width="11" height="9.5" rx=".6" fill="#f3f4f6" stroke="#4b5563" stroke-width=".5"/><rect x="18.8" y="6.6" width="2.4" height="4.4" fill="#1f2937"/><rect x="16" y="12.2" width="8" height="1.8" fill="#facc15"/>
    <rect x="33" y="4" width="1.4" height="11" fill="#c2783c"/><rect x="35" y="4" width="1.4" height="11" fill="#c2783c"/>${r}
    ${ups ? '<circle cx="33" cy="47" r="5" fill="#0f766e"/><path d="M33.8 43.4l-2.6 4h2l-.8 3 2.8-4.2h-2z" fill="#fff"/>' : ''}`;
}
// MCC반: 여러 열 · 서랍(유닛)마다 돌리는 손잡이 + 표시등
function bvPicMCC() {
  let r = '';
  [1.6, 14.4, 27.2].forEach((x, ci) => {
    r += `<rect x="${x}" y="1.6" width="11.2" height="5.8" fill="url(#bvGd)" stroke="#8a8f87" stroke-width=".4"/>${ci === 0 ? `<rect x="${x + 2}" y="3.4" width="7" height="2" fill="#fff" stroke="#9ca3af" stroke-width=".3"/>` : ''}`;
    for (let i = 0; i < 5; i++) {
      const y = 8 + i * 8.8, red = ci === 2 && i === 4;
      r += `<rect x="${x}" y="${y}" width="11.2" height="8.4" fill="${red ? '#dc2626' : 'url(#bvGd)'}" stroke="#8a8f87" stroke-width=".4"/>
        <circle cx="${x + 3.3}" cy="${y + 4.3}" r="2.3" fill="#4b5563" stroke="#1f2937" stroke-width=".4"/><path d="M${x + 1.6} ${y + 5.4}l3.4-2.2" stroke="#d1d5db" stroke-width=".7"/>
        <rect x="${x + 6.6}" y="${y + 1.6}" width="3.4" height="2" fill="#f8fafc" stroke="#64748b" stroke-width=".25"/>
        <circle cx="${x + 6.9}" cy="${y + 6}" r=".75" fill="#16a34a"/><circle cx="${x + 8.4}" cy="${y + 6}" r=".75" fill="#f8fafc" stroke="#64748b" stroke-width=".2"/><circle cx="${x + 9.9}" cy="${y + 6}" r=".75" fill="#dc2626"/>`;
    }
  });
  return `<rect x=".5" y=".5" width="39" height="53" rx="1" fill="#9ea39a" stroke="#6b7068"/>${r}<rect x="13" y="1" width="1.4" height="52" fill="#7b8077"/><rect x="25.8" y="1" width="1.4" height="52" fill="#7b8077"/>`;
}
// 배전반(저압): 위 계측기 · 가운데 ACB(인출형) · 아래 문
function bvPicMDB(acb) {
  const brk = acb
    ? `<rect x="4" y="13" width="32" height="25" fill="#5b6470"/><path d="M5 15.5h30M5 17.5h30" stroke="#7b8592" stroke-width=".8"/>
       <rect x="7" y="19" width="26" height="15.5" rx=".8" fill="url(#bvGa)" stroke="#94a3b8" stroke-width=".5"/>
       <rect x="15.5" y="19" width="6" height="15.5" fill="#1f2937"/><rect x="16.6" y="21" width="3.8" height="2.4" fill="#475569"/><circle cx="17.5" cy="27" r=".7" fill="#e5e7eb"/><circle cx="19.5" cy="27" r=".7" fill="#e5e7eb"/><circle cx="17.5" cy="29.5" r=".7" fill="#e5e7eb"/><circle cx="19.5" cy="29.5" r=".7" fill="#e5e7eb"/>
       <circle cx="24.8" cy="23.6" r="1.8" fill="#dc2626"/><circle cx="29.2" cy="23.6" r="1.8" fill="#16a34a"/><rect x="24" y="28" width="7" height="1.5" fill="#cbd5e1"/>
       <rect x="8" y="34.5" width="24" height="2.6" fill="#334155"/><circle cx="20" cy="35.8" r=".9" fill="#94a3b8"/>`
    : `<rect x="4" y="13" width="32" height="25" fill="url(#bvGd)" stroke="#8a8f87" stroke-width=".4"/>
       ${[8, 20.5].map(x => `<rect x="${x}" y="16" width="11" height="15" rx=".6" fill="#f3f4f6" stroke="#4b5563" stroke-width=".5"/><rect x="${x + 4.3}" y="19" width="2.4" height="5.5" fill="#1f2937"/>`).join('')}`;
  return `<rect x=".5" y=".5" width="39" height="53" rx="1" fill="url(#bvGc)" stroke="#6b7068"/>
    <rect x="12" y="2.6" width="16" height="3" fill="#fff" stroke="#9ca3af" stroke-width=".3"/>
    <rect x="6" y="7" width="6.5" height="4.5" fill="#f8fafc" stroke="#475569" stroke-width=".4"/><rect x="7" y="8" width="4.5" height="2" fill="#0f766e"/>
    <rect x="16.5" y="7" width="6.5" height="4.5" fill="#f8fafc" stroke="#475569" stroke-width=".4"/><rect x="17.5" y="8" width="4.5" height="2" fill="#0f766e"/>
    <circle cx="28" cy="9.3" r="1.1" fill="#16a34a"/><circle cx="31.2" cy="9.3" r="1.1" fill="#f59e0b"/><circle cx="34.4" cy="9.3" r="1.1" fill="#dc2626"/>
    ${brk}
    <rect x="2" y="39.5" width="36" height="12.5" fill="url(#bvGd)" stroke="#8a8f87" stroke-width=".4"/><rect x="31.5" y="42.5" width="1.6" height="5.5" rx=".6" fill="#111827"/><path d="M5 50h10" stroke="#8a8f87" stroke-width=".5"/>`;
}
// 고압반(VCB PANEL): 양문 · 디지털 계전기 · 표시등 · 손잡이
function bvPicVCB() {
  return `<rect x=".5" y=".5" width="39" height="53" rx="1" fill="#b4b7a6" stroke="#6b7060"/>
    <rect x="11" y="1.6" width="18" height="3.4" fill="#f8fafc" stroke="#9ca3af" stroke-width=".3"/><text x="20" y="4.3" text-anchor="middle" font-size="2.6" font-weight="bold" fill="#334155">V.C.B</text>
    <path d="M20 6v47" stroke="#7f8370" stroke-width=".8"/><rect x="2" y="6" width="36" height="46.5" fill="none" stroke="#8b8f7c" stroke-width=".5"/>
    <rect x="24" y="11" width="11" height="13" rx=".6" fill="#e5e7eb" stroke="#64748b" stroke-width=".4"/><rect x="25.5" y="12.5" width="8" height="4.5" fill="#94a3b8"/><rect x="26" y="13" width="7" height="3.5" fill="#cbd5e1"/>
    ${[0, 1, 2, 3].map(i => `<rect x="${25.6 + i * 2}" y="18.5" width="1.3" height="1.3" fill="#1f2937"/><rect x="${25.6 + i * 2}" y="21" width="1.3" height="1.3" fill="${i === 3 ? '#dc2626' : '#1f2937'}"/>`).join('')}
    <circle cx="25.5" cy="30" r="1.3" fill="#16a34a"/><circle cx="29.5" cy="30" r="1.3" fill="#f97316"/><circle cx="33.5" cy="30" r="1.3" fill="#dc2626"/>
    <rect x="24.5" y="33.5" width="2.8" height="2.8" fill="#f8fafc" stroke="#475569" stroke-width=".3"/><rect x="29" y="33.5" width="2.8" height="2.8" fill="#f8fafc" stroke="#475569" stroke-width=".3"/><circle cx="34.5" cy="35" r="1.8" fill="#f59e0b" stroke="#78350f" stroke-width=".3"/>
    <rect x="13.5" y="31" width="1.4" height="5" rx=".6" fill="#111827"/><rect x="21.5" y="31" width="1.4" height="5" rx=".6" fill="#111827"/>
    <rect x="15.5" y="28" width="5" height="3.4" fill="#dc2626"/><rect x="24" y="48" width="4" height="2" fill="#dc2626"/><rect x="30" y="48" width="4" height="2" fill="#111827"/>`;
}
// 변압기(몰드): 위·아래 철심 · 3상 코일 · 고압 단자
function bvPicTR() {
  return `<rect x="1" y="47" width="38" height="4" fill="#475569"/><circle cx="6" cy="52" r="1.6" fill="#1f2937"/><circle cx="34" cy="52" r="1.6" fill="#1f2937"/>
    <rect x="2.5" y="9" width="35" height="4" fill="#374151"/><rect x="2.5" y="43" width="35" height="4" fill="#374151"/>
    ${[3.5, 14.5, 25.5].map(x => `<rect x="${x}" y="12.5" width="11" height="31" rx="2.2" fill="url(#bvGk)" stroke="#78350f" stroke-width=".4"/>
      <path d="M${x} 18h11M${x} 38h11" stroke="#78350f" stroke-width=".5" opacity=".6"/><rect x="${x + 4.3}" y="12.5" width="2.4" height="31" fill="#fbbf24" opacity=".25"/>
      <path d="M${x + 5.5} 9V3.5" stroke="#64748b" stroke-width="1"/><ellipse cx="${x + 5.5}" cy="5.5" rx="1.8" ry=".9" fill="#d6d3d1"/><ellipse cx="${x + 5.5}" cy="7.3" rx="1.8" ry=".9" fill="#d6d3d1"/><circle cx="${x + 5.5}" cy="3" r="1" fill="#b45309"/>`).join('')}`;
}
// UPS: 캐비닛 · 화면 · 버튼 · 통풍구
function bvPicUPS() {
  return `<rect x="3" y=".5" width="34" height="53" rx="2" fill="#e5e7eb" stroke="#6b7280"/><rect x="3" y=".5" width="34" height="5" rx="2" fill="#374151"/>
    <rect x="9" y="9" width="22" height="11" rx="1" fill="#1f2937"/><rect x="10.5" y="10.5" width="19" height="8" fill="#38bdf8"/><path d="M12 16h5M12 13.5h9" stroke="#0c4a6e" stroke-width=".9"/><rect x="24" y="12" width="4" height="5" fill="none" stroke="#0c4a6e" stroke-width=".8"/>
    <circle cx="13" cy="24" r="1.4" fill="#16a34a"/><circle cx="17.5" cy="24" r="1.4" fill="#f59e0b"/><circle cx="22" cy="24" r="1.4" fill="#dc2626"/><rect x="25.5" y="22.6" width="5" height="2.8" rx=".5" fill="#9ca3af"/>
    ${[30, 33, 36, 39, 42, 45].map(y => `<rect x="8" y="${y}" width="24" height="1.4" rx=".7" fill="#9ca3af"/>`).join('')}
    <path d="M22 48.5l-3 4h2.2l-.8 3" stroke="#15803d" stroke-width="0" />`;
}
function bvPic(n, x, y) {
  const s = n.type === 'TR' ? bvPicTR() : n.type === 'MCC' ? bvPicMCC() : n.type === 'UPS' ? bvPicUPS()
    : n.type === 'MDB' ? (pV(effV(n)) >= 1000 ? bvPicVCB() : bvPicMDB(bvAcb(n).length > 0))
    : bvPicPNL(/UPS/i.test(n.name || ''));
  return `<g transform="translate(${x},${y})">${s}</g>`;
}
// 그 반에 붙은 ACB: 아래 피더 ACB + 바로 위 메인 ACB (다른 반을 거치지 않은 것)
function bvAcb(P) {
  const o = []; const walk = n => kids(n.id).forEach(k => { if (BV_PT[k.type] || isSlot(k)) return; if (k.type === 'CB' && k.cbk === 'ACB') o.push(k); walk(k); }); walk(P);
  let u = par(P), g = 0; while (u && !BV_PT[u.type] && g++ < 20) { if (u.type === 'CB' && u.cbk === 'ACB') o.push(u); u = par(u); }   // 바로 위 메인 ACB (TR → ACB → 배전반)
  return o;
}

// 박스 셋째 줄: 회로 수 · ACB 수 · 1차 전압
function bvInfo(n) {
  if (n.type === 'TR') return n.v1 ? '1차 ' + n.v1 : '';
  if (n.type === 'MDB') { const a = bvAcb(n).length, f = kids(n.id).filter(k => !isSlot(k)).length; return [a ? 'ACB ' + a : '', f ? '피더 ' + f : ''].filter(Boolean).join(' · '); }
  const c = kids(n.id).filter(k => !isSlot(k) && !BV_PT[k.type]).length; return c ? '회로 ' + c : '';
}
function bvBoxSvg(t, x, y, o) {
  const n = t.n, v = (n.type === 'TR' ? n.v2 : '') || effV(n) || '전압?', vc = BV_VC(v);
  const K = bvKind(n), sel = n.id === BV.f || n.id === UI.sel, C = kids(n.id).filter(k => !isSlot(k));
  const em = C.some(k => effSrc(k) === 'E'), im = C.some(k => k.imp) || n.imp;
  const tip = UIX.edit ? '끌기: 배치' : o.open ? (n.id === BV.f ? '한 번 더 누르면 배전반/분전반/MCC반 도면' : '누르면 하위 계통이 이어져요') : '누르면 배전반/분전반/MCC반 도면';
  return `<g class="bvN${o.dim ? ' dim' : ''}${n.id === BV.f ? ' foc' : ''}" data-bvn="${esc(n.id)}" transform="translate(${x},${y})" style="cursor:${UIX.edit ? 'grab' : 'pointer'}"><title>${esc(pathOf(n).map(label).join(' › '))}\n${tip}</title>
    <rect width="${BV_BX}" height="${BV_BY}" rx="7" fill="#fff" stroke="${sel ? '#f59e0b' : K.c}" stroke-width="${sel ? 3.5 : 1.6}"/>
    <rect width="6" height="${BV_BY}" rx="3" fill="${vc}"/>
    ${bvPic(n, 10, 4)}
    <text x="57" y="21" font-size="13" font-weight="bold" fill="#0f172a">${esc(sdFit(label(n), BV_BX - 64, 13))}</text>
    <text x="57" y="${n.type === 'TR' ? 38 : 37}" font-size="11" fill="#64748b">${n.type === 'TR' ? '' : `<tspan fill="${K.c}" font-weight="bold">${esc(K.l)}</tspan> · `}<tspan fill="${vc}" font-weight="bold">${esc(v)}</tspan>${n.type === 'TR' && n.kva ? ' · ' + esc(n.kva) + 'kVA' : ''}</text>
    <text x="57" y="53" font-size="10" fill="#94a3b8">${esc(sdFit(bvInfo(n), 84, 10))}</text>
    ${o.open && !UIX.edit ? `<text x="${BV_BX - 7}" y="${BV_BY - 6}" text-anchor="end" font-size="10" font-weight="bold" fill="${n.id === BV.f ? '#f59e0b' : '#94a3b8'}">${n.id === BV.f ? '▾' : '▸'}${typeof o.open === 'number' ? o.open : ''}</text>` : ''}
    ${em ? `<circle cx="${BV_BX - 10}" cy="10" r="4" fill="#dc2626"><title>비상 회로 있음</title></circle>` : ''}${im ? `<circle cx="${BV_BX - (em ? 20 : 10)}" cy="10" r="4" fill="#f59e0b"><title>중요 부하 있음</title></circle>` : ''}</g>`;
}
function bvChipSvg(t, x, y) {
  if (t.more) return `<g class="bvC" data-bvc="@more" transform="translate(${x},${y})" style="cursor:pointer"><rect width="${BV_CW}" height="${BV_CH}" rx="14" fill="#f1f5f9" stroke="#94a3b8" stroke-dasharray="3 2"/><text x="${BV_CW / 2}" y="18" text-anchor="middle" font-size="11.5" fill="#475569">+${t.more}개 더 · 회로도에서</text></g>`;
  const n = t.n, c = t.out ? '#0891b2' : '#15803d', nm = t.out ? `↗ ${bk(n)} · ${label(n)}` : `◆ ${label(n)}`;
  return `<g class="bvC" data-bvc="${esc(n.id)}" transform="translate(${x},${y})" style="cursor:pointer"><title>${esc(pathOf(n).map(label).join(' › '))}\n${t.out ? '누르면 ' + esc(bk(n)) + ' 안 보기' : '누르면 부하도면'}</title>
    <rect width="${BV_CW}" height="${BV_CH}" rx="14" fill="${t.out ? '#ecfeff' : '#f0fdf4'}" stroke="${c}" stroke-width="1.4"/>
    <text x="11" y="18" font-size="11.5" font-weight="bold" fill="${c}">${esc(sdFit(nm, BV_CW - 18, 11.5))}</text></g>`;
}
// 선 하나: A(위쪽 반) → B(하위). 같은 줄이면 아래 통로로, 아니면 A 아래 통로 → 왼쪽 간선 → B 위 통로
function bvRoute(A, B, s) {
  const ofs = ((s % 5) - 2) * 3, gx = BV_LW + 8 + (s % 5) * 6, ax = A.x + 22 + ofs, bx = B.x + 22 + ofs, hy = BV_GY / 2;
  if (Math.abs(A.y - B.y) < 2) { const yb = A.y + A.h + hy + ofs; return {d: `M${ax},${A.y + A.h}V${yb}H${bx}V${B.y + B.h}`, ex: bx, ey: B.y + B.h}; }
  if (B.y > A.y) {
    const yb = A.y + A.h + hy + ofs, ya = B.y - hy + ofs;
    if (Math.abs(yb - ya) < 4) return {d: `M${ax},${A.y + A.h}V${yb}H${bx}V${B.y}`, ex: bx, ey: B.y};
    return {d: `M${ax},${A.y + A.h}V${yb}H${gx}V${ya}H${bx}V${B.y}`, ex: bx, ey: B.y};
  }
  const yt = A.y - hy + ofs, ya = B.y + B.h + hy + ofs;
  if (Math.abs(yt - ya) < 4) return {d: `M${ax},${A.y}V${yt}H${bx}V${B.y + B.h}`, ex: bx, ey: B.y + B.h};
  return {d: `M${ax},${A.y}V${yt}H${gx}V${ya}H${bx}V${B.y + B.h}`, ex: bx, ey: B.y + B.h};
}
function bvSvg(bld, c) {
  bvIndex();
  const F = c.floors.slice().sort((a, b) => bvLv(b) - bvLv(a));
  const un = bvPanels(bld).some(n => !bvFloorOf(n, c));
  const rows = [...F, ...(un || UIX.edit ? [''] : [])].map(f => ({f, ...bvBand(bld, f, c)}));
  const FO = !UIX.edit && BV.f && byId(BV.f) && BV_PT[byId(BV.f).type] && bk(byId(BV.f)) === bld ? byId(BV.f) : null;
  let LD = null;
  if (FO) { LD = bvLoads(FO, bld); if (LD.L.length + LD.out.length) rows.push({f: '@ld', ...bvChipBand(LD)}); }
  let y = BV_HDR; rows.forEach(r => { r.top = y; y += r.H; });
  BV.rows = rows.filter(r => r.f !== '@ld');   // 끌어 놓을 때 어느 층인지 찾는 데 씀
  // 박스 자리 (전체 좌표)
  const R = {}; rows.forEach(r => r.items.forEach(t => { R[t.n.id] = {x: BV_X0 + t.x, y: r.top + t.y, w: BV_BX, h: BV_BY}; }));
  // 들어오는 곳: 위쪽 반이 다른 동이거나 없는 박스
  const ent = bvPanels(bld).filter(n => { const p = bvBoxPar(n); return !p || bk(p) !== bld; }).filter(n => R[n.id]).sort((a, b) => R[a.id].x - R[b.id].x || R[a.id].y - R[b.id].y);
  const srcOf = n => { let x = par(n), g = 0; while (x && g++ < 80) { if (bk(x) !== bld) return x; x = par(x); } return null; };
  // 밝게 보일 박스: TR·배전반·들어오는 곳 (+ 고른 반의 위쪽 경로와 하위)
  const lit = new Set(); bvPanels(bld).forEach(n => { if (n.type === 'TR' || n.type === 'MDB') lit.add(n.id); }); ent.forEach(n => lit.add(n.id));
  const G = [];   // 선 묶음 {from, to:[{id|rect}], col, fl}
  if (FO) {
    const chain = pathOf(FO).filter(n => BV_PT[n.type] && !isSlot(n) && bk(n) === bld && R[n.id]);
    chain.forEach(n => lit.add(n.id));
    for (let i = 0; i + 1 < chain.length; i++) G.push({from: chain[i], to: [R[chain[i + 1].id]], col: BV_VC(outV(chain[i]) || effV(chain[i]))});
    const ch = bvCh(FO.id, bld).filter(n => R[n.id]); ch.forEach(n => lit.add(n.id));
    const ld = rows.find(r => r.f === '@ld');
    const to = ch.map(n => R[n.id]).concat(ld ? ld.chips.map(t => ({x: BV_X0 + t.x, y: ld.top + t.y, w: BV_CW, h: BV_CH})) : []);
    if (to.length) G.push({from: FO, to, col: BV_VC(outV(FO) || effV(FO)), fl: 1});
  } else {
    bvPanels(bld).filter(n => n.type === 'TR' && R[n.id]).forEach(t => { const ch = bvCh(t.id, bld).filter(n => R[n.id]); if (ch.length) G.push({from: t, to: ch.map(n => R[n.id]), col: BV_VC(t.v2 || outV(t))}); });
  }
  const dim = n => !UIX.edit && !lit.has(n.id);
  const o = [`<svg xmlns="http://www.w3.org/2000/svg" id="bvSvg" viewBox="0 0 ${BV_W} ${y}" font-family="Malgun Gothic,sans-serif">` + BV_DEFS];
  // 위쪽 수전 줄
  const grp = {}; ent.forEach(n => { const s = srcOf(n), k = `${s ? bk(s) || '?' : '수전'} ${inV(n) || effV(n) || ''}`.trim(); grp[k] = (grp[k] || 0) + 1; });
  o.push(`<g class="bvHdr"><rect x="0" y="0" width="${BV_W}" height="${BV_HDR}" fill="#fff7ed"/><line x1="0" y1="${BV_HDR}" x2="${BV_W}" y2="${BV_HDR}" stroke="#94a3b8" stroke-width="2"/>
    <rect x="0" y="0" width="${BV_LW}" height="${BV_HDR}" fill="#ea580c"/><text x="${BV_LW / 2}" y="27" text-anchor="middle" font-size="17" font-weight="bold" fill="#fff">수전</text>
    <text x="${BV_LW / 2}" y="45" text-anchor="middle" font-size="10.5" fill="#ffedd5">${ent.length}회선</text>
    <text x="${BV_W - 12}" y="${BV_HDR / 2 + 5}" text-anchor="end" font-size="13" fill="#9a3412">${esc(Object.entries(grp).map(([k, v]) => `${k} ${v}회선`).join(' · '))}${ent.length ? ' 으로 받음' : '들어오는 선이 아직 없어요'}</text></g>`);
  // 박스: 흐린 것 → 선 → 밝은 것 순으로 (선이 흐린 박스 위로 지나가게)
  const boxes = []; rows.forEach(r => r.items.forEach(t => boxes.push({t, x: BV_X0 + t.x, y: r.top + t.y})));
  rows.forEach((r, i) => {
    if (r.f === '@ld') {
      o.push(`<g class="bvLd"><rect x="0" y="${r.top}" width="${BV_W}" height="${r.H}" fill="#f0fdf4"/><rect x="0" y="${r.top}" width="${BV_LW}" height="${r.H}" fill="#15803d"/>
        <text x="${BV_LW / 2}" y="${r.top + r.H / 2 - 2}" text-anchor="middle" font-size="13" font-weight="bold" fill="#fff">바로 나가는</text><text x="${BV_LW / 2}" y="${r.top + r.H / 2 + 14}" text-anchor="middle" font-size="13" font-weight="bold" fill="#fff">부하</text></g>`);
      return;
    }
    const cnt = t => r.items.filter(x => x.n.type === t).length;
    const sm = [['TR', 'TR'], ['MDB', '배전'], ['MCC', 'MCC'], ['UPS', 'UPS'], ['PNL', '분전']].filter(([t]) => cnt(t)).map(([t, l]) => `${l} ${cnt(t)}`);
    const sum = sm.slice(0, 2).join(' · '), sum2 = sm.slice(2).join(' · ');   // 길면 두 줄
    o.push(`<g class="bvRow" data-bvf="${esc(r.f)}"><rect x="0" y="${r.top}" width="${BV_W}" height="${r.H}" fill="${r.f ? (i % 2 ? '#f8fafc' : '#fff') : '#fff7ed'}"/>
      <line x1="0" y1="${r.top + r.H}" x2="${BV_W}" y2="${r.top + r.H}" stroke="#94a3b8" stroke-width="2"/>
      <rect x="0" y="${r.top}" width="${BV_LW}" height="${r.H}" fill="${r.f ? '#262f7d' : '#f59e0b'}"/>
      <text x="${BV_LW / 2}" y="${r.top + r.H / 2 + (sum ? -2 : 7)}" text-anchor="middle" font-size="${r.f ? 24 : 14}" font-weight="bold" fill="#fff">${r.f ? esc(r.f) : '층 미지정'}</text>
      ${sum ? `<text x="${BV_LW / 2}" y="${r.top + r.H / 2 + 16}" text-anchor="middle" font-size="10.5" fill="${r.f ? '#c7d2fe' : '#fff'}">${esc(sum)}</text>` : ''}${sum2 ? `<text x="${BV_LW / 2}" y="${r.top + r.H / 2 + 29}" text-anchor="middle" font-size="10.5" fill="${r.f ? '#c7d2fe' : '#fff'}">${esc(sum2)}</text>` : ''}
      ${r.items.length ? '' : `<text x="${BV_X0 + 20}" y="${r.top + r.H / 2 + 5}" font-size="13" fill="#94a3b8">${UIX.edit ? '여기로 박스를 끌어다 놓으세요' : '이 층에 놓인 반이 없어요'}</text>`}</g>`);
  });
  const openTxt = n => { const k = bvCh(n.id, bld).length; return k ? k : bvCanOpen(n, bld) ? '부하' : 0; };
  boxes.filter(b => dim(b.t.n)).forEach(b => o.push(bvBoxSvg(b.t, b.x, b.y, {dim: 1, open: openTxt(b.t.n)})));
  // 선
  const L = [];
  // 수전 → 들어오는 곳 (위에서 곧장 내려옴)
  let px = -1e9;
  ent.forEach(n => {
    const B = R[n.id]; let x = Math.max(B.x, px + 158); px = x;
    const s = srcOf(n), col = BV_VC(inV(n) || effV(s || n)), ex = B.x + 22;
    L.push(`<path d="M${x + 22},${BV_HDR - 14}V${B.y - BV_GY / 2}H${ex}V${B.y}" stroke="${col}" class="bvL"/>`);
    L.push(`<g class="bvP" data-bvn="${esc(n.id)}"><rect x="${x}" y="8" width="150" height="26" rx="13" fill="#fff" stroke="${col}" stroke-width="1.6"/><text x="${x + 75}" y="25" text-anchor="middle" font-size="11.5" font-weight="bold" fill="${col}">${esc(sdFit((s ? `${bk(s) === '유틸리티동' ? '유틸' : bk(s)} ${label(s)}` : '수전') + ' · ' + (inV(n) || ''), 140, 11.5))}</text></g>`);
  });
  G.forEach((g, s) => {
    const A = R[g.from.id]; if (!A) return;
    g.to.forEach(B => { const r = bvRoute(A, B, s); L.push(`<path d="${r.d}" stroke="${g.col}" class="bvL${g.fl ? ' fl' : ''}"/><circle cx="${r.ex}" cy="${r.ey}" r="3.2" fill="${g.col}"/>`); });
  });
  o.push(`<g class="bvLines">${L.join('')}</g>`);
  boxes.filter(b => !dim(b.t.n)).forEach(b => o.push(bvBoxSvg(b.t, b.x, b.y, {open: openTxt(b.t.n)})));
  const ld = rows.find(r => r.f === '@ld'); if (ld) ld.chips.forEach(t => o.push(bvChipSvg(t, BV_X0 + t.x, ld.top + t.y)));
  o.push('</svg>');
  return o.join('');
}
// 겹침 정리: 지금 보이는 순서(위→아래, 왼→오른)대로 빈틈없이 다시 채움
function bvTidy(bld, c) {
  (BV.rows || []).forEach(r => {
    const A = r.items.slice().sort((a, b) => a.y - b.y || a.x - b.x), taken = [];
    let cx = BV_PAD, cy = BV_PAD;
    A.forEach(t => { const q = bvFree(cx, cy, taken); taken.push(q); cx = q.x; cy = q.y; c.pos[t.n.id] = {f: r.f || '-', x: q.x, y: q.y}; });
  });
}
// 이동: 'plan' = 배전반/분전반/MCC반 도면 · 'load' = 부하도면 · 'dg' = 회로도
function bvGo(k, id) {
  const n = byId(id); if (!n) return;
  if (k === 'dg') { UI.tab = 'dg'; S.cfg.pvMode = 'pv'; }
  else { UI.tab = 'plan'; PL.lastSel = null; if (k === 'load' && BV_PT[n.type]) { PL.cur = plZK(id, 1); PL.keep = true; } }
  saveUI(); select(id, true);
}

/* ---------- 화면 ---------- */
function bvView() {
  const b = MAP_BLD.find(x => x.id === BV.b); if (!b) { BV.b = ''; return mapView(); }
  bvIndex();
  const bld = mapBldOf(b.id), c = bvCfg(bld), T = bvStats(bld, c), nm = mapName(b);
  const lists = BV.lists = {};
  const L = (k, a) => { lists[k] = a; return k; };
  const R = (k, v, key, sub) => `<span class="bvS"><em>${k}</em>${key && lists[key].length ? `<a data-bvl="${key}">${v}</a>` : v}${sub ? `<small>${sub}</small>` : ''}</span>`;
  const pathTxt = T.PA.paths.slice(0, 4).map(p => { const tr = p.chain.slice().reverse().find(n => n.type === 'TR'), mv = p.chain.slice().reverse().find(n => n.type === 'CB' && pV(effV(n)) >= 1000);
    return `${mv ? esc(label(mv)) + ' → ' : ''}${tr ? `<b>${esc(label(tr))}</b> ${esc(tr.kva || '?')}kVA` : esc(label(p.n))}`; }).join('<br>');
  const kwS = (v, n, tot) => n ? `${Math.round(v * 10) / 10} kW (${n}/${tot}회로 입력)` : 'kW 미입력';
  const vs = [...new Set(bvPanels(bld).map(n => effV(n) || '전압?'))].sort((a, b) => pV(b) - pV(a));
  return `<div class="bvBar"><button data-bva="back">◀ 공장 지도</button><h2>${esc(nm)}</h2>
      <span class="bvLg">${vs.map(v => `<i style="background:${BV_VC(v)}"></i>${esc(v)}`).join('')}<i class="d" style="background:#f59e0b"></i>중요 부하<i class="d" style="background:#dc2626"></i>비상</span><span class="sp"></span>
      <span class="bvMd"><button data-bva="card"${BV.mode === 'band' ? '' : ' class="on"'}>▤ 현황</button><button data-bva="band"${BV.mode === 'band' ? ' class="on"' : ''}>▦ 층 배치</button></span>
      ${UIX.edit && BV.mode === 'band' ? '<button data-bva="tidy">▦ 겹침 정리</button><button data-bva="reset">↺ 자동 배치</button><button data-bva="addf">+ 층 추가</button><button data-bva="delf">− 층 삭제</button>' : ''}
      <button data-bva="csv">📊 이 동 목록 엑셀</button></div>
    ${UIX.edit && BV.mode === 'band' ? '<div class="bvHint">✎ 편집: 박스를 끌어서 배치 · 다른 층 띠로 끌면 층이 바뀌어요 · 겹치면 옆 빈자리로 비켜요</div>' : ''}
    ${BV.mode === 'band' ? `<div class="bvSum">
      ${R('수전', T.TR.length ? `TR ${T.TR.length}대 · <b>${T.kva.toLocaleString()}</b> kVA` : '—', L('tr', T.TR))}
      ${R('배전반', `<b>${T.mdb.length}</b>`, L('mdb', T.mdb))}${R('ACB', `<b>${T.acb.length}</b>`, L('acb', T.acb))}${R('MCC반', `<b>${T.mcc.length}</b>`, L('mcc', T.mcc))}
      ${R('분전반', `<b>${T.pnl.length}</b>`, L('pnl', T.pnl))}${R('UPS', `<b>${T.ups.length}</b>대`, L('ups', T.ups))}
      ${R('비상부하', `<b>${T.em.length}</b>회로`, L('em', T.em), T.em.length ? kwS(T.emKw, T.emKwN, T.em.length) : '')}
      ${R('전체 회로', `<b>${T.cir.length}</b>`, L('cir', T.cir), kwS(T.kw, T.kwN, T.cir.length))}
      ${R('중요 부하', Object.keys(T.imp).length ? Object.entries(T.imp).map(([k, v]) => `${esc(k)} <b>${v}</b>`).join(' · ') : '<b>0</b>', L('imp', T.N.filter(n => n.imp)))}
      ${T.gen.length ? R('비상 전원', T.gen.map(n => `${esc(label(n))}${n.kw ? ' ' + esc(n.kw) + 'kW' : ''}`).join(' · '), L('gen', T.gen)) : ''}
      ${T.PA.paths.length ? `<span class="bvS pa"><em>받는 곳</em>${pathTxt.replace(/<br>/g, ' · ')}</span>` : ''}
    </div>` : `<div class="bvSub">${esc(bvSrcTxt(bld))}</div>`}
    ${BV.mode === 'band' ? `${bvFocusBar(bld)}<div id="bvW">${bvSvg(bld, c)}</div>` : `<svg width="0" height="0" style="position:absolute">${BV_DEFS}</svg>${bvStatus(bld, c, T, L)}`}`;
}
// 펼친 반 요약 줄 (없으면 안내 한 줄)
function bvFocusBar(bld) {
  if (UIX.edit) return '';
  const F = BV.f && byId(BV.f);
  if (!F || !BV_PT[F.type] || bk(F) !== bld) return '<div class="bvFo hint">👆 <b>배전반</b>을 누르면 하위 분전반·MCC반·부하까지 선이 이어져요 · 분전반을 누르면 <b>배전반/분전반/MCC반</b> 도면으로 가요</div>';
  bvIndex();
  const ch = bvCh(F.id, bld), d = bvLoads(F, bld), cnt = {};
  ch.forEach(n => { const k = bvKind(n).l; cnt[k] = (cnt[k] || 0) + 1; });
  const c = bvCfg(bld), fl = [...new Set(ch.map(n => bvFloorOf(n, c) || '층 미지정'))].sort((a, b) => bvLv(b) - bvLv(a));
  const chain = pathOf(F).filter(n => BV_PT[n.type] && !isSlot(n) && bk(n) === bld);
  const sum = [...Object.entries(cnt).map(([k, v]) => `${esc(k)} <b>${v}</b>`), d.L.length ? `부하 <b>${d.L.length}</b>` : '', d.out.length ? `다른 동 <b>${d.out.length}</b>` : '', d.sp ? `SPARE ${d.sp}` : '', fl.length ? esc(fl.join('·')) : ''].filter(Boolean).join(' · ');
  return `<div class="bvFo"><span class="cr">${chain.map(n => n.id === F.id ? `<b>${esc(label(n))}</b>` : `<a data-bvfo="${esc(n.id)}">${esc(label(n))}</a>`).join(' › ')}</span>
    <span class="sm">→ ${sum || '하위 없음'}</span><span class="sp"></span>
    <button data-bvj="plan">📍 도면 위치</button><button data-bvj="load">📄 부하도면</button><button data-bvj="dg">▦ 회로도</button><button data-bva="unf" title="접기">✕</button></div>`;
}
function bvList(key) {
  const c = bvCfg(mapBldOf(BV.b)), fo = n => { const f = bvFloorUp(n, c); return f ? bvLv(f) : 999; };   // 층 순서 (B1 → 1F → 2F …, 층 미지정은 맨 뒤)
  const A = ((BV.lists || {})[key] || []).slice().sort((a, b) => fo(a) - fo(b) || String(a.name || label(a)).localeCompare(String(b.name || label(b)), 'ko', {numeric: true}));
  uiModal(`<h3>${esc(mapName(MAP_BLD.find(x => x.id === BV.b)))} · ${A.length}개</h3><div class="mdlS"><table class="tb"><thead><tr><th>층</th><th>종류</th><th>명칭</th><th>사양</th><th>상위</th></tr></thead><tbody>
    ${A.slice(0, 800).map(n => `<tr class="c" data-bvgo="${esc(n.id)}"><td>${esc(bvFloorUp(n, c))}</td><td>${esc(tlabel(n))}</td><td>${esc(label(n))}</td><td>${esc(spec(n))}${n.kw ? ' · ' + esc(n.kw) + 'kW' : ''}</td><td>${esc(par(n) ? label(par(n)) : '')}</td></tr>`).join('')}
    </tbody></table></div><div class="mdlA"><button data-mdl="x">닫기</button></div>`, true);
}
function bvCsv() {
  const bld = mapBldOf(BV.b), c = bvCfg(bld), rows = [['층', '종류', '번호', '명칭', '전압', '정격', 'kW', '전원', '중요 부하', '상위', '경로']];
  S.nodes.filter(n => bk(n) === bld && !isSlot(n)).forEach(n => rows.push([bvFloorUp(n, c) || '층 미지정', tlabel(n), n.no || '', n.name || '', effV(n), spec(n), n.kw || '', SRC[effSrc(n)], n.imp || '', par(n) ? label(par(n)) : '', pathOf(n).slice(0, -1).map(label).join(' › ')]));
  download(new Blob(['﻿' + rows.map(r => r.map(csvQ).join(',')).join('\r\n')], {type: 'text/csv'}), `${bld}_설비목록_${stamp()}.csv`);
}
/* ---------- 공통 (현황 보기) ---------- */
// 배전반 아래 모든 반 (이 동 안, 여러 단계)
function bvDesc(P, bld) { const o = []; const w = n => bvCh(n.id, bld).forEach(k => { o.push(k); w(k); }); w(P); return o; }
const bvSrcOf = (n, bld) => { let x = par(n), g = 0; while (x && g++ < 80) { if (bk(x) !== bld) return x; x = par(x); } return null; };
const bvMini = (n, w) => `<svg class="pic" viewBox="0 0 40 54" width="${w}" height="${Math.round(w * 1.35)}">${bvPic(n, 0, 0)}</svg>`;
const bvFlTxt = f => f || '층 미지정';
const bvFlSort = (a, b) => (a === '' ? 1 : 0) - (b === '' ? 1 : 0) || bvLv(b) - bvLv(a);
// 건물 단면: 층마다 숫자 · 펼친 배전반이 가는 층은 노랗게 · 수전 화살표
function bvSecSvg(bld, c, hot, ent) {
  const F = c.floors.slice().sort((a, b) => bvLv(b) - bvLv(a)), P = bvPanels(bld), un = P.filter(n => !bvFloorOf(n, c));
  const W = 270, X0 = 46, BW = 200, FH = 46, RT = 18, hc = {}; hot.forEach(n => { const f = bvFloorOf(n, c); hc[f] = (hc[f] || 0) + 1; });
  const H = RT + F.length * FH + (un.length ? 44 : 10);
  const eF = new Set(ent.map(n => bvFloorOf(n, c)));
  const o = [`<svg viewBox="0 0 ${W} ${H}" font-family="Malgun Gothic,sans-serif"><path d="M${X0 - 6} ${RT} L${X0 + 20} 4 H${X0 + BW - 20} L${X0 + BW + 6} ${RT}Z" fill="#cbd5e1" stroke="#64748b"/>`];
  F.forEach((f, i) => {
    const y = RT + i * FH, L = P.filter(n => bvFloorOf(n, c) === f), k = t => L.filter(n => n.type === t).length, h = hc[f];
    const txt = [['TR', 'TR'], ['MDB', '배전'], ['MCC', 'MCC'], ['UPS', 'UPS'], ['PNL', '분전']].filter(([t]) => k(t)).map(([t, l]) => `${l} ${k(t)}`).join(' · ') || '—';
    o.push(`<g class="bvFl${h ? ' hot' : ''}" data-bvfl="${esc(f)}" style="cursor:pointer"><title>${esc(f)} 반 목록 보기</title>
      <rect x="${X0}" y="${y}" width="${BW}" height="${FH}" fill="${h ? '#fef3c7' : i % 2 ? '#f1f5f9' : '#f8fafc'}" stroke="${h ? '#f59e0b' : '#94a3b8'}" stroke-width="${h ? 2.5 : 1.2}"/>
      ${[0, 1, 2, 3, 4, 5].map(j => `<rect x="${X0 + 10 + j * 31}" y="${y + 6}" width="20" height="7" rx="1" fill="${h ? '#fde68a' : '#dbe3ee'}"/>`).join('')}
      <text x="${X0 - 8}" y="${y + 29}" text-anchor="end" font-size="15" font-weight="bold" fill="#262f7d">${esc(f)}</text>
      <text x="${X0 + 10}" y="${y + 34}" font-size="11.5" fill="#334155">${esc(txt)}</text>
      ${h ? `<text x="${X0 + BW - 8}" y="${y + 34}" text-anchor="end" font-size="13" font-weight="bold" fill="#b45309">▶ ${h}면</text>` : ''}
      ${eF.has(f) ? `<path d="M2 ${y + 23}H${X0 - 30}" stroke="#ea580c" stroke-width="3"/><path d="M${X0 - 32} ${y + 18}l6 5-6 5z" fill="#ea580c"/><text x="2" y="${y + 17}" font-size="9.5" font-weight="bold" fill="#ea580c">수전</text>` : ''}</g>`);
  });
  const gy = RT + F.length * FH;
  o.push(`<path d="M${X0 - 14} ${gy}H${X0 + BW + 14}" stroke="#57534e" stroke-width="3"/>`);
  if (un.length) { const h = hc[''];
    o.push(`<g class="bvFl${h ? ' hot' : ''}" data-bvfl="" style="cursor:pointer"><title>층 미지정 반 목록</title><rect x="${X0}" y="${gy + 8}" width="${BW}" height="30" rx="4" fill="${h ? '#fef3c7' : '#fff7ed'}" stroke="${h ? '#f59e0b' : '#fdba74'}" stroke-dasharray="4 3"/>
      <text x="${X0 + 10}" y="${gy + 28}" font-size="11.5" fill="#9a3412">층 미지정 ${un.length}면</text>${h ? `<text x="${X0 + BW - 8}" y="${gy + 28}" text-anchor="end" font-size="13" font-weight="bold" fill="#b45309">▶ ${h}면</text>` : ''}</g>`); }
  o.push('</svg>');
  return o.join('');
}
/* ---------- 현황 보기 (기본): UPS 목록(→ UPS 부하) · 중요 부하 목록 · 오른쪽 건물 단면 ---------- */
// 그 반 아래 끝 회로들 (예비·빈 자리 제외)
function bvLeaves(P) { const o = []; const w = n => kids(n.id).forEach(k => { if (isSlot(k)) return; if (kids(k.id).length) return w(k); if ((k.type === 'LOAD' || k.type === 'CB') && !ckSpare(k)) o.push(k); }); w(P); return o; }
const bvUpsOf = n => { let x = par(n), g = 0; while (x && g++ < 80) { if (x.type === 'UPS') return x; x = par(x); } return null; };
const bvPanelOf = n => { let x = par(n), g = 0; while (x && g++ < 80) { if (BV_PT[x.type]) return x; x = par(x); } return null; };
function bvLoadRow(n, c, cols) {
  const p = bvPanelOf(n), bkp = effSrc(n) === 'E' ? '<span class="bk e">비상 발전기</span>' : bvUpsOf(n) ? '<span class="bk u">UPS</span>' : '<span class="bk x">백업 없음</span>';
  const m = {cat: `<td>${n.imp ? `<span class="ic">${esc(n.imp)}</span>` : '<span class="mu">—</span>'}</td>`, name: `<td class="nm">${esc(n.name || label(n))}${n.no ? ` <small>#${esc(n.no)}</small>` : ''}</td>`, pnl: `<td>${p ? esc(label(p)) : ''}</td>`,
    fl: `<td class="ce">${esc(bvFloorUp(n, c) || '—')}</td>`, sp: `<td class="mu2">${esc(spec(n))}${n.kw ? ' · ' + esc(n.kw) + 'kW' : ''}</td>`, bk: `<td>${bkp}</td>`};
  return `<tr class="c" data-bvld="${esc(n.id)}" title="${esc(pathOf(n).map(label).join(' › '))}\n누르면 부하도면">${cols.map(k => m[k]).join('')}</tr>`;
}
const bvUNm = u => label(u).replace(/\s*\(?\s*\d+(\.\d+)?\s*kva\s*\)?/i, '').trim() || label(u);   // 이름에서 (60KVA) 떼기 (용량은 배지로)
const bvKva = n => n.kva ? n.kva + 'kVA' : (((n.name || '').match(/(\d+(\.\d+)?)\s*kVA/i) || [])[0] || '').replace(/kva/i, 'kVA');
// 위 숫자 타일: TR · 배전반(ACB) · MCC반 · 분전반 · UPS · 중요 부하 (누르면 목록)
function bvKpi(bld, T, L, U, imp, nb) {
  const pic = t => `<svg viewBox="0 0 40 54" width="24" height="32">${t === 'TR' ? bvPicTR() : t === 'MDB' ? bvPicMDB(1) : t === 'MCC' ? bvPicMCC() : t === 'UPS' ? bvPicUPS() : bvPicPNL()}</svg>`;
  const k = (key, list, p, num, lb, sub, cls) => `<a class="kp${cls ? ' ' + cls : ''}"${list.length ? ` data-bvl="${L(key, list)}"` : ''}>${p}<span class="kt"><b>${num}</b><em>${lb}</em>${sub ? `<small>${sub}</small>` : ''}</span></a>`;
  return `<div class="bvKpi">
    ${k('tr', T.TR, pic('TR'), T.TR.length, 'TR', T.kva ? T.kva.toLocaleString() + ' kVA' : '')}
    ${k('mdb', T.mdb, pic('MDB'), T.mdb.length, '배전반', T.acb.length ? `ACB ${T.acb.length}` : '')}
    ${k('mcc', T.mcc, pic('MCC'), T.mcc.length, 'MCC반', '')}
    ${k('pnl', T.pnl, pic('PNL'), T.pnl.length, '분전반', `회로 ${T.cir.length}`)}
    ${k('ups', U, pic('UPS'), U.length, 'UPS', (() => { const t = U.reduce((a, u) => a + (parseFloat(bvKva(u)) || 0), 0); return t ? '합계 ' + t.toLocaleString() + ' kVA' : ''; })(), 'u')}
    ${k('imp', imp, '<span class="star">★</span>', imp.length, '중요 부하', nb ? `백업 없음 <span class="w">${nb}</span>` : imp.length ? '모두 백업' : '', 'i')}
  </div>`;
}
function bvUpsH(bld, c) {
  const U = S.nodes.filter(n => n.type === 'UPS' && !isSlot(n) && bk(n) === bld).sort((a, b) => (bvFloorUp(a, c) ? bvLv(bvFloorUp(a, c)) : 999) - (bvFloorUp(b, c) ? bvLv(bvFloorUp(b, c)) : 999) || label(a).localeCompare(label(b), 'ko', {numeric: true}));
  const loose = S.nodes.filter(n => n.imp === 'UPS' && bk(n) === bld && !bvUpsOf(n) && !kids(n.id).length);
  const tiles = U.map(u => ({id: u.id, u, L: bvLeaves(u)}));
  if (loose.length) tiles.push({id: '@loose', L: loose});
  if (!tiles.length) return `<section class="bvBox"><div class="bh"><h3>UPS</h3><span class="pill">0대</span></div><div class="emp">이 동에 UPS가 아직 없어요. 계통 트리에 UPS를 넣으면 여기 타일로 나와요.</div></section>`;
  const cur = tiles.find(t => t.id === BV.u) || tiles[0];
  const tile = t => { const u = t.u, im = t.L.filter(n => n.imp).length;
    return `<button class="ut${t === cur ? ' on' : ''}${u ? '' : ' lo'}" data-bvu="${esc(t.id)}">
      ${u ? `<svg viewBox="0 0 40 54" width="26" height="35">${bvPicUPS()}</svg>` : '<span class="q">?</span>'}
      <span class="un"><b title="${u ? esc(label(u)) : ''}">${u ? esc(bvUNm(u)) : 'UPS 미연결 부하'}</b><span>${u ? `${bvKva(u) ? `<i class="kv">${esc(bvKva(u))}</i>` : ''}<i class="fl">${esc(bvFloorUp(u, c) || '층?')}</i>` : '<i class="fl">트리 연결 필요</i>'}</span></span>
      <span class="uc"><b>${t.L.length}</b><small>부하${im ? ` · 중요 ${im}` : ''}</small></span></button>`; };
  let det;
  if (cur.u) {
    const u = cur.u, inp = bvPanelOf(u), out = bvCh(u.id, bld);
    det = `<div class="uf"><span class="nd">${inp ? `<em>입력</em>${esc(label(inp))}` : '<em>입력</em>—'}</span><span class="ar">→</span>
        <span class="nd u"><em>UPS</em>${esc(bvUNm(u))}${bvKva(u) ? ' · ' + esc(bvKva(u)) : ''}</span><span class="ar">→</span>
        <span class="nd">${out.length ? `<em>출력</em>${out.map(x => esc(label(x))).join(' · ')}` : '<em>출력</em>—'}</span><span class="sp"></span><button data-bvgo2="${esc(u.id)}">📍 도면 위치</button></div>`;
  } else det = `<div class="uf"><span class="nd x">중요 부하 분류를 'UPS'로 했지만 트리에서 UPS 아래에 연결되지 않은 부하예요. 트리에서 해당 UPS 출력 분전반 아래로 옮기면 그 UPS로 들어가요.</span></div>`;
  const mp = new Set(cur.L.map(n => (bvPanelOf(n) || {}).id)).size > 1;   // 분전반이 여러 개일 때만 분전반 칸
  det += cur.L.length ? `<div class="tw"><table class="tb bvT"><thead><tr><th>부하</th>${mp ? '<th>분전반</th>' : ''}<th class="ce">층</th><th>정격</th><th>중요 분류</th></tr></thead><tbody>${cur.L.map(n => bvLoadRow(n, c, mp ? ['name', 'pnl', 'fl', 'sp', 'cat'] : ['name', 'fl', 'sp', 'cat'])).join('')}</tbody></table></div>`
    : '<div class="emp">이 UPS 아래 회로가 아직 없어요. 출력 분전반에 회로를 넣으면 여기 나와요.</div>';
  return `<section class="bvBox"><div class="bh"><h3>UPS</h3><span class="pill g">${U.length}대</span><span class="mu">부하 ${tiles.reduce((s, t) => s + t.L.length, 0)}</span></div>
    <div class="ug">${tiles.map(tile).join('')}</div><div class="ud">${det}</div></section>`;
}
function bvImpH(bld, c, A) {
  const cats = {}; A.forEach(n => { cats[n.imp] = (cats[n.imp] || 0) + 1; });
  const nb = A.filter(n => effSrc(n) !== 'E').length;
  const f = BV.ic && (cats[BV.ic] || BV.ic === '@nb') ? BV.ic : '';
  const L = A.filter(n => !f || (f === '@nb' ? effSrc(n) !== 'E' : n.imp === f)).sort((a, b) => (IMP_CATS.indexOf(a.imp) - IMP_CATS.indexOf(b.imp)) || label(a).localeCompare(label(b)));
  return `<section class="bvBox"><div class="bh"><h3>중요 부하</h3><span class="pill a">${A.length}</span><span class="mu">UPS 부하는 위 UPS에서</span></div>
    ${A.length ? `<div class="seg2"><button data-bvic=""${f ? '' : ' class="on"'}>전체 <b>${A.length}</b></button>${Object.keys(cats).sort((a, b) => IMP_CATS.indexOf(a) - IMP_CATS.indexOf(b)).map(k => `<button data-bvic="${esc(k)}"${f === k ? ' class="on"' : ''}>${esc(k)} <b>${cats[k]}</b></button>`).join('')}${nb ? `<button data-bvic="@nb" class="w${f === '@nb' ? ' on' : ''}">백업 없음 <b>${nb}</b></button>` : ''}</div>
      <div class="tw"><table class="tb bvT"><thead><tr><th>분류</th><th>부하</th><th>분전반</th><th class="ce">층</th><th>정격</th><th>백업</th></tr></thead><tbody>${L.map(n => bvLoadRow(n, c, ['cat', 'name', 'pnl', 'fl', 'sp', 'bk'])).join('')}</tbody></table></div>`
    : '<div class="emp">중요 부하로 체크한 회로가 아직 없어요. 회로 속성창이나 [📁 파일 → 엑셀 일괄 수정]에서 체크하면 여기 모여요.</div>'}</section>`;
}
// 제목 아래 한 줄: 어디서 몇 회선으로 받는지
function bvSrcTxt(bld) {
  const ent = bvPanels(bld).filter(n => { const p = bvBoxPar(n); return !p || bk(p) !== bld; }), g = {};
  ent.forEach(n => { const s = bvSrcOf(n, bld), k = `${s ? bk(s) : '수전'} ${inV(n) || ''}`.trim(); (g[k] = g[k] || []).push(s ? label(s) : ''); });
  return Object.entries(g).map(([k, a]) => `${k} ${a.length}회선 수전${a.filter(Boolean).length ? ' (' + a.filter(Boolean).join(' · ') + ')' : ''}`).join('  ·  ');
}
function bvStatus(bld, c, T, L) {
  bvIndex();
  const ent = bvPanels(bld).filter(n => { const p = bvBoxPar(n); return !p || bk(p) !== bld; });
  const U = S.nodes.filter(n => n.type === 'UPS' && !isSlot(n) && bk(n) === bld);
  const imp = S.nodes.filter(n => n.imp && bk(n) === bld && !isSlot(n) && n.imp !== 'UPS' && !bvUpsOf(n));   // UPS 부하는 UPS 쪽으로
  const nb = imp.filter(n => effSrc(n) !== 'E').length;
  return `${bvKpi(bld, T, L, U, imp, nb)}<div class="bvD"><div class="bvCards">${bvUpsH(bld, c)}${bvImpH(bld, c, imp)}</div>
    <section class="bvSec bvBox"><div class="bh"><h3>층별</h3><span class="mu">층을 누르면 목록</span></div>${bvSecSvg(bld, c, [], ent)}</section></div>`;
}

// 층을 누르면: 그 층 반 목록 (어느 배전반에서 오는지)
function bvFloorList(f) {
  const bld = mapBldOf(BV.b), c = bvCfg(bld);
  const A = bvPanels(bld).filter(n => bvFloorOf(n, c) === f).sort((a, b) => BV_ORD[a.type] - BV_ORD[b.type] || String(a.name || label(a)).localeCompare(String(b.name || label(b)), 'ko', {numeric: true}));
  const top = n => { let x = bvBoxPar(n), last = null, g = 0; while (x && bk(x) === bld && g++ < 40) { if (x.type === 'MDB') last = x; x = bvBoxPar(x); } return last; };
  uiModal(`<h3>${esc(mapName(MAP_BLD.find(x => x.id === BV.b)))} · ${esc(bvFlTxt(f))} · ${A.length}면</h3><div class="mdlS"><table class="tb"><thead><tr><th></th><th>종류</th><th>명칭</th><th>전압</th><th>받는 배전반</th><th>바로 위</th></tr></thead><tbody>
    ${A.map(n => { const t = top(n), p = bvBoxPar(n); return `<tr class="c" data-bvp="${esc(n.id)}"><td>${bvMini(n, 14)}</td><td>${esc(bvKind(n).l)}</td><td>${esc(label(n))}</td><td>${esc(effV(n))}</td><td>${t ? esc(label(t)) : ''}</td><td>${p && (!t || p.id !== t.id) ? esc(label(p)) : ''}</td></tr>`; }).join('')}
    </tbody></table></div><div class="mdlA"><button data-mdl="x">닫기</button></div>`, true);
}

/* ---------- 이벤트 ---------- */
let BV_LC = {id: '', t: 0};
const bvPt = e => { const sv = document.getElementById('bvSvg'), p = sv.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(sv.getScreenCTM().inverse()); };
document.addEventListener('click', e => {
  if (UI.tab !== 'map' || !e.target.closest) return;
  const t = e.target;
  // 공장 지도에서 건물 더블클릭 (첫 클릭에 화면이 다시 그려져서 dblclick 대신 클릭 간격으로)
  const mb = !BV.b && t.closest('#mapSvg .mpB');
  if (mb) { const id = mb.dataset.mpb, now = Date.now();
    if (BV_LC.id === id && now - BV_LC.t < 450) { e.stopPropagation(); BV_LC = {id: '', t: 0}; BV.b = id; BV.f = ''; MAP.selB = ''; renderView(); return; }
    BV_LC = {id, t: now}; }
  if (t.closest('[data-mpa="inside"]') && MAP.selB) { BV.b = MAP.selB; BV.f = ''; renderView(); return; }
  const go = t.closest('[data-bvgo]'); if (go) { uiModalClose(); select(go.dataset.bvgo, true); return; }
  if (!BV.b) return;
  if (BV.drag && BV.drag.moved) return;
  const a = t.closest('[data-bva]');
  if (a) {
    const v = a.dataset.bva, bld = mapBldOf(BV.b), c = bvCfg(bld);
    if (v === 'back') { MAP.selB = BV.b; BV.b = ''; BV.f = ''; }
    else if (v === 'unf') BV.f = '';
    else if (v === 'card' || v === 'band') { BV.mode = v; try { localStorage.setItem('ckd_elec2_bvmode', v); } catch (e) {} }
    else if (v === 'csv') { bvCsv(); return; }
    else if (v === 'tidy') { bvTidy(bld, c); save(); }
    else if (v === 'reset') { if (!confirm('끌어서 옮긴 위치를 지우고 자동 배치로 돌릴까요? (층은 그대로)')) return; Object.values(c.pos).forEach(p => { delete p.x; delete p.y; }); save(); }
    else if (v === 'addf') { const f = (prompt('추가할 층 (예: 4F, B1)', (Math.max(0, ...c.floors.map(bvLv)) + 1) + 'F') || '').trim().toUpperCase(); if (!f) return; if (!c.floors.includes(f)) { c.floors.push(f); c.floors.sort((x, y) => bvLv(x) - bvLv(y)); save(); } }
    else if (v === 'delf') { const f = (prompt(`지울 층 (${c.floors.join(', ')}) — 그 층의 반은 '층 미지정'으로 가요`) || '').trim().toUpperCase(); if (!c.floors.includes(f)) return;
      bvPanels(bld).forEach(n => { if (bvFloorOf(n, c) === f) c.pos[n.id] = {f: '-'}; }); c.floors = c.floors.filter(x => x !== f); save(); }
    renderView(); return;
  }
  const ls = t.closest('[data-bvl]'); if (ls) { bvList(ls.dataset.bvl); return; }
  const fo = t.closest('[data-bvfo]'); if (fo) { BV.f = fo.dataset.bvfo; renderView(); return; }
  const j = t.closest('[data-bvj]'); if (j && BV.f) { bvGo(j.dataset.bvj, BV.f); return; }
  const bld = mapBldOf(BV.b);
  // 현황 보기: UPS 펼치기 · 부하 줄 = 부하도면 · 목록 항목 = 도면 · 단면 층 = 그 층 목록
  const ru = t.closest('[data-bvu]'); if (ru) { BV.u = ru.dataset.bvu; if (byId(BV.u)) select(BV.u, true); else renderView(); return; }   // UPS 타일 = 계통 트리에서도 펼쳐서 표시
  const rg = t.closest('[data-bvgo2]'); if (rg) { bvGo('plan', rg.dataset.bvgo2); return; }
  const rl = t.closest('[data-bvld]'); if (rl) { e.stopPropagation(); bvGo('load', rl.dataset.bvld); return; }   // #view의 tr.c 공통 처리로 안 넘어가게
  const ri = t.closest('[data-bvic]'); if (ri) { BV.ic = ri.dataset.bvic; renderView(); return; }
  const rp = t.closest('[data-bvp]'); if (rp) { uiModalClose(); bvGo('plan', rp.dataset.bvp); return; }
  const rf = t.closest('[data-bvfl]'); if (rf) { bvFloorList(rf.dataset.bvfl); return; }
  // 반 박스: 하위가 있으면 펼치기 (펼친 걸 한 번 더 = 도면), 없으면 바로 배전반/분전반/MCC반 도면
  const n = t.closest('#bvSvg .bvN, #bvSvg .bvP');
  if (n) { const x = byId(n.dataset.bvn); if (!x) return;
    if (!UIX.edit && BV.f !== x.id && bvCanOpen(x, bld)) { BV.f = x.id; renderView(); return; }
    bvGo('plan', x.id); return; }
  // 부하 칩: 부하도면 · 다른 동 칩: 그 동 안 보기
  const cp = t.closest('#bvSvg .bvC, .bvOp [data-bvc]');
  if (cp) { const id = cp.dataset.bvc;
    if (id === '@more') { bvGo('dg', BV.f); return; }
    const x = byId(id); if (!x) return;
    if (bk(x) !== bld) { const mb = mapByBld(bk(x)); if (mb) { BV.b = mb.id; BV.f = BV_PT[x.type] ? x.id : ''; renderView(); } else { UI.tab = 'sld'; saveUI(); select(x.id, true); } return; }
    bvGo('load', x.id); return; }
  if (t.closest('#bvSvg') && BV.f && !UIX.edit) { BV.f = ''; renderView(); }   // 빈 곳 = 접기
}, true);
// 편집 모드: 끌어서 배치 (다른 층 띠로 놓으면 층도 바뀜)
document.addEventListener('pointerdown', e => {
  if (UI.tab !== 'map' || !BV.b || !UIX.edit || e.button !== 0 || !e.target.closest) return;
  const g = e.target.closest('#bvSvg .bvN'); if (!g) return;
  const tr = g.getAttribute('transform').match(/translate\(([-\d.]+),([-\d.]+)\)/);
  BV.drag = {g, id: g.dataset.bvn, x0: +tr[1], y0: +tr[2], p0: bvPt(e), moved: false}; e.preventDefault();
});
document.addEventListener('pointermove', e => {
  const d = BV.drag; if (!d) return;
  const p = bvPt(e), dx = p.x - d.p0.x, dy = p.y - d.p0.y; if (!d.moved && Math.abs(dx) + Math.abs(dy) < 5) return;
  if (!d.moved) { d.moved = true; d.g.parentNode.appendChild(d.g); d.g.style.opacity = '.85'; }   // 맨 위로
  d.g.setAttribute('transform', `translate(${d.x0 + dx},${d.y0 + dy})`);
});
document.addEventListener('pointerup', e => {
  const d = BV.drag; if (!d) return;
  setTimeout(() => { BV.drag = null; }, 0);
  if (!d.moved) return;
  const p = bvPt(e), X = d.x0 + p.x - d.p0.x, Y = d.y0 + p.y - d.p0.y, cy = Y + BV_BY / 2;
  const rows = BV.rows || [], r = rows.find(q => cy >= q.top && cy < q.top + q.H) || (rows.length && cy < rows[0].top ? rows[0] : rows[rows.length - 1]);
  if (!r) return;
  const bld = mapBldOf(BV.b), c = bvCfg(bld), sn = v => Math.round(v / 10) * 10;
  const want = {x: Math.max(BV_PAD, Math.min(BV_W - BV_X0 - BV_BX - BV_PAD, sn(X - BV_X0))), y: Math.max(BV_PAD, sn(Y - r.top))};
  const others = r.items.filter(t => t.n.id !== d.id && t.fixed);   // 옮겨 둔 박스만 피함 (자동 박스는 알아서 비켜감)
  const q = bvFree(want.x, want.y, others);
  c.pos[d.id] = {f: r.f || '-', x: q.x, y: q.y};
  save(); renderView();
});

(function () {
  const s = document.createElement('style');
  s.textContent = `
#view .bvBar{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:8px}
#view .bvBar h2{margin:0 6px;color:#262f7d;font-size:18px}#view .bvBar .sp{flex:1}
#view .bvBar button{padding:5px 11px;border:1px solid #d6dbe8;background:#fff;border-radius:6px;font-size:12.5px;cursor:pointer}
#view .bvBar button[data-bva="back"]{background:#262f7d;color:#fff;border-color:#262f7d}
#view .bvLg{font-size:12px;color:#475569;display:inline-flex;gap:4px;align-items:center;flex-wrap:wrap}#view .bvLg i{display:inline-block;width:6px;height:16px;border-radius:3px;margin-left:8px}#view .bvLg i.d{width:9px;height:9px;border-radius:50%}
#view .bvHint{font-size:12px;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:5px 9px;margin-bottom:6px}
#bvW{flex:1;min-width:0;border:2px solid #94a3b8;border-radius:10px;overflow:hidden;background:#fff}#bvW svg{display:block;width:100%;height:auto;user-select:none}
body:not(.ro) #bvW svg{touch-action:none}#bvW .bvN:hover rect:first-child{stroke-width:3}
#bvW .bvN.dim{opacity:.32}#bvW .bvN.dim:hover{opacity:.75}#bvW .bvP{cursor:pointer}
#bvW .bvL{fill:none;stroke-width:2.6;stroke-linejoin:round;stroke-linecap:round}
#bvW .bvL.fl{stroke-width:3;stroke-dasharray:9 5;animation:bvFl 1s linear infinite}@keyframes bvFl{to{stroke-dashoffset:-14}}
#bvW .bvC:hover rect{stroke-width:2.6}
#view .bvFo{display:flex;flex-wrap:wrap;gap:6px;align-items:center;background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:5px 10px;margin-bottom:6px;font-size:12.5px}
#view .bvFo.hint{display:block;background:#f8fafc;border-color:#e2e8f0;color:#475569}
#view .bvFo .cr a{color:#262f7d;cursor:pointer;text-decoration:underline dotted}#view .bvFo .cr b{color:#b45309;font-size:14px}#view .bvFo .sm{color:#475569}#view .bvFo .sm b{color:#262f7d}
#view .bvMd{display:inline-flex;border:1px solid #c7d2fe;border-radius:7px;overflow:hidden}#view .bvMd button{border:0;border-radius:0;background:#fff;color:#475569}#view .bvMd button.on{background:#262f7d;color:#fff}
#view .bvD{display:flex;gap:12px;align-items:flex-start}
#view .bvCards{flex:1;min-width:0;display:flex;flex-direction:column;gap:10px}
#view .bvCard{border:1.5px solid #cbd5e1;border-radius:10px;background:#fff;overflow:hidden}
#view .bvCh{display:flex;align-items:center;gap:8px;padding:6px 10px;background:#fff7ed;border-bottom:1px solid #fed7aa;font-size:12.5px;color:#7c2d12}#view .bvCh b{font-size:15px;color:#9a3412}#view .bvCh .src{color:#c2410c}#view .bvCh .sp{flex:1}
#view .bvCh .flb,#view .bvR .fl i{display:inline-block;background:#e0e7ff;color:#262f7d;border-radius:9px;padding:0 7px;font-size:11px;font-style:normal;font-weight:700;margin:2px 3px 0 0}
#view .srcL{font-size:11.5px;color:#c2410c;padding:4px 12px 0}
#view .bvR{display:flex;align-items:center;gap:10px;padding:7px 12px;border-top:1px solid #eef2f7;cursor:pointer}#view .bvR:hover{background:#f8fafc}#view .bvR.on{background:#fffbeb;box-shadow:inset 4px 0 #f59e0b}#view .bvR.x{cursor:default}
#view .bvR .pic{flex:none}#view .bvR .t{width:190px;flex:none;display:flex;flex-direction:column;font-size:11.5px;color:#64748b}#view .bvR .t b{font-size:14px;color:#0f172a}#view .bvR .t em{font-style:normal;font-weight:700}
#view .bvR .s{flex:1;font-size:12px;color:#475569}#view .bvR .s b{color:#262f7d}#view .bvR .ar{color:#94a3b8;font-size:14px;font-weight:700}#view .bvR.on .ar{color:#f59e0b}
#view .mu{color:#94a3b8;font-size:12px}
#view .bvOp{background:#fffdf5;border-top:1px dashed #fcd34d;padding:6px 12px 10px 52px}
#view .bvOp .act{display:flex;gap:6px;align-items:center;margin-bottom:4px}#view .bvOp .act button{padding:3px 9px;border:1px solid #d6dbe8;background:#fff;border-radius:6px;font-size:12px;cursor:pointer}
#view .bvOp .fr{display:flex;gap:8px;align-items:flex-start;padding:4px 0;border-top:1px solid #f1f5f9}
#view .bvOp .fr>em{flex:none;width:58px;font-style:normal;font-weight:800;color:#fff;background:#262f7d;border-radius:5px;text-align:center;font-size:12px;padding:3px 0;margin-top:2px}#view .bvOp .fr>em.un{background:#f59e0b}#view .bvOp .fr>em.ld{background:#15803d}
#view .bvOp .its{display:flex;flex-wrap:wrap;gap:5px}
#view .bvOp .its .bvI{width:auto;flex:0 0 auto;margin:0}#view .bvI{display:inline-flex;align-items:center;gap:5px;padding:3px 9px 3px 5px;border:1px solid #cbd5e1;background:#fff;border-radius:16px;font-size:12px;cursor:pointer}#view .bvI:hover{border-color:#262f7d;background:#eef2ff}
#view .bvI small{color:#94a3b8}#view .bvI small.up{color:#7c3aed}#view .bvI.ld{color:#15803d;border-color:#86efac;background:#f0fdf4}#view .bvI.out{color:#0e7490;border-color:#67e8f9;background:#ecfeff}
#view .bvSub{font-size:12.5px;color:#9a3412;margin:-2px 0 10px 2px}
#view .bvKpi{display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:10px;margin-bottom:12px}
#view .kp{display:flex;flex-wrap:nowrap;flex-direction:row;align-items:center;gap:8px;min-width:0;padding:9px 10px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;box-shadow:0 1px 2px rgba(15,23,42,.06);color:inherit;text-decoration:none}
#view .kp[data-bvl]{cursor:pointer}#view .kp[data-bvl]:hover{border-color:#262f7d;box-shadow:0 2px 8px rgba(38,47,125,.15)}
#view .kp .kt{display:flex;flex-direction:column;line-height:1.15;min-width:0}#view .kp .kt>b{font-size:22px;color:#0f172a}#view .kp .kt em{font-style:normal;font-size:12px;color:#64748b;font-weight:700}#view .kp svg{flex:none}#view .kp .kt small{font-size:11px;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#view .kp.u{background:#f0fdf4;border-color:#bbf7d0}#view .kp.u .kt>b{color:#15803d}#view .kp.i{background:#fffbeb;border-color:#fde68a}#view .kp.i .kt>b{color:#b45309}#view .kp.i small .w{color:#dc2626;font-weight:800}
#view .kp .star{font-size:26px;color:#f59e0b;width:30px;text-align:center}
#view .bvBox{background:#fff;border:1px solid #e2e8f0;border-radius:12px;box-shadow:0 1px 2px rgba(15,23,42,.06);padding:12px 14px}
#view .bvBox .bh{display:flex;align-items:center;gap:8px;margin-bottom:10px}#view .bvBox h3{margin:0;font-size:15px;color:#0f172a}
#view .pill{background:#e2e8f0;color:#334155;border-radius:10px;padding:1px 9px;font-size:12px;font-weight:700}#view .pill.g{background:#dcfce7;color:#15803d}#view .pill.a{background:#fef3c7;color:#b45309}
#view .emp{color:#94a3b8;font-size:12.5px;padding:14px;text-align:center;background:#f8fafc;border-radius:8px}
#view .ug{display:grid;grid-template-columns:repeat(auto-fill,minmax(175px,1fr));gap:8px}
#view .ut{display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid #e2e8f0;background:#fff;border-radius:10px;cursor:pointer;text-align:left;width:auto;margin:0}
#view .ut:hover{border-color:#86efac}#view .ut.on{border-color:#15803d;background:#f0fdf4;box-shadow:inset 0 0 0 1px #15803d}#view .ut.lo{border-style:dashed}
#view .ut .q{width:26px;height:35px;display:grid;place-items:center;border-radius:6px;background:#fef3c7;color:#b45309;font-weight:800}
#view .ut .un{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}#view .ut .un b{font-size:13px;color:#0f172a;line-height:1.2;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
#view .ut .un span{display:flex;gap:4px}#view .ut i{font-style:normal;font-size:11px;border-radius:8px;padding:0 6px}#view .ut i.kv{background:#15803d;color:#fff;font-weight:700}#view .ut i.fl{background:#eef2ff;color:#262f7d;font-weight:700}
#view .ut .uc{display:flex;flex-direction:column;align-items:flex-end;line-height:1.1}#view .ut .uc b{font-size:18px;color:#15803d}#view .ut .uc small{font-size:10.5px;color:#94a3b8;white-space:nowrap}
#view .ud{margin-top:10px;border-top:1px solid #f1f5f9;padding-top:10px}
#view .uf{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:8px;font-size:12.5px}
#view .uf .nd{padding:4px 10px;border-radius:8px;background:#f1f5f9;color:#0f172a;font-weight:600}#view .uf .nd em{font-style:normal;font-size:10.5px;color:#64748b;margin-right:5px;font-weight:700}
#view .uf .nd.u{background:#15803d;color:#fff}#view .uf .nd.u em{color:#bbf7d0}#view .uf .nd.x{background:#fffbeb;color:#92400e;font-weight:400}#view .uf .ar{color:#94a3b8;font-weight:800}#view .uf .sp{flex:1}
#view .uf button{padding:3px 10px;border:1px solid #d6dbe8;background:#fff;border-radius:6px;font-size:12px;cursor:pointer}
#view .tw{max-height:380px;overflow:auto;border:1px solid #f1f5f9;border-radius:8px}
#view .bvT{width:100%;font-size:12.5px;margin:0;border-collapse:collapse}#view .bvT th{position:sticky;top:0;background:#f8fafc;color:#64748b;font-weight:700;font-size:11.5px;text-align:left;padding:6px 10px;border-bottom:1px solid #e2e8f0}
#view .bvT td{padding:6px 10px;border-bottom:1px solid #f1f5f9}#view .bvT .ce{text-align:center}#view .bvT .nm{font-weight:600;color:#0f172a}#view .bvT .nm small{color:#94a3b8;font-weight:400}#view .bvT .mu2{color:#64748b}
#view .bvT tr.c{cursor:pointer}#view .bvT tr.c:hover td{background:#f5f7ff}
#view .bvT .ic{background:#fef3c7;color:#92400e;border-radius:9px;padding:1px 8px;font-size:11.5px;white-space:nowrap;font-weight:600}
#view .bvT .bk{font-size:11.5px;font-weight:700;white-space:nowrap;border-radius:9px;padding:1px 8px}#view .bvT .bk.e{background:#fee2e2;color:#b91c1c}#view .bvT .bk.u{background:#dcfce7;color:#15803d}#view .bvT .bk.x{background:#fff7ed;color:#c2410c}
#view .seg2{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}#view .seg2 button{padding:4px 11px;border:1px solid #e2e8f0;background:#f8fafc;border-radius:16px;font-size:12px;cursor:pointer;color:#475569;width:auto;margin:0}
#view .seg2 button b{color:#0f172a;margin-left:2px}#view .seg2 button.on{background:#262f7d;border-color:#262f7d;color:#fff}#view .seg2 button.on b{color:#fff}#view .seg2 button.w{color:#c2410c;border-color:#fed7aa;background:#fff7ed}#view .seg2 button.w.on{background:#c2410c;color:#fff}
body.mob #view .bvKpi{grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}body.mob #view .kp{padding:6px 8px;gap:6px}body.mob #view .kp svg{display:none}body.mob #view .kp .kt>b{font-size:20px}
body.mob #view .ug{grid-template-columns:1fr 1fr}body.mob #view .ut svg{display:none}
#view .bvSec{width:260px;flex:none;position:sticky;top:0}#view .bvSec svg{display:block;width:100%;height:auto}
#view .bvSecT{font-size:12.5px;color:#475569;margin-bottom:4px}#view .bvSecT b{color:#b45309}
#view .bvFl:hover rect:first-of-type{stroke:#262f7d;stroke-width:2}
body.mob #view .bvCh{flex-wrap:wrap}#view .bvCh b,#view .bvCh span{white-space:nowrap}body.mob #view .bvS.pa,body.mob #view .bvR .ar{display:none}body.mob #view .bvD{flex-direction:column-reverse}body.mob #view .bvSec{width:auto;position:static}body.mob #view .bvR .t{width:auto;flex:1}body.mob #view .bvR{flex-wrap:wrap}body.mob #view .bvR .s{flex-basis:100%;padding-left:40px}body.mob #view .bvR.on+.bvOp{padding-left:12px}
#view .bvFo .sp{flex:1}#view .bvFo button{padding:4px 10px;border:1px solid #d6dbe8;background:#fff;border-radius:6px;font-size:12px;cursor:pointer}
#view .bvSum{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}
#view .bvS{display:inline-flex;align-items:baseline;gap:5px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:4px 10px;font-size:12.5px}
#view .bvS em{font-style:normal;color:#64748b;font-size:11.5px}#view .bvS b{color:#262f7d;font-size:14px}#view .bvS small{color:#94a3b8;font-size:10.5px}
#view .bvS a{color:inherit;cursor:pointer;text-decoration:underline dotted}#view .bvS.pa{font-size:11.5px}
`;
  document.head.appendChild(s);
})();
