/* =========================================================
   bldview.js — 건물 안 보기 (공장 지도에서 건물 더블클릭)
   - 한 화면에 층을 가로 띠로 (위가 높은 층), 반은 간단한 박스 (종류 아이콘 · 이름 · 전압)
   - 맨 위 '수전' 줄에서 들어오는 선 → TR → 배전반은 늘 선으로. 나머지 반은 흐리게
   - 배전반(하위가 있는 반)을 누르면 하위 분전반·MCC반·배전반·바로 나가는 부하까지 선이 이어짐
     → 하위 반을 누르면 '배전반/분전반/MCC반' 도면, 부하 칩을 누르면 부하도면
   - [✎ 편집]에서 박스를 끌어서 배치, 다른 층 띠로 끌면 층도 바뀜, 겹치면 옆으로 비켜 놓음 · [겹침 정리] [자동 배치]
   - 배치·층은 S.cfg.bv[동] 에 저장 (백업 포함). 처음 층은 '위치 도면'의 층 정보로
   - 오른쪽 현황표: 수전·받는 곳·배전반·ACB·MCC·분전반·UPS·비상부하·중요 부하·층별
   ========================================================= */

const BV = {b: '', drag: null, rows: null, f: '', K: null};   // f = 눌러서 하위 계통을 펼친 반
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
const BV_LW = 92, BV_GUT = 40, BV_X0 = BV_LW + BV_GUT, BV_W = 1140;   // 층 이름 칸 · 왼쪽 간선 자리 · 전체 폭
const BV_BX = 168, BV_BY = 50, BV_GX = 12, BV_GY = 24, BV_PAD = 12, BV_HDR = 60;   // 박스 · 간격(가로/세로) · 위쪽 수전 줄
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
  const taken = fixed.map(n => ({n, x: c.pos[n.id].x, y: c.pos[n.id].y, fixed: 1}));
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
// 종류 아이콘 (TR·배전반·MCC·분전반·UPS)
function bvIcon(t, x, y, c) {
  if (t === 'TR') return `<g transform="translate(${x},${y})" fill="none" stroke="${c}" stroke-width="2.2"><circle cx="14" cy="10" r="8.5" fill="#fff"/><circle cx="14" cy="21" r="8.5"/></g>`;
  if (t === 'MDB') return `<g transform="translate(${x},${y})"><rect x="1" y="1" width="26" height="30" rx="2" fill="#fff" stroke="${c}" stroke-width="2"/><path d="M10 1v30M18 1v30" stroke="${c}" stroke-width="1.6"/><path d="M4 8h3M12 8h3M20 8h3M4 14h3M12 14h3M20 14h3" stroke="${c}" stroke-width="2"/></g>`;
  if (t === 'MCC') return `<g transform="translate(${x},${y})"><rect x="1" y="1" width="26" height="30" rx="2" fill="#fff" stroke="${c}" stroke-width="2"/><path d="M1 8h26M1 15h26M1 22h26" stroke="${c}" stroke-width="1.6"/><circle cx="22" cy="4.5" r="1.5" fill="${c}"/><circle cx="22" cy="11.5" r="1.5" fill="${c}"/><circle cx="22" cy="18.5" r="1.5" fill="${c}"/><circle cx="22" cy="26" r="1.5" fill="${c}"/></g>`;
  if (t === 'UPS') return `<g transform="translate(${x},${y})"><rect x="1" y="6" width="23" height="20" rx="3" fill="#fff" stroke="${c}" stroke-width="2"/><rect x="24" y="12" width="3" height="8" fill="${c}"/><path d="M14 9l-5 8h5l-2 7 6-9h-5z" fill="${c}"/></g>`;
  return `<g transform="translate(${x},${y})"><rect x="1" y="3" width="26" height="26" rx="2" fill="#fff" stroke="${c}" stroke-width="2"/><rect x="5" y="7" width="18" height="3" fill="${c}"/>${[13, 19, 25].map(yy => `<rect x="5" y="${yy - 1}" width="7" height="3.5" rx="1" fill="${c}"/><rect x="16" y="${yy - 1}" width="7" height="3.5" rx="1" fill="${c}"/>`).join('')}</g>`;
}
function bvBoxSvg(t, x, y, o) {
  const n = t.n, v = (n.type === 'TR' ? n.v2 : '') || effV(n) || '전압?', vc = BV_VC(v);
  const K = bvKind(n), sel = n.id === BV.f || n.id === UI.sel, C = kids(n.id).filter(k => !isSlot(k));
  const em = C.some(k => effSrc(k) === 'E'), im = C.some(k => k.imp) || n.imp;
  const tip = UIX.edit ? '끌기: 배치' : o.open ? (n.id === BV.f ? '한 번 더 누르면 배전반/분전반/MCC반 도면' : '누르면 하위 계통이 이어져요') : '누르면 배전반/분전반/MCC반 도면';
  return `<g class="bvN${o.dim ? ' dim' : ''}${n.id === BV.f ? ' foc' : ''}" data-bvn="${esc(n.id)}" transform="translate(${x},${y})" style="cursor:${UIX.edit ? 'grab' : 'pointer'}"><title>${esc(pathOf(n).map(label).join(' › '))}\n${tip}</title>
    <rect width="${BV_BX}" height="${BV_BY}" rx="7" fill="#fff" stroke="${sel ? '#f59e0b' : K.c}" stroke-width="${sel ? 3.5 : 1.6}"/>
    <rect width="6" height="${BV_BY}" rx="3" fill="${vc}"/>
    ${bvIcon(n.type === 'PNL' && /UPS/i.test(n.name || '') ? 'UPS' : n.type, 12, 9, K.c)}
    <text x="46" y="21" font-size="13" font-weight="bold" fill="#0f172a">${esc(sdFit(label(n), BV_BX - 52, 13))}</text>
    <text x="46" y="38" font-size="11" fill="#64748b">${n.type === 'TR' ? '' : `<tspan fill="${K.c}" font-weight="bold">${esc(K.l)}</tspan> · `}<tspan fill="${vc}" font-weight="bold">${esc(v)}</tspan>${n.type === 'TR' && n.kva ? ' · ' + esc(n.kva) + 'kVA' : ''}</text>
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
  const o = [`<svg xmlns="http://www.w3.org/2000/svg" id="bvSvg" viewBox="0 0 ${BV_W} ${y}" font-family="Malgun Gothic,sans-serif">`];
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
      ${UIX.edit ? '<button data-bva="tidy">▦ 겹침 정리</button><button data-bva="reset">↺ 자동 배치</button><button data-bva="addf">+ 층 추가</button><button data-bva="delf">− 층 삭제</button>' : ''}
      <button data-bva="csv">📊 이 동 목록 엑셀</button></div>
    ${UIX.edit ? '<div class="bvHint">✎ 편집: 박스를 끌어서 배치 · 다른 층 띠로 끌면 층이 바뀌어요 · 겹치면 옆 빈자리로 비켜요</div>' : ''}
    <div class="bvSum">
      ${R('수전', T.TR.length ? `TR ${T.TR.length}대 · <b>${T.kva.toLocaleString()}</b> kVA` : '—', L('tr', T.TR))}
      ${R('배전반', `<b>${T.mdb.length}</b>`, L('mdb', T.mdb))}${R('ACB', `<b>${T.acb.length}</b>`, L('acb', T.acb))}${R('MCC반', `<b>${T.mcc.length}</b>`, L('mcc', T.mcc))}
      ${R('분전반', `<b>${T.pnl.length}</b>`, L('pnl', T.pnl))}${R('UPS', `<b>${T.ups.length}</b>대`, L('ups', T.ups))}
      ${R('비상부하', `<b>${T.em.length}</b>회로`, L('em', T.em), T.em.length ? kwS(T.emKw, T.emKwN, T.em.length) : '')}
      ${R('전체 회로', `<b>${T.cir.length}</b>`, L('cir', T.cir), kwS(T.kw, T.kwN, T.cir.length))}
      ${R('중요 부하', Object.keys(T.imp).length ? Object.entries(T.imp).map(([k, v]) => `${esc(k)} <b>${v}</b>`).join(' · ') : '<b>0</b>', L('imp', T.N.filter(n => n.imp)))}
      ${T.gen.length ? R('비상 전원', T.gen.map(n => `${esc(label(n))}${n.kw ? ' ' + esc(n.kw) + 'kW' : ''}`).join(' · '), L('gen', T.gen)) : ''}
      ${T.PA.paths.length ? `<span class="bvS pa"><em>받는 곳</em>${pathTxt.replace(/<br>/g, ' · ')}</span>` : ''}
    </div>
    ${bvFocusBar(bld)}
    <div id="bvW">${bvSvg(bld, c)}</div>`;
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
  const A = (BV.lists || {})[key] || [], c = bvCfg(mapBldOf(BV.b));
  uiModal(`<h3>${esc(mapName(MAP_BLD.find(x => x.id === BV.b)))} · ${A.length}개</h3><div class="mdlS"><table class="tb"><thead><tr><th>층</th><th>종류</th><th>명칭</th><th>사양</th><th>상위</th></tr></thead><tbody>
    ${A.slice(0, 800).map(n => `<tr class="c" data-bvgo="${esc(n.id)}"><td>${esc(bvFloorUp(n, c))}</td><td>${esc(tlabel(n))}</td><td>${esc(label(n))}</td><td>${esc(spec(n))}${n.kw ? ' · ' + esc(n.kw) + 'kW' : ''}</td><td>${esc(par(n) ? label(par(n)) : '')}</td></tr>`).join('')}
    </tbody></table></div><div class="mdlA"><button data-mdl="x">닫기</button></div>`, true);
}
function bvCsv() {
  const bld = mapBldOf(BV.b), c = bvCfg(bld), rows = [['층', '종류', '번호', '명칭', '전압', '정격', 'kW', '전원', '중요 부하', '상위', '경로']];
  S.nodes.filter(n => bk(n) === bld && !isSlot(n)).forEach(n => rows.push([bvFloorUp(n, c) || '층 미지정', tlabel(n), n.no || '', n.name || '', effV(n), spec(n), n.kw || '', SRC[effSrc(n)], n.imp || '', par(n) ? label(par(n)) : '', pathOf(n).slice(0, -1).map(label).join(' › ')]));
  download(new Blob(['﻿' + rows.map(r => r.map(csvQ).join(',')).join('\r\n')], {type: 'text/csv'}), `${bld}_설비목록_${stamp()}.csv`);
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
  // 반 박스: 하위가 있으면 펼치기 (펼친 걸 한 번 더 = 도면), 없으면 바로 배전반/분전반/MCC반 도면
  const n = t.closest('#bvSvg .bvN, #bvSvg .bvP');
  if (n) { const x = byId(n.dataset.bvn); if (!x) return;
    if (!UIX.edit && BV.f !== x.id && bvCanOpen(x, bld)) { BV.f = x.id; renderView(); return; }
    bvGo('plan', x.id); return; }
  // 부하 칩: 부하도면 · 다른 동 칩: 그 동 안 보기
  const cp = t.closest('#bvSvg .bvC');
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
#view .bvFo.hint{background:#f8fafc;border-color:#e2e8f0;color:#475569}
#view .bvFo .cr a{color:#262f7d;cursor:pointer;text-decoration:underline dotted}#view .bvFo .cr b{color:#b45309;font-size:14px}#view .bvFo .sm{color:#475569}#view .bvFo .sm b{color:#262f7d}
#view .bvFo .sp{flex:1}#view .bvFo button{padding:4px 10px;border:1px solid #d6dbe8;background:#fff;border-radius:6px;font-size:12px;cursor:pointer}
#view .bvSum{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}
#view .bvS{display:inline-flex;align-items:baseline;gap:5px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:4px 10px;font-size:12.5px}
#view .bvS em{font-style:normal;color:#64748b;font-size:11.5px}#view .bvS b{color:#262f7d;font-size:14px}#view .bvS small{color:#94a3b8;font-size:10.5px}
#view .bvS a{color:inherit;cursor:pointer;text-decoration:underline dotted}#view .bvS.pa{font-size:11.5px}
`;
  document.head.appendChild(s);
})();
