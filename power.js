/* =========================================================
   power.js — 전원 설비 · 정전 계산 (전기 Flow 단선도 · 공장 지도 공용)
   - 발전기·태양광·ESS는 트리 항목, 속성창 [공급 위치]로 연결
   - 🔌 한전 정전: 발전기가 공급하는 곳만 살아 있고, 태양광·피크저감 ESS는 멈춤
   ========================================================= */

const FP_BOX = {PNL: 1, MCC: 1, UPS: 1};           // 안쪽 회로는 결선도에서
const FP_SRC = {GEN: 1, PV: 1, ESS: 1};            // 따로 연결하는 전원 설비
const FP_BCOL = ['#0891b2', '#7c3aed', '#16a34a', '#ea580c', '#db2777', '#2563eb', '#ca8a04', '#0d9488', '#9333ea', '#dc2626', '#64748b'];

// 정전 상태 (이 PC에만 저장)
const FP = {black: false, off: []};
try { const o = JSON.parse(localStorage.getItem('ckd_elec2_fp') || '{}'); FP.black = !!o.black; FP.off = Array.isArray(o.off) ? o.off : []; } catch (e) {}
let _fpK = 0;
function fpKeep() {
  clearTimeout(_fpK);
  _fpK = setTimeout(() => { try { localStorage.setItem('ckd_elec2_fp', JSON.stringify({black: FP.black, off: FP.off})); } catch (e) {} }, 300);
}
const fpBcol = b => { const i = S.blds.indexOf(b); return i < 0 ? '#94a3b8' : FP_BCOL[i % FP_BCOL.length]; };
function fpIcon(n) {
  const k = n.type === 'CB' ? (n.cbk === 'VCB' || n.cbk === 'LBS' ? 'vcb' : n.cbk === 'ACB' ? 'acb' : 'lcb')
    : n.type === 'GEN' ? (n.gk === 'CTTS' || /CTTS/i.test((n.name || '') + (n.model || '')) ? 'cgen' : 'gen')
    : ({IN: 'in', HV: 'vcb', TR: 'tr', PV: 'pv', ESS: 'ess', ATS: 'atsw', SS: 'ss', MDB: 'pnl', PNL: 'pnl', MCC: 'mcc', UPS: 'ess', CAP: 'cap',
        LOAD: effSrc(n) === 'E' ? 'eld' : 'load'})[n.type];
  const T = typeof FL_T !== 'undefined' && (FL_T[k] || FL_T.load);
  return T && T.s ? T.s : '';
}
function fpLineCol(n) {
  if (effSrc(n) === 'E') return {c: '#dc2626', d: '7 5', w: 2.6};
  const v = pV(inV(n) || effV(n));
  if (v >= 10000) return {c: (typeof FL_K !== 'undefined' && FL_K.hv.c) || '#eab308', d: '', w: 4};
  if (v >= 1000) return {c: '#ea580c', d: '', w: 3.4};
  return {c: '#2563eb', d: '', w: 2.4};
}
function fpSub(n) {
  if (FP_BOX[n.type]) {
    const C = kids(n.id), sp = C.filter(ckSpare).length, nl = C.filter(k => !ckSpare(k) && ckNoLabel(k)).length;
    return {t: `회로 ${C.length}` + (sp ? ` · SPARE ${sp}` : ''), w: nl ? `라벨X ${nl}` : ''};
  }
  if (FP_SRC[n.type]) return {t: [n.kw ? n.kw + 'kW' : '', n.type === 'GEN' && (n.gk === 'CTTS') ? 'CTTS' : ''].filter(Boolean).join(' · ') || '용량 조사 중', w: ''};
  return {t: spec(n) || (n.type === 'LOAD' ? '' : effV(n)), w: ''};
}

/* ---------- 전기 (평상시 · 한전 정전) ---------- */
function fpOffIds() {
  const s = new Set(FP.off.filter(id => byId(id)));
  try { if (typeof FL !== 'undefined' && FL.off) FL.off.forEach(fid => { const i = flI(fid); if (i && i.nid && byId(i.nid)) s.add(i.nid); }); } catch (e) {}
  return s;
}
// alive: 전기가 있는 항목 · emer: 발전기 등으로 살아 있는 항목 · src: 전원 설비 상태
function fpPower() {
  const off = fpOffIds(), alive = new Set(), emer = new Set(), src = {};
  const feed = (n, set) => {               // n부터 아래로 (내린 차단기에서 멈춤)
    if (!n || off.has(n.id) || set.has(n.id)) return;
    set.add(n.id); kids(n.id).forEach(k => feed(k, set));
  };
  if (!FP.black) {
    kids('').forEach(r => feed(r, alive));
    S.nodes.forEach(n => { if (FP_SRC[n.type]) src[n.id] = off.has(n.id) ? 'off' : 'on'; });
  } else {
    S.nodes.forEach(n => {
      if (!FP_SRC[n.type]) return;
      const runs = n.type === 'GEN' ? n.emg !== 'N' : n.emg === 'Y';
      if (off.has(n.id)) { src[n.id] = 'off'; return; }
      if (!runs) { src[n.id] = 'stop'; return; }
      src[n.id] = 'run';
      feed(n, emer); const t = byId(n.link); if (t) feed(t, emer);
    });
    emer.forEach(id => alive.add(id));
  }
  return {off, alive, emer, src};
}

/* ---------- 속성창: 발전기·태양광·ESS 연결 ---------- */
/* ---------- 속성창: 발전기·태양광·ESS 연결 ---------- */
function fpForm(n) {
  if (!FP_SRC[n.type]) return '';
  // 공급 위치 후보: 반 안 회로를 뺀 항목, 동 › 경로 순
  const opts = [], w = (pid, d) => kids(pid).forEach(x => {
    if (x.id !== n.id && !FP_SRC[x.type] && x.type !== 'LOAD') opts.push(`<option value="${esc(x.id)}"${x.id === n.link ? ' selected' : ''}>${esc('[' + bk(x) + '] ' + ' '.repeat(Math.min(d, 8) * 2) + label(x))}</option>`);
    if (!FP_BOX[x.type]) w(x.id, d + 1);
  });
  w('', 0);
  let h = '<div class="sec">정전 · 연결</div>';
  h += `<label>공급 위치 (어디로 전기를 넣는지)<select data-f="link"><option value="">(조사 중)</option>${opts.join('')}</select></label>`;
  if (n.type === 'GEN') h += r2(`<label>종류<select data-f="gk"><option value="">일반 비상발전기</option><option value="CTTS"${n.gk === 'CTTS' ? ' selected' : ''}>CTTS (상용 병렬 가능)</option></select></label>`,
    `<label>한전 정전 시<select data-f="emg"><option value="">가동</option><option value="N"${n.emg === 'N' ? ' selected' : ''}>가동 안 함</option></select></label>`);
  else h += `<label>한전 정전 시<select data-f="emg"><option value="">공급 안 함${n.type === 'PV' ? ' (단독운전 방지로 정지)' : ' (피크저감용)'}</option><option value="Y"${n.emg === 'Y' ? ' selected' : ''}>공급함</option></select></label>`;
  h += '<div class="muted">전기 Flow 단선도·공장 지도에서 빨간 점선으로 이어지고, [🔌 한전 정전]에서 이 설정대로 보여요.</div>';
  return h;
}
