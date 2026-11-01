/* =========================================================
   map.js — 공장 지도 (항공사진 배치를 본뜬 그림 · 일반인용)
   - 남쪽에서 내려다본 입체 그림: 흰 벽·파란 띠·유리 계단실 (전기가 끊기면 창이 어두워짐)
   - 건물 사이 전기 흐름은 트리에서 자동: 상위가 다른 동이면 그 동 → 이 동 화살표
   - 발전기·태양광·ESS는 트리 항목 (동 화면/지도에서 추가 · 속성창에서 공급 위치)
     지도 위 위치는 [✎ 설비 위치 편집]에서 끌어서 옮김 → S.cfg.map 에 저장 (백업 포함)
   - 🔌 정전 시나리오: 평상시 → 한전 정전 → 발전기 기동 → 비상 공급 → 태양광·ESS → 복구
   ========================================================= */

/* ---------- 지도 모델 ----------
   바닥 좌표: 위에서 본 배치 (1204 × 998, 위 = 북쪽)
   화면: 남쪽에서 비스듬히 내려다본 입체 — 북쪽은 위·왼쪽으로, 높이는 위로
   ---------------------------------------- */
const MAP_GW = 1204, MAP_GH = 998, MAP_K = .2, MAP_F = .6, MAP_OX = 14, MAP_OY = 176;
const MAP_W = Math.round(MAP_GW + MAP_GH * MAP_K + MAP_OX * 2), MAP_H = Math.round(MAP_GH * MAP_F + MAP_OY + 24);
const mP = (x, y, z) => [x + y * MAP_K + MAP_OX, y * MAP_F + MAP_OY - (z || 0)];          // 바닥(x,y) + 높이 z → 화면
const MAP_GM = `matrix(1 0 ${MAP_K} ${MAP_F} ${MAP_OX} ${MAP_OY})`;                        // 바닥 그림용 변환
// 건물: 블록(직사각형) 여러 개 · h 높이 · roof 지붕 색 · win 창 줄 수 · st 유리 계단실 위치(0~1) · 장식
const MAP_BLD = [
  {id: 'logi', bld: '물류동', c: [130, 250], blocks: [
    {r: [10, 60, 220, 284], h: 80, roof: '#b4c8e6', band: 1, win: 0, deco: 'ribs'},
    {r: [6, 284, 264, 432], h: 30, roof: '#86a98f', win: 1, deco: 'solar', st: .82}]},
  {id: 'main', bld: '본동', c: [540, 182], blocks: [
    {r: [220, 60, 860, 304], h: 50, roof: '#8fb19a', win: 2, deco: 'truss', sign: 1, st: .5},
    {r: [860, 52, 1000, 176], h: 100, roof: '#e2e8f0', win: 0, band: 1}]},
  {id: 'util', bld: '유틸리티동', c: [966, 248], blocks: [{r: [860, 192, 1072, 304], h: 40, roof: '#cbd5e1', win: 1, deco: 'cool'}]},
  {id: 'qc', bld: '품질동', c: [775, 450], blocks: [
    {r: [690, 340, 860, 576], h: 52, roof: '#d6dbe2', win: 3, deco: 'hvac', st: .2},
    {r: [686, 520, 744, 592], h: 26, roof: '#cbd5e1', win: 1}]},
  {id: 'pump', bld: '지하 펌프장', c: [928, 457], blocks: [{r: [870, 350, 986, 564], h: 12, roof: '#c9ccbf', win: 0, deco: 'grate'}]},
  {id: 'ww', bld: '폐수처리장', c: [1062, 442], blocks: [{r: [1000, 376, 1124, 508], h: 24, roof: '#7fa6dc', win: 1, deco: 'ribs'}]},
  {id: 'ani', bld: '동물실험동', c: [1055, 552], blocks: [{r: [1006, 518, 1104, 588], h: 28, roof: '#7fa6dc', win: 1}]},
  {id: 'new', bld: '신관', c: [642, 691], blocks: [{r: [580, 606, 704, 776], h: 56, roof: '#d6dbe2', win: 3, band: 1, st: .78, deco: 'hvac'}]},
  {id: 'bio', bld: '바이오동', c: [778, 700], blocks: [{r: [716, 606, 840, 794], h: 62, roof: '#d6dbe2', win: 4, band: 1, st: .15, deco: 'hvac'}]},
  {id: 'cep', bld: '세파동', c: [932, 691], blocks: [{r: [864, 606, 1000, 776], h: 56, roof: '#7fa6dc', win: 3, band: 1, st: .85}]},
  {id: 'pen', bld: '페니동', name: '페니실린동', c: [830, 922], blocks: [{r: [756, 860, 904, 984], h: 84, roof: '#d6dbe2', win: 5, band: 1, st: .2, deco: 'hvac'}]},
  {id: 'gate', bld: '경비실', c: [426, 884], small: 1, blocks: [{r: [380, 856, 472, 912], h: 16, roof: '#e2e8f0', win: 1}]},
  {id: 'haz', bld: '위험물창고', c: [180, 28], small: 1, blocks: [{r: [80, 4, 280, 52], h: 18, roof: '#c4b59a', win: 0}]},
];
MAP_BLD.forEach(b => { b.h = Math.max(...b.blocks.map(k => k.h)); b.x0 = Math.min(...b.blocks.map(k => k.r[0])); b.x1 = Math.max(...b.blocks.map(k => k.r[2]));
  b.y0 = Math.min(...b.blocks.map(k => k.r[1])); b.y1 = Math.max(...b.blocks.map(k => k.r[3])); });
const MAP_KEPCO = [1040, 840];     // 한전 인입 철탑 기본 위치 (바닥 좌표)

// 나무 · 차 (고정된 의사난수라 매번 같은 모양)
function mapRnd(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
const MAP_TREES = (() => {
  const t = [], R = mapRnd(7);
  const ring = (x0, y0, x1, y1, step) => { for (let x = x0; x <= x1; x += step) { t.push([x, y0]); t.push([x, y1]); } for (let y = y0 + step; y < y1; y += step) { t.push([x0, y]); t.push([x1, y]); } };
  ring(284, 354, 546, 576, 38); ring(404, 634, 540, 816, 44);
  for (let i = 0; i < 70; i++) { const x = R() * 320, y = 630 + R() * 360; if (y > 640 + (x > 250 ? (x - 250) * 1.6 : 0)) t.push([x, y]); }
  for (let i = 0; i < 46; i++) { const y = R() * 990, x = 1135 + R() * 60 - (y > 600 ? (y - 600) * .35 : 0); t.push([x, y]); }
  return t.map(([x, y]) => [Math.round(x), Math.round(y), 9 + Math.round(R() * 5)]);
})();
const MAP_CARS = (() => {
  const c = [], R = mapRnd(3), col = ['#f8fafc', '#e5e7eb', '#9ca3af', '#1f2937', '#f8fafc', '#cbd5e1', '#475569', '#b91c1c'];
  const lot = (x0, y0, x1, y1) => { for (let y = y0; y < y1; y += 34) for (let x = x0; x < x1; x += 15) if (R() < .82) c.push([x, y, col[Math.floor(R() * col.length)]]); };
  lot(408, 898, 734, 990); lot(48, 478, 232, 584);
  return c;
})();

const MAP = {step: 0, auto: false, edit: false, selB: '', drag: null, lay: {hv: 1, lv: 0, em: 1}, cardMin: false};   // cardMin = 건물 카드 접기
try { MAP.cardMin = !!localStorage.getItem('ckd_elec2_mpmin'); } catch (e) {}
try { Object.assign(MAP.lay, JSON.parse(localStorage.getItem('ckd_elec2_maplay') || '{}')); } catch (e) {}
let _mapT = 0;

const mapCfg = () => { S.cfg.map = S.cfg.map || {}; const m = S.cfg.map; m.pos = m.pos || {}; m.bmap = m.bmap || {}; return m; };
const mapBldOf = id => { const b = MAP_BLD.find(x => x.id === id); return mapCfg().bmap[id] || b.bld; };
const mapName = b => b.name && !mapCfg().bmap[b.id] ? b.name : mapBldOf(b.id);
function mapByBld(bld) { return MAP_BLD.find(b => mapBldOf(b.id) === bld) || null; }
const mapKepco = () => mapCfg().kepco || MAP_KEPCO;

/* ---------- 데이터에서 흐름 뽑기 ---------- */
// 동 → 동 (상위가 다른 동인 곳) · 한전 → 최상위가 있는 동
// 동 → 동 흐름 (전압별로 따로) · v = 넘어가는 전압, cls = hv(1kV 이상) / lv
function mapEdges() {
  const E = new Map();
  const add = (a, b, p, n) => { const v = (p ? outV(p) : effV(n)) || '?', k = a + '>' + b + '>' + v;
    if (!E.has(k)) E.set(k, {a, b, v, cls: pV(v) >= 1000 ? 'hv' : 'lv', f: []}); E.get(k).f.push({p, n}); };
  S.nodes.forEach(n => {
    if (FP_SRC[n.type]) return;
    const p = par(n), b = bk(n);
    if (!mapByBld(b)) return;
    if (!p) { add('@kepco', b, null, n); return; }
    const a = bk(p); if (a !== b && mapByBld(a)) add(a, b, p, n);
  });
  return [...E.values()];
}
// 그 동으로 들어오는 전원 경로: 한전부터 그 동의 첫 항목까지 (동 안에서 시작하는 것 포함)
function mapPaths(bld) {
  const ent = S.nodes.filter(n => !FP_SRC[n.type] && !isSlot(n) && bk(n) === bld && (!par(n) || bk(par(n)) !== bld));
  const P = ent.map(n => ({n, chain: pathOf(n)}));
  P.sort((a, b) => pV(inV(b.n) || effV(b.n)) - pV(inV(a.n) || effV(a.n)) || a.chain.length - b.chain.length);
  const pairs = new Set(), blds = new Set([bld]);
  P.forEach(({chain}) => { const bs = chain.map(bk).filter((b, i, a) => !i || a[i - 1] !== b); pairs.add('@kepco>' + bs[0]); bs.forEach((b, i) => { blds.add(b); if (i) pairs.add(bs[i - 1] + '>' + b); }); });
  // 이 경로 어딘가로 들어오는 발전기 등
  const on = new Set(P.flatMap(p => p.chain.map(x => x.id)));
  const srcs = S.nodes.filter(n => FP_SRC[n.type] && n.link && (on.has(n.link) || bk(byId(n.link) || {}) === bld));
  return {paths: P, pairs, blds, srcs};
}
function mapSrcs() { return S.nodes.filter(n => FP_SRC[n.type]); }
// 정전 계산 (fpage.js 엔진 재사용)
function mapPower(black) { const o = FP.black; FP.black = black; try { return fpPower(); } finally { FP.black = o; } }

/* ---------- 시나리오 ---------- */
function mapSteps() {
  const G = mapSrcs().filter(n => n.type === 'GEN'), PVs = mapSrcs().filter(n => n.type === 'PV'), ES = mapSrcs().filter(n => n.type === 'ESS');
  const P = mapPower(true), run = G.filter(n => P.src[n.id] === 'run');
  const kw = a => a.reduce((s, n) => s + (parseFloat(n.kw) || 0), 0);
  const tgt = run.map(n => byId(n.link) ? `${bk(byId(n.link))} ${label(byId(n.link))}` : null).filter(Boolean);
  const pv = PVs.length ? `태양광 ${PVs.length}곳(${kw(PVs) || '?'}kW)이 낮에 전기를 만들어 보태요.` : '';
  const es = ES.length ? `ESS는 전기 요금이 비싼 시간에 저장한 전기를 써서 피크를 낮춰요.` : '';
  return [
    {k: 'live', t: '평상시', d: `한전 22.9kV 전기가 유틸리티동 수변전실로 들어와서, 변압기로 3.3kV로 낮춘 뒤 각 동으로 보내요. 각 동에서 다시 380/220V로 낮춰서 써요. ${pv} ${es}`},
    {k: 'cut', t: '① 한전 정전', d: '한전 전기가 끊겼어요. 모든 동의 일반(상용) 전기가 멈춰요.'},
    {k: 'start', t: '② 비상발전기 기동', d: G.length ? `정전을 감지하면 비상발전기 ${G.length}대(${kw(G) || '?'}kW)가 자동으로 돌기 시작해요. 보통 10초 안팎이에요.` : '아직 트리에 발전기가 없어요. 동을 눌러 [+ 발전기]로 추가하세요.'},
    {k: 'feed', t: '③ 비상 전원 공급', d: run.length ? `ATS(자동 전환 개폐기)가 비상 쪽으로 바뀌어서, 발전기 전기가 ${tgt.length ? tgt.join(', ') : '(공급 위치 조사 중)'}(으)로 들어가요. 빨간 선이 비상 전기예요.` : '정전 때 가동하도록 설정된 발전기가 없어요.'},
    {k: 'other', t: '④ 태양광 · ESS', d: [PVs.length ? '태양광은 정전되면 안전을 위해 자동으로 멈춰요 (작업자 감전 방지 · 단독운전 방지).' : '',
      ES.length ? (ES.some(n => n.emg === 'Y') ? 'ESS가 저장한 전기를 비상으로 보태요.' : 'ESS는 피크저감용이라 정전 때는 전기를 보내지 않아요.') : ''].filter(Boolean).join(' ') || '태양광·ESS가 아직 트리에 없어요.'},
    {k: 'back', t: '⑤ 한전 복구', d: `한전 전기가 돌아오면 다시 일반 전기로 바뀌고 발전기는 멈춰요.${G.some(n => n.gk === 'CTTS') ? ' CTTS 발전기는 한전과 잠깐 병렬로 운전해서 끊김 없이 넘겨요.' : ''}`},
  ];
}

/* ---------- 그리기 ---------- */
// 건물 블록 하나: 서쪽 벽 · 남쪽 벽(창·계단실·간판) · 지붕(장식)
function mapBlock(k, st) {
  const [x0, y0, x1, y1] = k.r, h = k.h, o = [];
  const dark = (st.black && !st.em) || st.cut;
  const wallF = dark ? '#c7ccd4' : '#fbfcfe', wallW = dark ? '#aeb4bd' : '#e3e8ef', blue = dark ? '#7b8798' : '#1f5fbf';
  const glass = st.em ? '#fca5a5' : dark ? '#55606f' : st.lit ? '#bcd6f5' : '#c9d6e6';
  // 서쪽 벽
  const w = [mP(x0, y1), mP(x0, y0), mP(x0, y0, h), mP(x0, y1, h)];
  if (!k.noW) o.push(`<polygon points="${w.map(p => p.join(',')).join(' ')}" fill="${wallW}" stroke="#94a3b8" stroke-width=".8"/>`);
  // 남쪽 벽 (화면에서 직사각형)
  const [fx0, fy] = mP(x0, y1), fx1 = mP(x1, y1)[0], ft = fy - h, fw = fx1 - fx0;
  o.push(`<rect x="${fx0}" y="${ft}" width="${fw}" height="${h}" fill="${wallF}" stroke="#94a3b8" stroke-width=".8"/>`);
  if (k.band) o.push(`<rect x="${fx0}" y="${ft}" width="${fw}" height="5" fill="${blue}"/>`, `<polygon points="${[mP(x0, y1, h), mP(x0, y0, h), mP(x0, y0, h - 5), mP(x0, y1, h - 5)].map(p => p.join(',')).join(' ')}" fill="${blue}" opacity=".85"/>`);
  // 창 줄
  const n = k.win || 0, gap = h / (n + 1);
  for (let i = 1; i <= n; i++) {
    const wy = ft + gap * i - 3;
    o.push(`<rect x="${fx0 + 6}" y="${wy}" width="${fw - 12}" height="${Math.min(6, gap * .45)}" fill="${glass}" rx="1"/>`);
    if (!k.noW) { const a = mP(x0, y1 - 6), b = mP(x0, y0 + 6); o.push(`<polygon points="${a[0]},${a[1] - h + gap * i - 3} ${b[0]},${b[1] - h + gap * i - 3} ${b[0]},${b[1] - h + gap * i + 1} ${a[0]},${a[1] - h + gap * i + 1}" fill="${glass}" opacity=".75"/>`); }
  }
  if (n) o.push(`<rect x="${fx0}" y="${fy - 4}" width="${fw}" height="4" fill="${dark ? '#94a3b8' : '#64748b'}" opacity=".35"/>`);
  // 유리 계단실
  if (k.st != null) { const sx = fx0 + fw * k.st - 7; o.push(`<rect x="${sx}" y="${ft - 6}" width="14" height="${h + 6}" fill="${st.em ? '#f87171' : dark ? '#4b5563' : '#2f9e8f'}" opacity=".9"/><rect x="${sx}" y="${ft - 6}" width="14" height="3" fill="${blue}"/>`); }
  // 간판 (본동)
  if (k.sign) { const sx = fx0 + fw / 2; o.push(`<rect x="${sx - 62}" y="${ft - 24}" width="124" height="26" fill="#fff" stroke="${blue}" stroke-width="1.5"/><circle cx="${sx - 44}" cy="${ft - 11}" r="8" fill="${blue}"/><text x="${sx + 8}" y="${ft - 4}" text-anchor="middle" font-size="17" font-weight="bold" fill="${blue}">종근당</text>`); }
  // 지붕 (바닥 좌표 그대로 변환)
  o.push(`<g transform="translate(0,${-h}) ${MAP_GM}">`,
    `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="${dark ? '#b8bec7' : k.roof}" stroke="${st.em || st.cut ? '#dc2626' : st.part ? '#f97316' : st.sel ? '#262f7d' : '#7c8796'}" stroke-width="${st.em || st.sel || st.cut || st.part ? 5 : 1.4}"${st.em || st.cut || st.part ? ' stroke-dasharray="14 8"' : ''}/>`,
    `<rect x="${x0 + 4}" y="${y0 + 4}" width="${x1 - x0 - 8}" height="${y1 - y0 - 8}" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="2"/>`);
  const W = x1 - x0, H = y1 - y0;
  if (k.deco === 'solar') for (let yy = y0 + 14; yy < y1 - 20; yy += 26) for (let xx = x0 + 14; xx < x1 - 24; xx += 30) o.push(`<rect x="${xx}" y="${yy}" width="26" height="20" fill="${dark ? '#475569' : '#1e3a8a'}" stroke="#93c5fd" stroke-width=".8"/>`);
  if (k.deco === 'truss') { let d = `M${x0 + 30} ${y0 + H / 2}`; for (let xx = x0 + 30; xx < x1 - 40; xx += 24) d += ` L${xx + 12} ${y0 + H / 2 - 22} L${xx + 24} ${y0 + H / 2}`;
    o.push(`<rect x="${x0 + 20}" y="${y0 + H / 2 - 28}" width="${W - 40}" height="36" fill="#d9c7b4" opacity=".5"/><path d="${d}" fill="none" stroke="${dark ? '#8b8b8b' : '#c2410c'}" stroke-width="5"/><line x1="${x0 + 30}" y1="${y0 + H / 2 - 22}" x2="${x1 - 40}" y2="${y0 + H / 2 - 22}" stroke="${dark ? '#8b8b8b' : '#c2410c'}" stroke-width="4"/>`); }
  if (k.deco === 'ribs') for (let xx = x0 + 10; xx < x1; xx += 14) o.push(`<line x1="${xx}" y1="${y0 + 3}" x2="${xx}" y2="${y1 - 3}" stroke="#fff" stroke-opacity=".35" stroke-width="2"/>`);
  if (k.deco === 'cool') [[.2, .35], [.4, .35], [.6, .35], [.8, .35]].forEach(([a, b]) => o.push(`<circle cx="${x0 + W * a}" cy="${y0 + H * b}" r="16" fill="#94a3b8" stroke="#64748b" stroke-width="2"/><circle cx="${x0 + W * a}" cy="${y0 + H * b}" r="8" fill="#475569"/>`));
  if (k.deco === 'hvac') [[.25, .3], [.6, .55], [.75, .25]].forEach(([a, b]) => o.push(`<rect x="${x0 + W * a}" y="${y0 + H * b}" width="${Math.min(30, W * .18)}" height="${Math.min(22, H * .12)}" fill="#9ca3af" stroke="#6b7280"/>`));
  if (k.deco === 'grate') for (let yy = y0 + 20; yy < y1 - 10; yy += 34) o.push(`<rect x="${x0 + 16}" y="${yy}" width="${W - 32}" height="18" fill="#9ca3af" opacity=".6"/>`);
  o.push('</g>');
  return o.join('');
}
function mapTree(x, y, r, st) {
  const [X, Y] = mP(x, y), c = st.black ? ['#7d8f78', '#6b7d66'] : ['#5f9e5a', '#4a8547'];
  return `<g><rect x="${X - 1.5}" y="${Y - r}" width="3" height="${r}" fill="#7c5a3a"/><circle cx="${X}" cy="${Y - r * 1.4}" r="${r}" fill="${c[0]}"/><circle cx="${X + r * .3}" cy="${Y - r * 1.2}" r="${r * .6}" fill="${c[1]}" opacity=".6"/></g>`;
}
// opt.outage: 내린 차단기 기준으로 동마다 정전 / 일부 정전 / 정상 (계획정전 보고서 그림)
function mapSvg(opt) {
  const OUT = !!(opt && opt.outage);
  const st = OUT ? {k: 'live'} : mapSteps()[MAP.step] || mapSteps()[0], k = st.k;
  const black = ['cut', 'start', 'feed', 'other'].includes(k), feed = ['feed', 'other'].includes(k);
  const P = mapPower(black), edges = mapEdges(), srcs = mapSrcs();
  const FOC = !OUT && MAP.selB ? mapPaths(mapBldOf(MAP.selB)) : null;   // 건물을 골랐으면 그 동 전원 경로만 강조
  const cnt = {}, emN = {}, pnl = {}, dN = {}, dP = {};
  S.nodes.forEach(n => { const b = bk(n); if (isSlot(n) || (OUT && P.off.has(n.id))) return; cnt[b] = (cnt[b] || 0) + 1; if (FP_BOX[n.type]) pnl[b] = (pnl[b] || 0) + 1; if (feed && P.emer.has(n.id) && !FP_SRC[n.type]) emN[b] = (emN[b] || 0) + 1;
    if (OUT && !FP_SRC[n.type] && !P.alive.has(n.id) && !P.off.has(n.id)) { dN[b] = (dN[b] || 0) + 1; if (FP_BOX[n.type]) dP[b] = (dP[b] || 0) + 1; } });
  // (내린 차단기 자체는 위에서 세지 않음)
  const cutOf = b => OUT && cnt[b] && dN[b] >= cnt[b], partOf = b => OUT && dN[b] > 0 && dN[b] < cnt[b];
  const o = [`<svg xmlns="http://www.w3.org/2000/svg" id="mapSvg" viewBox="0 0 ${MAP_W} ${MAP_H}" font-family="Malgun Gothic,sans-serif">`, typeof BV_DEFS === 'string' ? BV_DEFS : '',
    `<defs><linearGradient id="mpSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${black ? '#cfd5dc' : '#e6efe0'}"/><stop offset=".3" stop-color="${black ? '#c3cab9' : '#dfe9d2'}"/><stop offset="1" stop-color="${black ? '#b9c2b0' : '#d4e3c4'}"/></linearGradient></defs>`,
    `<rect width="${MAP_W}" height="${MAP_H}" fill="url(#mpSky)"/>`,
    // 바닥: 숲 · 잔디 · 주차장 · 도로
    `<g transform="${MAP_GM}">
      <path d="M0 600 Q120 560 260 612 Q350 700 340 998 H0 Z" fill="${black ? '#7f9174' : '#7fae6c'}"/><path d="M1150 0 Q1100 220 1172 430 Q1130 720 980 998 H1204 V0 Z" fill="${black ? '#7f9174' : '#7fae6c'}"/>
      <rect x="0" y="0" width="1204" height="998" fill="none"/>
      <rect x="270" y="342" width="290" height="246" rx="44" fill="${black ? '#a3b394' : '#a9cf86'}"/><rect x="392" y="622" width="160" height="206" rx="56" fill="${black ? '#a3b394' : '#a9cf86'}"/>
      <rect x="40" y="470" width="200" height="118" rx="6" fill="#c3c8ce"/><rect x="400" y="892" width="340" height="104" rx="6" fill="#c3c8ce"/>
      <g fill="none" stroke-linecap="round" stroke-linejoin="round">
        <g stroke="#e9ecef" stroke-width="26"><path d="M240 322 H1080 C1120 360 1150 450 1140 560 S1080 760 1020 860"/><path d="M250 322 V560 Q250 604 300 604 H1110"/><path d="M630 322 V596"/><path d="M300 604 Q350 640 360 700 V900 H750"/><path d="M560 820 H1010"/><path d="M745 600 V900"/></g>
        <g stroke="#fff" stroke-width="2" stroke-dasharray="14 12" opacity=".8"><path d="M240 322 H1080"/><path d="M300 604 H1110"/></g></g>
      ${MAP_CARS.map(([x, y, c]) => `<rect x="${x}" y="${y}" width="10" height="20" rx="3" fill="${c}" stroke="#6b7280" stroke-width=".6"/>`).join('')}
    </g>`];

  // 건물 · 나무 (북쪽부터 그려서 앞이 뒤를 가림)
  const items = [];
  MAP_BLD.forEach(b => {
    const bld = mapBldOf(b.id), n = cnt[bld] || 0;
    const s = {black, em: emN[bld] > 0, lit: !black && n > 0 && !cutOf(bld), sel: !OUT && MAP.selB === b.id, cut: cutOf(bld), part: partOf(bld)};
    b.blocks.forEach(kb => items.push({y: kb.r[3], x: kb.r[0], svg: `<g class="mpB" data-mpb="${b.id}" style="cursor:pointer">${mapBlock(kb, s)}</g>`}));
  });
  MAP_TREES.forEach(([x, y, r]) => items.push({y, x, svg: mapTree(x, y, r, {black})}));
  // 한전 철탑
  const K = mapKepco(), [kx, ky] = mP(K[0], K[1]), kc = black ? '#9ca3af' : '#475569';
  items.push({y: K[1], x: K[0], svg: `<g class="mpK" style="cursor:${MAP.edit ? 'move' : 'default'}"><path d="M${kx - 16} ${ky} L${kx - 3} ${ky - 84} L${kx + 3} ${ky - 84} L${kx + 16} ${ky} M${kx - 26} ${ky - 66} H${kx + 26} M${kx - 20} ${ky - 46} H${kx + 20} M${kx - 13} ${ky - 30} L${kx + 9} ${ky - 6} M${kx + 13} ${ky - 30} L${kx - 9} ${ky - 6} M${kx - 8} ${ky - 60} L${kx + 6} ${ky - 40} M${kx + 8} ${ky - 60} L${kx - 6} ${ky - 40}" stroke="${kc}" stroke-width="2.6" fill="none"/>
    <rect x="${kx - 46}" y="${ky + 4}" width="92" height="20" rx="10" fill="${black ? '#fee2e2' : '#fff'}" stroke="${black ? '#dc2626' : '#7f1d1d'}"/><text x="${kx}" y="${ky + 18}" text-anchor="middle" font-size="12" font-weight="bold" fill="#7f1d1d">한전 22.9kV${black ? ' ✕' : ''}</text></g>`});
  items.sort((a, b) => a.y - b.y || b.x - a.x).forEach(i => o.push(i.svg));

  // 동 사이 흐름: 지붕 위로 넘어가는 호 (굵기 = 회선 수 · 흐르는 점 = 방향)
  const top = b => { const t = mP(b.c[0], b.c[1], b.h); return [t[0], t[1] - 6]; };
  const end = id => id === '@kepco' ? [kx, ky - 84] : top(mapByBld(id));
  const tags = [];
  // 건물을 골랐으면: 들어오는 회선을 한 가닥씩 (보내는 쪽 차단기·반 그림 → 받는 쪽 TR·반 그림)
  const DT = FOC && !OUT ? mapDetail(mapBldOf(MAP.selB), FOC) : null;
  // 같은 두 동 사이에 전압이 여러 개면 곡선 높이를 조금씩 달리
  const nth = {};
  edges.forEach(e => {
    const foc = FOC && FOC.pairs.has(e.a + '>' + e.b);
    if (!OUT && !foc && !MAP.lay[e.cls]) return;          // 꺼 둔 레이어
    if (DT && DT.pairs.has(e.a + '>' + e.b)) return;       // 한 가닥씩 따로 그림
    const A = end(e.a), B = end(e.b), dist = Math.hypot(B[0] - A[0], B[1] - A[1]), j = nth[e.a + e.b] = (nth[e.a + e.b] || 0) + 1;
    const cx = (A[0] + B[0]) / 2, cy = Math.min(A[1], B[1]) - 40 - dist * .22 - (j - 1) * 26;
    const c = fpLineCol(e.f[0].n), w = 4 + Math.min(5, new Set(e.f.map(f => f.p && f.p.id)).size) * 1.6, on = !black && !(OUT && e.f.every(f => !P.alive.has(f.n.id)));
    const d = `M${A[0]} ${A[1]} Q${cx} ${cy} ${B[0]} ${B[1]}`;
    const op = FOC && !foc ? .1 : on ? 1 : .3;
    o.push(`<g class="mpE" pointer-events="none" opacity="${op}"><path d="${d}" fill="none" stroke="#fff" stroke-width="${w + 5}" stroke-linecap="round" opacity=".85"/>`,
      `<path d="${d}" fill="none" stroke="${on ? c.c : '#9ca3af'}" stroke-width="${w}" stroke-linecap="round"/>`,
      on ? `<path d="${d}" fill="none" stroke="#fff" stroke-width="${Math.max(2, w / 2.6)}" stroke-dasharray="3 20" stroke-linecap="round"><animate attributeName="stroke-dashoffset" from="46" to="0" dur="1.1s" repeatCount="indefinite"/></path>` : '',
      `<circle cx="${B[0]}" cy="${B[1]}" r="${w / 2 + 2}" fill="${on ? c.c : '#9ca3af'}" stroke="#fff" stroke-width="2"/></g>`);
    if (FOC && !foc) return;                                // 강조 중이면 다른 선 꼬리표는 숨김
    const k = new Set(e.f.map(f => f.p && f.p.id)).size, tx = e.a === '@kepco' ? `${e.v} 인입` : `${e.v} · ${k}회선`;
    tags.push(`<g class="mpE" pointer-events="none"><rect x="${cx - tx.length * 3.9 - 8}" y="${(A[1] + 2 * cy + B[1]) / 4 - 11}" width="${tx.length * 7.8 + 16}" height="21" rx="10.5" fill="#fff" stroke="${on ? c.c : '#d4d4d8'}" stroke-width="1.5"/><text x="${cx}" y="${(A[1] + 2 * cy + B[1]) / 4 + 4}" text-anchor="middle" font-size="11.5" fill="#334155">${esc(tx)}</text></g>`);
  });

  // 건물 이름표 자리 먼저 계산
  const LB = {};
  MAP_BLD.forEach(b => {
    const bld = mapBldOf(b.id), nm = mapName(b), n = cnt[bld] || 0, em = emN[bld] > 0;
    const [x, y] = mP((b.x0 + b.x1) / 2, b.y1, b.h);
    const sub = b.small ? '' : OUT ? (cutOf(bld) ? `⛔ 정전 · 분전반 ${dP[bld] || 0}` : partOf(bld) ? `⚠ 일부 정전 · 분전반 ${dP[bld] || 0}/${pnl[bld] || 0}개 정전` : n ? '정상' : '')
      : em ? `⚡ 비상 전원 ${emN[bld]}곳` : black ? '정전' : '';
    const fs = b.small ? 11.5 : 14, w = Math.max(nm.length * fs + 26, sub.length * 7 + 16), hgt = sub ? 36 : 22;
    LB[b.id] = {b, bld, nm, n, em, x, ly: y - (b.small ? 30 : sub ? 46 : 34), w, hgt, sub, fs, cut: cutOf(bld), part: partOf(bld), dim: FOC && !FOC.blds.has(bld)};
  });
  // 설비 자리: 끌어다 놓은 건 그 바닥 위에 기둥, 아니면 그 동 이름표 오른쪽에 배지로
  const SP = new Map(), slot = {};
  srcs.forEach((n, i) => {
    const p = mapCfg().pos[n.id], b = mapByBld(bk(n));
    if (p || !b) { const q = p || [60 + i * 70, 960], g = mP(q[0], q[1]); SP.set(n.id, {x: g[0], y: g[1] - 30, bx: g[0], by: g[1], pole: 1}); return; }
    const L = LB[b.id], j = slot[b.id] = (slot[b.id] || 0) + 1, x = L.x + L.w / 2 + 4 + j * 38 - 18, y = L.ly + L.hgt / 2;
    SP.set(n.id, {x, y, bx: x, by: y + 30});
  });
  // 발전기·태양광·ESS → 공급 위치 (빨간 점선 호)
  srcs.forEach(n => {
    const t = byId(n.link), tb = t && mapByBld(bk(t)); if (!tb) return;
    if (!OUT && !(FOC ? FOC.srcs.includes(n) : MAP.lay.em || feed)) return;
    const A = SP.get(n.id), B = top(tb), run = P.src[n.id] === 'run' && feed;
    const d = `M${A.x} ${A.y} Q${(A.x + B[0]) / 2} ${Math.min(A.y, B[1]) - 50} ${B[0]} ${B[1]}`;
    o.push(`<path pointer-events="none" d="${d}" fill="none" stroke="${run ? '#dc2626' : '#fca5a5'}" stroke-width="${run ? 6 : 2.5}" stroke-dasharray="${run ? '14 9' : '6 6'}" stroke-linecap="round">${run ? '<animate attributeName="stroke-dashoffset" from="46" to="0" dur="1s" repeatCount="indefinite"/>' : ''}</path>`);
  });
  // 선 꼬리표 → 건물 이름표 → 설비 (위로 갈수록 나중에)
  if (DT) o.push(mapDetailSvg(DT, top, black));
  o.push(...tags);
  Object.values(LB).forEach(L => {
    const {b, x, ly, w, hgt, sub, fs, n} = L, em = L.em || L.cut, dot = em ? '#dc2626' : L.part ? '#f97316' : black ? '#9ca3af' : n ? '#22c55e' : '#cbd5e1';
    o.push(`<g class="mpB" data-mpb="${b.id}" style="cursor:pointer" opacity="${L.dim ? .45 : 1}"><rect x="${x - w / 2}" y="${ly}" width="${w}" height="${hgt}" rx="7" fill="${em ? '#fff1f2' : L.part ? '#fff7ed' : '#fff'}" stroke="${em ? '#dc2626' : L.part ? '#f97316' : !OUT && MAP.selB === b.id ? '#262f7d' : '#cbd5e1'}" stroke-width="${MAP.selB === b.id || em || L.part ? 2 : 1}" opacity=".96"/>
      <circle cx="${x - w / 2 + 11}" cy="${ly + 11}" r="4.5" fill="${dot}"/><text x="${x + 5}" y="${ly + 15}" text-anchor="middle" font-size="${fs}" font-weight="bold" fill="#0f172a">${esc(L.nm)}</text>
      ${sub ? `<text x="${x}" y="${ly + 30}" text-anchor="middle" font-size="10.5" font-weight="${OUT && (em || L.part) ? 'bold' : 'normal'}" fill="${em ? '#b91c1c' : L.part ? '#c2410c' : OUT && n ? '#15803d' : '#64748b'}">${esc(sub)}</text>` : ''}
      <line x1="${x}" y1="${ly + hgt}" x2="${x}" y2="${ly + hgt + 8}" stroke="#94a3b8"/></g>`);
  });
  srcs.forEach(n => {
    const q = SP.get(n.id), s = P.src[n.id], {x, y} = q, r = q.pole ? 22 : 16;
    let ring = '#94a3b8', state = '', pulse = false;
    if (n.type === 'GEN') {
      if (k === 'start' || (feed && s === 'run')) { ring = '#dc2626'; state = k === 'start' ? '기동 중' : '⚡ 공급 중'; pulse = true; }
      else state = s === 'off' ? '내림' : '대기';
    } else if (!black) { ring = n.type === 'PV' ? '#16a34a' : '#2563eb'; state = n.type === 'PV' ? '발전 중' : '피크 대응'; }
    else { state = s === 'run' ? '⚡ 공급 중' : '정지'; if (s === 'run' && feed) { ring = '#dc2626'; pulse = true; } }
    const ic = fpIcon(n), hl = k === 'other' && n.type !== 'GEN', tc = ring === '#94a3b8' ? '#475569' : ring;
    o.push(`<g class="mpS" data-mps="${esc(n.id)}" data-bx="${q.bx}" data-by="${q.by}" style="cursor:${MAP.edit ? 'move' : 'pointer'}"><title>${esc(label(n))}${n.kw ? ' ' + esc(n.kw) + 'kW' : ''} · ${esc(state)}${n.link ? '' : ' · 공급 위치 조사 중'}</title>`,
      q.pole ? `<ellipse cx="${x}" cy="${q.by}" rx="14" ry="5" fill="#000" opacity=".18"/><line x1="${x}" y1="${q.by}" x2="${x}" y2="${y + r}" stroke="#64748b" stroke-width="2"/>` : '',
      hl ? `<circle cx="${x}" cy="${y}" r="${r + 10}" fill="none" stroke="#f59e0b" stroke-width="4"><animate attributeName="r" values="${r + 6};${r + 14};${r + 6}" dur="1.2s" repeatCount="indefinite"/></circle>` : '',
      `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke="${ring}" stroke-width="${q.pole ? 4 : 3}">${pulse ? `<animate attributeName="stroke-width" values="3;8;3" dur=".9s" repeatCount="indefinite"/>` : ''}</circle>`,
      ic ? ic.replace('<svg ', `<svg x="${x - r * .64}" y="${y - r * .64}" width="${r * 1.28}" height="${r * 1.28}" `) : '',
      q.pole ? `<text x="${x + 26}" y="${y - 3}" font-size="12" font-weight="bold" fill="#0f172a" paint-order="stroke" stroke="#fff" stroke-width="4">${esc(label(n))}${n.kw ? ' ' + esc(n.kw) + 'kW' : ''}</text><text x="${x + 26}" y="${y + 12}" font-size="11.5" fill="${tc}" paint-order="stroke" stroke="#fff" stroke-width="4">${esc(state)}${n.link ? '' : ' · 연결 조사 중'}</text>`
        : `<text x="${x}" y="${y + r + 11}" text-anchor="middle" font-size="10.5" font-weight="bold" fill="${tc}" paint-order="stroke" stroke="#fff" stroke-width="3.5">${n.kw ? esc(n.kw) + 'kW' : esc(state)}</text>`,
      '</g>');
  });
  if (OUT) {
    const off = [...P.off].map(byId).filter(Boolean).map(label).join(', ');
    o.push(`<g><rect x="14" y="12" width="${Math.max(330, off.length * 9 + 120)}" height="62" rx="10" fill="#fff" stroke="#cbd5e1" opacity=".95"/>
      <text x="28" y="36" font-size="15" font-weight="bold" fill="#0f172a">정전 범위 · ${esc(off)} 차단</text>
      ${[['#dc2626', '정전'], ['#f97316', '일부 정전'], ['#22c55e', '정상']].map(([c, t], i) => `<rect x="${28 + i * 100}" y="48" width="14" height="14" rx="3" fill="${c}"/><text x="${48 + i * 100}" y="60" font-size="12.5" fill="#334155">${t}</text>`).join('')}</g>`);
  }
  o.push('</svg>');
  return o.join('');
}

/* ---------- 건물을 골랐을 때: 회선 한 가닥씩 ---------- */
// 보내는 쪽 = 경로에서 다른 동의 마지막 항목 (VCB · ACB · 배전반 피더 · MCC …) · 받는 쪽 = 이 동 첫 항목 (TR · 배전반 …)
function mapDetail(bld, FOC) {
  const rows = FOC.paths.map(p => { const fd = p.chain.filter(n => bk(n) !== bld).pop(); return fd && mapByBld(bk(fd)) ? {fd, ent: p.n, a: bk(fd)} : null; }).filter(Boolean);
  if (!rows.length) return null;
  rows.sort((x, y) => label(x.fd).localeCompare(label(y.fd), 'ko', {numeric: true}));
  return {bld, rows, pairs: new Set(rows.map(r => r.a + '>' + bld))};
}
// 차단기·반 그림: VCB → 고압반 · ACB → 배전반(ACB) · 그 밖 차단기 → 들어 있는 반 그림 · 반·TR → 그 그림
function mapDevPic(n) {
  if (typeof bvPic !== 'function') return '';
  if (n.type === 'CB') { if (n.cbk === 'VCB') return bvPicVCB(); if (n.cbk === 'ACB') return bvPicMDB(1); const h = bvPanelOf(n); return h ? bvPic(h, 0, 0) : bvPicMDB(0); }
  return BV_PT[n.type] ? bvPic(n, 0, 0) : bvPicMDB(0);
}
function mapDetailSvg(DT, top, black) {
  const o = [], SC = 1, IW = 40 * SC, IH = 54 * SC, GAP = 76, TG = [];
  // 동마다 그림을 지붕 위에 한 줄로
  const place = (bld, list) => { const b = mapByBld(bld); if (!b) return {}; const T = top(b), M = {}, u = [...new Map(list.map(n => [n.id, n])).values()];
    u.forEach((n, i) => { M[n.id] = {x: T[0] + (i - (u.length - 1) / 2) * GAP, y: T[1] - 26}; }); return M; };
  const byA = {}; DT.rows.forEach(r => (byA[r.a] = byA[r.a] || []).push(r));
  const PS = {}; Object.entries(byA).forEach(([a, rs]) => Object.assign(PS, place(a, rs.map(r => r.fd))));
  const PE = place(DT.bld, DT.rows.map(r => r.ent));
  const dev = (n, q, sub, col) => `<g class="mpDv" data-mpgo="${esc(n.id)}" style="cursor:pointer"><title>${esc(bk(n))} ${esc(label(n))}\n누르면 계통 트리에서 보기</title>
      <rect x="${q.x - IW / 2 - 4}" y="${q.y - IH - 4}" width="${IW + 8}" height="${IH + 8}" rx="5" fill="#fff" stroke="${col}" stroke-width="2"/>
      <g transform="translate(${q.x - IW / 2},${q.y - IH}) scale(${SC})">${mapDevPic(n)}</g>
      <text x="${q.x}" y="${q.y + 15}" text-anchor="middle" font-size="11" font-weight="bold" fill="#0f172a" paint-order="stroke" stroke="#fff" stroke-width="3.5">${esc(sdFit(label(n), GAP + 10, 11))}</text>
      ${sub ? `<text x="${q.x}" y="${q.y + 27}" text-anchor="middle" font-size="9.5" fill="${col}" font-weight="bold" paint-order="stroke" stroke="#fff" stroke-width="3">${esc(sub)}</text>` : ''}</g>`;
  // 선 먼저 (그림 아래로)
  DT.rows.forEach((r, i) => {
    const A = PS[r.fd.id], B = PE[r.ent.id]; if (!A || !B) return;
    const v = outV(r.fd) || inV(r.ent) || effV(r.fd), c = black ? '#9ca3af' : pV(v) >= 1000 ? '#ea580c' : '#2563eb';
    const ay = A.y - IH - 4, by = B.y - IH - 4, dist = Math.hypot(B.x - A.x, by - ay), cy = Math.min(ay, by) - 45 - dist * .24;   // 먼 쌍일수록 높게 → 선끼리 안 겹치고 겹겹이
    const d = `M${A.x} ${ay} Q${(A.x + B.x) / 2} ${cy} ${B.x} ${by}`;
    o.push(`<g pointer-events="none"><path d="${d}" fill="none" stroke="#fff" stroke-width="7" opacity=".9"/><path d="${d}" fill="none" stroke="${c}" stroke-width="3.2"/>`,
      black ? '' : `<path d="${d}" fill="none" stroke="#fff" stroke-width="1.6" stroke-dasharray="3 16"><animate attributeName="stroke-dashoffset" from="38" to="0" dur="1.2s" repeatCount="indefinite"/></path>`,
      `<circle cx="${B.x}" cy="${by}" r="4" fill="${c}" stroke="#fff" stroke-width="1.5"/></g>`);
    if (i === 0 || r.a !== DT.rows[i - 1].a) {   // 동마다 꼬리표 하나: 전압 · 회선 수
      const k = DT.rows.filter(x => x.a === r.a).length, tx = `${v} · ${k}회선`, mx = (A.x + B.x) / 2, my = (ay + 2 * cy + by) / 4;
      TG.push(`<g pointer-events="none"><rect x="${mx - tx.length * 3.9 - 8}" y="${my - 11}" width="${tx.length * 7.8 + 16}" height="21" rx="10.5" fill="#fff" stroke="${c}" stroke-width="1.5"/><text x="${mx}" y="${my + 4}" text-anchor="middle" font-size="11.5" font-weight="bold" fill="${c}">${esc(tx)}</text></g>`);
    }
  });
  o.push(...TG);   // 꼬리표는 선 위에
  const seen = new Set();
  DT.rows.forEach(r => {
    const v = outV(r.fd) || inV(r.ent) || '', c = pV(v) >= 1000 ? '#ea580c' : '#2563eb';
    if (!seen.has(r.fd.id) && PS[r.fd.id]) { seen.add(r.fd.id); o.push(dev(r.fd, PS[r.fd.id], r.fd.cbk || (TYPES[r.fd.type] || {}).l || '', c)); }
    if (!seen.has(r.ent.id) && PE[r.ent.id]) { seen.add(r.ent.id); const e = r.ent;
      o.push(dev(e, PE[e.id], e.type === 'TR' ? [e.v2, e.kva ? e.kva + 'kVA' : ''].filter(Boolean).join(' · ') : effV(e) || '', e.type === 'TR' && typeof BV_VC === 'function' ? BV_VC(e.v2) : c)); }
  });
  return `<g class="mpDt">${o.join('')}</g>`;
}

/* ---------- 건물 정보 카드 ---------- */
// 전원 경로 요약: 모든 경로가 같은 앞부분은 한 줄로, 갈라지는 회선은 표로
function mapSum(bld, PA) {
  const P = PA.paths; if (!P.length) return {txt: '', html: ''};
  const C = P.map(p => p.chain); let k = 0;
  while (C.every(c => c[k] && c[k].id === C[0][k].id && c.length > k + 1)) k++;   // 공통 앞부분 길이 (마지막 = 이 동 입구는 남김)
  const key = (a, last) => a.filter((n, i) => n.type === 'TR' || n.type === 'GEN' || i === a.length - 1 && last || (i && bk(a[i - 1]) !== bk(n)));   // TR · 동이 바뀌는 곳 · 갈라지는 곳만
  const nd = n => { const T = TYPES[n.type] || {c: '#64748b'}, sp = n.type === 'TR' ? [n.kva ? Number(n.kva).toLocaleString() + 'kVA' : '', `${effV(n) || '?'}→${n.v2 || '?'}`].filter(Boolean).join(' · ') : n.cbk || '';
    return `<a data-mpgo="${esc(n.id)}" class="pc" style="border-color:${T.c}">${bk(n) !== bld ? `<em>${esc(bk(n))}</em>` : ''}${esc(label(n))}${sp ? `<small>${esc(sp)}</small>` : ''}</a>`; };
  const sh = C[0].slice(0, k), split = sh[sh.length - 1];
  let html = sh.length ? `<div class="mpLine"><span class="pk">한전 22.9kV</span>${key(sh, true).map(n => '<i>→</i>' + nd(n)).join('')}${P.length > 1 ? `<span class="mpSp">에서 ${P.length}회선으로</span>` : ''}</div>` : '';
  // 갈라진 뒤: 회선(동 밖 마지막 차단기) → 이 동 입구(TR 등)
  const rows = P.map(p => { const br = p.chain.slice(k), ent = p.n, fd = p.chain.filter(n => bk(n) !== bld).pop() || null;   // null = 한전에서 바로
    return {fd, ent, kva: ent.type === 'TR' && ent.kva ? Number(ent.kva).toLocaleString() + ' kVA' : '', v: ent.type === 'TR' ? ent.v2 || '' : effV(ent) || '', mid: br.filter(n => n !== fd && n !== ent)}; })
    .sort((a, b) => (a.fd ? label(a.fd) : '').localeCompare(b.fd ? label(b.fd) : '', 'ko', {numeric: true}));
  html += `<table class="mpTb"><thead><tr><th>회선</th><th>${esc(bld)} 받는 곳</th><th>용량</th><th>전압</th></tr></thead><tbody>${rows.map(r => `<tr><td>${r.fd ? `<a data-mpgo="${esc(r.fd.id)}">${esc(label(r.fd))}</a>${r.fd.cbk ? `<small> ${esc(r.fd.cbk)}</small>` : ''}` : '한전 인입'}</td>
    <td><a data-mpgo="${esc(r.ent.id)}"><b>${esc(label(r.ent))}</b></a></td><td>${esc(r.kva)}</td><td><b style="color:${typeof BV_VC === 'function' ? BV_VC(r.v) : '#0f172a'}">${esc(r.v)}</b></td></tr>`).join('')}</tbody></table>`;
  // 한 문장
  const srcB = rows[0].fd ? bk(rows[0].fd) : '한전', V = inV(rows[0].ent) || effV(rows[0].fd || rows[0].ent) || '', trs = rows.filter(r => r.ent.type === 'TR');
  const kv = trs.reduce((a, r) => a + (parseFloat(r.ent.kva) || 0), 0), vs = [...new Set(trs.map(r => r.v).filter(Boolean))];
  const from = split && bk(split) === srcB ? `${esc(srcB)} ${esc(label(key(sh, true).filter(n => n.type === 'TR').pop() || split))}` : esc(srcB);
  const jo = w => { const c = String(w).slice(-1).charCodeAt(0) - 0xAC00; return c >= 0 && c < 11172 ? (c % 28 ? '은' : '는') : '은(는)'; };   // 본동은 · 신관은 · 바이오동은
  const txt = `<b>${esc(bld)}</b>${jo(bld)} ${from}에서 <b>${esc(V)} ${P.length}회선</b>${P.length > 1 && rows.every(r => r.fd) ? `(${rows.map(r => esc(label(r.fd))).join(' · ')})` : ''}으로 받아` +
    (trs.length ? `, <b>TR ${trs.length}대${kv ? ` (${kv.toLocaleString()} kVA)` : ''}</b>로 ${esc(vs.join(' / '))}를 만들어 써요.` : '요.');
  return {txt, html};
}
function mapCard() {
  const b = MAP_BLD.find(x => x.id === MAP.selB); if (!b) return '';
  const bld = mapBldOf(b.id), N = S.nodes.filter(n => bk(n) === bld);
  const ty = t => N.filter(n => n.type === t).length;
  const src = N.filter(n => FP_SRC[n.type]), PA = mapPaths(bld), sm = mapSum(bld, PA);
  const head = `<div class="mpH"><span class="x" data-mpa="close" title="닫기">✕</span><span class="x" data-mpa="min" title="${MAP.cardMin ? '펼치기' : '접기'}">${MAP.cardMin ? '▾' : '▴'}</span><b>${esc(mapName(b))}</b>
    <div>${N.length ? `TR ${ty('TR')} · 분전반 ${N.filter(n => FP_BOX[n.type]).length} · 항목 ${N.length} · 비상 ${N.filter(n => effSrc(n) === 'E').length}` : '아직 이 동 데이터가 없어요'}</div></div>`;
  if (MAP.cardMin) return `<div id="mpCard" class="min">${head}<div class="mpBt"><button data-mpa="inside" class="pri">🏢 건물 안 보기</button></div></div>`;   // 접으면 머리줄만
  return `<div id="mpCard">${head}
    ${PA.paths.length ? `<div class="mpS2">⚡ 어디서 오나</div>${sm.txt ? `<div class="mpSum">${sm.txt}</div>` : ''}${sm.html}` : ''}
    ${UIX.edit ? `<div class="mpS2">전원 설비 <span class="muted">(편집)</span></div><ul>${src.map(n => `<li><a data-mpgo="${esc(n.id)}">${esc(label(n))}${n.kw ? ' ' + esc(n.kw) + 'kW' : ''}</a> → ${byId(n.link) ? esc(bk(byId(n.link)) + ' ' + label(byId(n.link))) : '<i>공급 위치 조사 중</i>'}</li>`).join('') || '<li class="muted">없음</li>'}</ul>
    <div class="mpBt ed"><button data-mpadd="GEN">+ 발전기</button><button data-mpadd="PV">+ 태양광</button><button data-mpadd="ESS">+ ESS</button></div>` : ''}
    <div class="mpBt"><button data-mpa="inside" class="pri">🏢 건물 안 보기</button>${N.length ? '<button data-mpa="flow">⚡ 전기 Flow</button>' : ''}</div>
    ${MAP.edit ? `<label class="mpS2">이 건물의 동 (데이터 이름)<select data-mpbm="${b.id}">${S.blds.map(x => `<option${x === bld ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select></label>` : ''}</div>`;
}

/* ---------- 화면 ---------- */
function mapView() {
  if (typeof BV !== 'undefined' && BV.b) return bvView();   // 건물 안 보기
  const S6 = mapSteps(), st = S6[MAP.step] || S6[0], sc = MAP.step > 0;
  const lay = [['hv', '고압 22.9·3.3kV', '#ea580c'], ['lv', '저압 380·220V', '#2563eb'], ['em', '비상 전원', '#dc2626']];
  return `<div class="mpBar"><h2>공장 지도</h2><span class="mpLay">${lay.map(([k, l, c]) => `<button data-mpl="${k}" class="${MAP.lay[k] ? 'on' : ''}"><i style="background:${c}"></i>${l}</button>`).join('')}</span><span class="sp"></span>
      <button data-mpa="png">🖼 PNG</button></div>
    <div class="mpSc">
      <div class="mpSt">${S6.map((s, i) => `<button data-mpst="${i}" class="${i === MAP.step ? 'on' : ''}${i ? ' bk' : ''}">${s.t}</button>`).join('')}</div>
      <div class="mpD ${sc && MAP.step < 5 ? 'bk' : ''}"><b>${st.t}</b> ${esc(st.d)}</div>
      <div class="mpNv"><button data-mpa="prev"${MAP.step ? '' : ' disabled'}>◀ 이전</button><button data-mpa="next"${MAP.step < S6.length - 1 ? '' : ' disabled'}>다음 ▶</button>
        <button data-mpa="auto" class="${MAP.auto ? 'on' : ''}">${MAP.auto ? '⏸ 멈춤' : '⏵ 자동 재생'}</button></div>
    </div>
    ${MAP.edit ? '<div class="mpHint">✎ 편집 중: 발전기·태양광·ESS·한전 철탑을 끌어서 옮기기 · 건물을 눌러 [+ 발전기] 등 추가</div>' : ''}
    <div id="mpW">${mapSvg()}${mapCard()}</div>`;
}
function mapGo(i) {
  const n = mapSteps().length; MAP.step = Math.max(0, Math.min(n - 1, i));
  if (MAP.step === n - 1) MAP.auto = false;
  renderView();
}
function mapAuto(on) {
  MAP.auto = on; clearInterval(_mapT);
  if (on) { if (MAP.step >= mapSteps().length - 1) MAP.step = 0; _mapT = setInterval(() => { if (UI.tab !== 'map' || !MAP.auto) { clearInterval(_mapT); return; } mapGo(MAP.step + 1); }, 4500); }
  renderView();
}
function mapPng() {
  const s = mapSvg().replace('<svg ', `<svg width="${MAP_W}" height="${MAP_H}" `), img = new Image();
  img.onload = () => { const c = document.createElement('canvas'); c.width = MAP_W * 2; c.height = MAP_H * 2;
    const g = c.getContext('2d'); g.scale(2, 2); g.drawImage(img, 0, 0);
    c.toBlob(b => download(b, `공장지도_${(mapSteps()[MAP.step] || {}).t || ''}_${stamp()}.png`.replace(/[\\/:*?"<>| ]/g, '_'), 'image/png')); };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
}

/* ---------- 이벤트 ---------- */
function mapPt(e) {
  const sv = document.getElementById('mapSvg'); if (!sv) return [0, 0];
  const p = sv.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
  const q = p.matrixTransform(sv.getScreenCTM().inverse()); return [Math.round(q.x), Math.round(q.y)];
}
document.addEventListener('click', e => {
  if (UI.tab !== 'map' || !e.target.closest || !e.target.closest('#view')) return;
  if (MAP.drag && MAP.drag.moved) return;
  const t = e.target;
  const ly = t.closest('[data-mpl]');
  if (ly) { const k = ly.dataset.mpl; MAP.lay[k] = MAP.lay[k] ? 0 : 1; try { localStorage.setItem('ckd_elec2_maplay', JSON.stringify(MAP.lay)); } catch (e2) {} renderView(); return; }
  const st = t.closest('[data-mpst]'); if (st) { MAP.auto = false; clearInterval(_mapT); mapGo(+st.dataset.mpst); return; }
  const a = t.closest('[data-mpa]');
  if (a) {
    const v = a.dataset.mpa, b = MAP_BLD.find(x => x.id === MAP.selB);
    if (v === 'prev') mapGo(MAP.step - 1); else if (v === 'next') mapGo(MAP.step + 1);
    else if (v === 'auto') mapAuto(!MAP.auto);
    else if (v === 'edit') { MAP.edit = !MAP.edit; renderView(); }
    else if (v === 'close') { MAP.selB = ''; renderView(); }
    else if (v === 'min') { MAP.cardMin = !MAP.cardMin; try { localStorage.setItem('ckd_elec2_mpmin', MAP.cardMin ? '1' : ''); } catch (e) {} renderView(); }
    else if (v === 'png') mapPng();
    else if (v === 'flow' && b) { // 그 동으로 들어가는 첫 항목을 골라 단선도에서 경로 표시
      const B = mapBldOf(b.id), n = S.nodes.find(x => bk(x) === B && !FP_SRC[x.type] && (!par(x) || bk(par(x)) !== B)) || S.nodes.find(x => bk(x) === B);
      UI.tab = 'sld'; saveUI(); if (n) select(n.id, true); else renderView(); }
    else if (v === 'tree' && b) { UI.bld = mapBldOf(b.id); saveUI(); renderAll(); }
    return;
  }
  const ad = t.closest('[data-mpadd]');
  if (ad) {
    const b = MAP_BLD.find(x => x.id === MAP.selB); if (!b) return;
    const n = mkNode(ad.dataset.mpadd, ''); n.bld = mapBldOf(b.id); n.name = {GEN: '비상발전기', PV: '태양광', ESS: 'ESS'}[n.type];
    snap('추가'); S.nodes.push(n); save(); select(n.id, true);
    toast(`${n.name}를 ${n.bld}에 추가했어요. 오른쪽 속성창에서 용량·공급 위치를 넣고, [✎ 설비 위치 편집]으로 지도 위치를 옮기세요.`, true); return;
  }
  const go = t.closest('[data-mpgo]'); if (go) { select(go.dataset.mpgo, true); return; }
  const s = t.closest('.mpS'); if (s) { select(s.dataset.mps, true); return; }
  const b = t.closest('.mpB'); if (b) { MAP.selB = MAP.selB === b.dataset.mpb ? '' : b.dataset.mpb; renderView(); return; }
});
document.addEventListener('change', e => {
  if (!e.target.matches || !e.target.matches('#view [data-mpbm]')) return;
  const id = e.target.dataset.mpbm, def = MAP_BLD.find(x => x.id === id).bld, m = mapCfg();
  if (e.target.value === def) delete m.bmap[id]; else m.bmap[id] = e.target.value;
  save(); renderView();
});
document.addEventListener('pointerdown', e => {
  if (UI.tab !== 'map' || !MAP.edit || e.button !== 0 || !e.target.closest) return;
  const s = e.target.closest('#mapSvg .mpS'), k = e.target.closest('#mapSvg .mpK');
  if (!s && !k) return;
  MAP.drag = {id: s ? s.dataset.mps : '@kepco', el: s || k, p0: mapPt(e), base: s ? [+s.dataset.bx, +s.dataset.by] : null, moved: false}; e.preventDefault();
});
document.addEventListener('pointermove', e => {
  const d = MAP.drag; if (!d) return;
  const p = mapPt(e), dx = p[0] - d.p0[0], dy = p[1] - d.p0[1];
  if (!d.moved && Math.abs(dx) + Math.abs(dy) < 5) return;
  d.moved = true; d.el.setAttribute('transform', `translate(${dx},${dy})`);
});
document.addEventListener('pointerup', e => {
  const d = MAP.drag; if (!d) return;
  setTimeout(() => { MAP.drag = null; }, 0);
  if (!d.moved) return;
  // 화면에서 움직인 만큼을 바닥 좌표로
  const p = mapPt(e), gy = (p[1] - d.p0[1]) / MAP_F, dx = Math.round(p[0] - d.p0[0] - gy * MAP_K), dy = Math.round(gy), m = mapCfg();
  if (d.id === '@kepco') { const K = mapKepco(); m.kepco = [K[0] + dx, K[1] + dy]; }
  else { // 놓은 자리(기둥 밑)를 바닥 좌표로
    const X = d.base[0] + p[0] - d.p0[0], Y = d.base[1] + p[1] - d.p0[1], gy2 = (Y - MAP_OY) / MAP_F;
    m.pos[d.id] = [Math.round(X - MAP_OX - gy2 * MAP_K), Math.round(gy2)]; }
  save(); renderView();
});

(function () {
  const s = document.createElement('style');
  s.textContent = `
#view .mpBar{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:8px}
#view .mpBar h2{color:#262f7d;margin:0;font-size:17px}#view .mpBar .sp{flex:1}
#view .mpBar button,#view .mpNv button,#view .mpBt button{padding:5px 10px;border:1px solid #d6dbe8;background:#fff;border-radius:6px;font-size:12px;cursor:pointer;color:#334155}
#view .mpBar button.on,#view .mpNv button.on,#view .mpBt button.pri{background:#262f7d;color:#fff;border-color:#262f7d}
#view .mpNv button:disabled{opacity:.4;cursor:default}
#view .mpSc{border:1px solid #e2e8f0;border-radius:10px;padding:8px;margin-bottom:6px;background:#fff}
#view .mpSt{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px}
#view .mpSt button{padding:4px 10px;border:1px solid #d6dbe8;background:#fff;border-radius:999px;font-size:12px;cursor:pointer;color:#334155}
#view .mpSt button.bk{border-color:#fecaca;color:#991b1b}
#view .mpSt button.on{background:#262f7d;color:#fff;border-color:#262f7d}#view .mpSt button.bk.on{background:#dc2626;border-color:#dc2626}
#view .mpD{font-size:14px;line-height:1.6;color:#1e293b;background:#f0f9ff;border-radius:8px;padding:8px 12px;min-height:46px}
#view .mpD.bk{background:#fef2f2;color:#7f1d1d}#view .mpD b{margin-right:6px}
#view .mpNv{display:flex;gap:4px;margin-top:6px;justify-content:flex-end}
#view .mpHint{font-size:12px;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:5px 9px;margin-bottom:6px}
#view .mpHint.soft{color:#64748b;background:#f8fafc;border-color:#e2e8f0}
#mpW{position:relative;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden}
#mpW svg{display:block;width:100%;height:auto;user-select:none}body:not(.ro) #mpW svg{touch-action:none}
#mpW .mpB:hover polygon:first-of-type{stroke-width:5}
#mpCard{position:absolute;top:10px;right:10px;width:290px;max-height:calc(100% - 20px);overflow:auto;background:#fff;border:1px solid #cbd5e1;border-radius:10px;box-shadow:0 6px 20px rgba(15,23,42,.18);font-size:12.5px}
#view .mpLay{display:flex;flex-wrap:wrap;gap:4px;margin-left:8px}
#view .mpLay button{padding:4px 10px;border:1px solid #d6dbe8;background:#fff;border-radius:999px;font-size:12px;cursor:pointer;color:#94a3b8;display:inline-flex;align-items:center;gap:5px}
#view .mpLay button i{display:inline-block;width:16px;height:4px;border-radius:2px;opacity:.35}
#view .mpLay button.on{color:#0f172a;border-color:#94a3b8;background:#f8fafc}#view .mpLay button.on i{opacity:1}

#mpCard .pc{display:inline-flex;flex-direction:column;border:1.5px solid #cbd5e1;border-left-width:4px;border-radius:5px;padding:0 5px;margin:1px 2px;font-size:11.5px;color:#0f172a!important;line-height:1.3;vertical-align:middle;text-decoration:none}
#mpCard .pc small{color:#64748b;font-size:10px}
#mpCard .pc+.pc:before,#mpCard .pb+.pc:before{content:''}
#mpCard .pk,#mpCard .pb{display:inline-block;font-size:10.5px;color:#fff;border-radius:999px;padding:1px 7px;margin:1px 2px;vertical-align:middle}#mpCard .pk{background:#7f1d1d}
#mpCard .mpH{background:#262f7d;color:#fff;padding:9px 12px}#mpCard .mpH b{font-size:15px}#mpCard .mpH div{color:#c7d2fe;font-size:11.5px;margin-top:2px}
#mpCard .x{float:right;cursor:pointer;opacity:.8;margin-left:10px;font-size:14px}#mpCard.min{width:250px}
#mpCard .mpSum{margin:4px 12px 6px;padding:7px 9px;background:#fff7ed;border-left:3px solid #ea580c;border-radius:4px;line-height:1.55;color:#431407}#mpCard .mpSum b{color:#9a3412}
#mpCard .mpLine{padding:2px 12px;line-height:2}#mpCard .mpLine i{font-style:normal;color:#94a3b8;margin:0 1px}#mpCard .mpLine .pc em{font-style:normal;font-size:9.5px;color:#0891b2;font-weight:700}
#mpCard .mpSp{font-size:11.5px;color:#9a3412;font-weight:700;margin-left:3px}
#mpCard .mpTb{width:calc(100% - 24px);margin:4px 12px;border-collapse:collapse;font-size:12px}#mpCard .mpTb th{background:#f8fafc;color:#64748b;font-size:11px;text-align:left;padding:4px 6px;border-bottom:1px solid #e2e8f0}
#mpCard .mpTb td{padding:4px 6px;border-bottom:1px solid #f1f5f9}#mpCard .mpTb small{color:#94a3b8;font-size:10px}#mpCard .mpTb a{color:#0f172a;text-decoration:none}#mpCard .mpTb a:hover{text-decoration:underline}

#mpCard .mpS2{display:block;font-weight:700;color:#262f7d;padding:8px 12px 2px}
#mpCard ul{margin:0;padding:0 12px 0 28px}#mpCard li{margin:2px 0}#mpCard a{color:#1d4ed8;cursor:pointer}
#mpCard .mpBt{display:flex;flex-wrap:wrap;gap:4px;padding:8px 12px 0}#mpCard .mpBt:last-of-type{padding-bottom:10px}
#mpCard label select{display:block;width:calc(100% - 24px);margin:4px 12px 10px;font-weight:normal}`;
  document.head.appendChild(s);
})();
