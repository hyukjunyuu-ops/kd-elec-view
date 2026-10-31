/* =========================================================
   check.js — 분전반 요약 줄 · 데이터 점검 탭
   - pvSum(h)   : 결선도(분전반 외형) 위에 붙는 한 줄 요약
   - chkView()  : 가운데 [데이터 점검] 탭 — 현장 확인이 필요한 항목 목록
   데이터 조사가 진행 중이라 빈 값이 많아도 그대로 보여 주기만 하고, 아무것도 고치지 않아요.
   ========================================================= */

/* ---------- 공통 판정 ---------- */
const CK_PANEL = {PNL: 1, MCC: 1, MDB: 1, UPS: 1, SS: 1};          // 결선도·도면에서 '반'으로 보는 종류
const ckSpare = n => /spare|예비|칸\s*채우기/i.test(n.name || '');
const ckNoLabel = n => !String(n.name || '').trim() || /라벨\s*x/i.test(n.name || '');
const ckAmp = n => { const m = String(n.rating || '').match(/[\d.]+/); return m ? parseFloat(m[0]) : 0; };
const ckSingle = n => n.wire === '1P220' || n.wire === '1P380' || String(n.poles) === '2';
// 회로(차단기·부하) 줄인지 — 분전반 아래 칸
const ckCircuit = n => n.type === 'LOAD' || n.type === 'CB';
// 저압(1kV 미만)인지 — 정격(A)·차단기 형식 점검은 저압 분전 계통만 (고압 VCB·고압 부하는 따로 조사)
const ckLow = n => { const v = pV(effV(n)); return !v || v < 1000; };
// 가장 가까운 상위 '반' (현장에서 찾아갈 곳)
function ckHost(n) { let p = par(n), g = 0; while (p && g++ < 60) { if (CK_PANEL[p.type]) return p; p = par(p); } return null; }
const ckPlaced = n => !!(n.floor && n.x !== '' && n.x != null);

/* ---------- 분전반 요약 줄 ---------- */
function pvSum(h) {
  const C = kids(h.id).filter(n => !isSlot(n));   // 빈 자리는 회로로 안 셈
  if (!C.length) return '';
  const spare = C.filter(ckSpare), noLb = C.filter(n => !ckSpare(n) && ckNoLabel(n)), used = C.filter(n => !ckSpare(n));
  const noAmp = used.filter(n => !ckAmp(n)).length;
  // 상별: 단상 회로는 지정된 상에, 3상 회로는 따로 셈 (정격 합은 실제 부하가 아니라 참고용)
  const ph = {R: {n: 0, a: 0}, S: {n: 0, a: 0}, T: {n: 0, a: 0}};
  let three = 0, noPh = 0;
  used.forEach(n => {
    if (ckSingle(n)) { const p = ph[n.phase]; if (p) { p.n++; p.a += ckAmp(n); } else noPh++; }
    else three++;
  });
  // 정격이 다 들어 있으면 정격 합, 아니면 회로 수로 비교
  const byAmp = ['R', 'S', 'T'].every(k => ph[k].n === 0 || ph[k].a > 0) && (ph.R.a + ph.S.a + ph.T.a) > 0;
  const A = ['R', 'S', 'T'].map(k => byAmp ? ph[k].a : ph[k].n), mx = Math.max(...A), mn = Math.min(...A), av = (A[0] + A[1] + A[2]) / 3;
  const unb = av ? Math.round((mx - mn) / av * 100) : 0;
  const kw = used.reduce((s, n) => s + (parseFloat(n.kw) || 0), 0), kwN = used.filter(n => parseFloat(n.kw)).length;
  const main = ckAmp(h), over = main ? used.filter(n => ckAmp(n) > main) : [];

  const chip = (t, cls, tip) => `<span class="ckC${cls ? ' ' + cls : ''}"${tip ? ` title="${esc(tip)}"` : ''}>${t}</span>`;
  const out = [
    chip(`회로 <b>${C.length}</b>`),
    chip(`사용 <b>${used.length - noLb.length}</b>`),
    spare.length ? chip(`SPARE <b>${spare.length}</b>`, 'sp') : '',
    noLb.length ? chip(`라벨X·이름없음 <b>${noLb.length}</b>`, 'wn', '현장 확인 필요') : '',
    noAmp ? chip(`정격 미입력 <b>${noAmp}</b>`, 'wn') : '',
    '<i class="ckS"></i>',
    ...['R', 'S', 'T'].map(k => chip(`${k} <b>${ph[k].n}</b><small>${ph[k].a ? ph[k].a + 'A' : ''}</small>`, 'ph' + k)),
    three ? chip(`3상 <b>${three}</b>`) : '',
    noPh ? chip(`상 미지정 <b>${noPh}</b>`, 'wn') : '',
    (ph.R.n + ph.S.n + ph.T.n) >= 3 ? chip(`불평형 <b>${unb}%</b><small>${byAmp ? '정격' : '회로 수'}</small>`, unb > 30 ? 'bad' : unb > 15 ? 'wn' : 'ok',
      (byAmp ? '단상 회로 정격(A) 합' : '단상 회로 수(정격 미입력이 있어서)') + ' 기준 참고값 — 실제 부하 전류가 아니에요. (최대-최소)/평균') : '',
    kwN ? chip(`kW 합 <b>${Math.round(kw * 10) / 10}</b><small>${kwN}/${used.length}개 입력</small>`) : '',
    over.length ? chip(`메인보다 큰 차단기 <b>${over.length}</b>`, 'bad', over.map(label).join(', ')) : ''
  ];
  return `<div class="ckSum">${out.join('')}</div>`;
}

/* ---------- 데이터 점검 ---------- */
// 점검 규칙: [키, 이름, 설명, 해당 여부(n)]
const CK_RULES = [
  ['lbl', '라벨X·이름 없음', '현장에서 회로 이름 확인', n => ckCircuit(n) && !ckSpare(n) && ckNoLabel(n)],
  ['amp', '정격 미입력', '저압 차단기 정격(A) 확인', n => (ckCircuit(n) || CK_PANEL[n.type]) && ckLow(n) && !ckSpare(n) && !ckAmp(n) && n.type !== 'UPS'],
  ['mdl', '형식 미입력', '저압 MCCB / ELB 등 차단기 형식 확인', n => ckCircuit(n) && ckLow(n) && !ckSpare(n) && !String(n.model || n.cbk || '').trim()],
  ['phs', '상 미지정', '단상 회로의 R/S/T 확인', n => ckCircuit(n) && !ckSpare(n) && ckSingle(n) && !/^[RST]$/.test(n.phase || '')],
  ['ovr', '상위보다 큰 정격', '하위 차단기 정격이 상위 반 메인보다 큼 — 입력 오류 또는 협조 확인', n => {
    if (!ckAmp(n)) return false; const h = ckHost(n); return !!(h && ckAmp(h) && ckAmp(n) > ckAmp(h)); }],
  ['plc', '도면 미배치', '위치 도면에 아직 안 찍힌 반', n => !!CK_PANEL[n.type] && !ckPlaced(n)],
  ['bld', '동 미지정', '어느 동인지 지정 안 됨', n => !effBld(n)],
];
const CK = {on: null, bld: ''};
try { Object.assign(CK, JSON.parse(localStorage.getItem('ckd_elec2_chk') || '{}')); } catch (e) {}
function ckKeep() { try { localStorage.setItem('ckd_elec2_chk', JSON.stringify({on: CK.on, bld: CK.bld})); } catch (e) {} }

function ckRun() {
  const on = new Set(CK.on || CK_RULES.map(r => r[0]));
  const hit = new Map(); // id → [규칙키…]
  const cnt = {};
  S.nodes.forEach(n => {
    if (isSlot(n)) return;
    if (CK.bld && bk(n) !== CK.bld) return;
    CK_RULES.forEach(([k, , , f]) => {
      let r = false; try { r = f(n); } catch (e) {}
      if (!r) return;
      cnt[k] = (cnt[k] || 0) + 1;
      if (on.has(k)) { if (!hit.has(n.id)) hit.set(n.id, []); hit.get(n.id).push(k); }
    });
  });
  return {on, hit, cnt};
}

// 동 → 반(현장 위치) 순서로 묶기
function ckGroups(hit) {
  const G = new Map();
  hit.forEach((ks, id) => {
    const n = byId(id), h = CK_PANEL[n.type] ? n : ckHost(n);
    const b = bk(n), gk = b + '|' + (h ? h.id : '');
    if (!G.has(gk)) G.set(gk, {b, h, rows: []});
    G.get(gk).rows.push([n, ks]);
  });
  const ord = new Map(); let i = 0;
  const walk = pid => kids(pid).forEach(n => { ord.set(n.id, i++); walk(n.id); });
  walk('');
  const o = n => ord.has(n.id) ? ord.get(n.id) : 1e9;
  const gs = [...G.values()];
  gs.forEach(g => g.rows.sort((a, b) => o(a[0]) - o(b[0])));
  const bi = b => { const x = S.blds.indexOf(b); return x < 0 ? 999 : x; };
  gs.sort((a, b) => bi(a.b) - bi(b.b) || (a.h ? o(a.h) : -1) - (b.h ? o(b.h) : -1));
  return gs;
}

const CK_MAX = 400; // 한 번에 그리는 줄 수 (많으면 엑셀로)
function chkView() {
  const {on, hit, cnt} = ckRun(), gs = ckGroups(hit);
  const blds = [...new Set(S.nodes.map(bk))].sort((a, b) => { const x = S.blds.indexOf(a), y = S.blds.indexOf(b); return (x < 0 ? 999 : x) - (y < 0 ? 999 : y); });
  const chips = CK_RULES.map(([k, l, d]) =>
    `<button data-ckr="${k}" class="${on.has(k) ? 'on' : ''}" title="${esc(d)}">${l} <b>${cnt[k] || 0}</b></button>`).join('');
  const bsel = `<select data-ckb><option value="">전체 동</option>${blds.map(b => `<option${b === CK.bld ? ' selected' : ''}>${esc(b)}</option>`).join('')}</select>`;
  const RL = Object.fromEntries(CK_RULES.map(r => [r[0], r[1]]));
  let shown = 0, body = '';
  for (const g of gs) {
    if (shown >= CK_MAX) break;
    const hl = g.h ? `<span class="ckH" data-id="${esc(g.h.id)}">${esc(label(g.h))}</span>${g.h.loc ? ` <span class="muted">${esc(g.h.loc)}</span>` : ''}${g.h.floor ? ` <span class="muted">· ${esc(g.h.floor)}</span>` : ''}` : '<span class="muted">(상위 반 없음)</span>';
    body += `<tr class="ckG"><td colspan="5"><b>${esc(g.b)}</b> › ${hl} <span class="muted">${g.rows.length}건</span></td></tr>`;
    for (const [n, ks] of g.rows) {
      if (shown++ >= CK_MAX) break;
      body += `<tr class="c${n.id === UI.sel ? ' sel' : ''}" data-id="${esc(n.id)}"><td>${esc(n.no || '')}</td><td>${esc(n.name || '')}</td><td>${esc(spec(n))}</td><td>${esc(n.model || n.cbk || '')}${n.phase ? ' · ' + esc(n.phase) + '상' : ''}</td><td>${ks.map(k => `<span class="ckT t-${k}">${RL[k]}</span>`).join('')}</td></tr>`;
    }
  }
  const more = hit.size > CK_MAX ? `<div class="muted" style="margin:8px 0">처음 ${CK_MAX}건만 보여요. 전체는 [📊 엑셀]로 받으세요.</div>` : '';
  return `<div class="ph" style="max-width:none"><div class="pvBar"><h2>데이터 점검</h2>
    <span class="muted">현장 확인이 필요한 항목 · 줄 클릭 = 트리에서 선택</span><span class="sp"></span>${bsel}<button data-ckx="1">📊 엑셀</button><button data-rp="1">📄 계획정전 보고서</button></div>
    <div class="ckR">${chips}</div>
    ${hit.size ? `<table class="tb ckTb"><thead><tr><th>번호</th><th>명칭</th><th>사양</th><th>형식·상</th><th>확인할 것</th></tr></thead><tbody>${body}</tbody></table>${more}`
      : '<div class="empty">고른 조건에 걸리는 항목이 없어요. 👍</div>'}</div>`;
}

function ckExcel() {
  const {hit} = ckRun(), gs = ckGroups(hit), RL = Object.fromEntries(CK_RULES.map(r => [r[0], r[1]]));
  const X = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const H = ['동', '반(위치)', '반 설치 위치', '층', '번호', '명칭', '종류', '사양', '형식', '상', '확인할 것', '확인 결과(현장 기입)', '경로'];
  let r = '';
  gs.forEach(g => g.rows.forEach(([n, ks]) => {
    r += '<tr>' + [g.b, g.h ? label(g.h) : '', g.h ? g.h.loc : '', g.h ? g.h.floor : '', n.no, n.name, tlabel(n), spec(n), n.model || n.cbk, n.phase,
      ks.map(k => RL[k]).join(', '), '', pathOf(n).map(label).join(' › ')].map(v => `<td style="mso-number-format:'\\@'">${X(v)}</td>`).join('') + '</tr>';
  }));
  const html = `<html><head><meta charset="UTF-8"></head><body><table border="1"><tr>${H.map(h => `<th style="background:#e8ebf8">${h}</th>`).join('')}</tr>${r}</table></body></html>`;
  download(new Blob(['\ufeff' + html], {type: 'application/vnd.ms-excel'}), `데이터점검_${CK.bld || '전체'}_${stamp()}.xls`);
}

/* ---------- 이벤트 ---------- */
document.addEventListener('click', e => {
  const v = e.target.closest && e.target.closest('#view');
  if (!v || UI.tab !== 'chk') return;
  const r = e.target.closest('[data-ckr]');
  if (r) {
    const on = new Set(CK.on || CK_RULES.map(x => x[0])), k = r.dataset.ckr;
    on.has(k) ? on.delete(k) : on.add(k); CK.on = [...on]; ckKeep(); renderView(); return;
  }
  if (e.target.closest('[data-ckx]')) { ckExcel(); return; }
  const h = e.target.closest('.ckH,[data-id]');
  if (h && h.dataset.id && byId(h.dataset.id)) select(h.dataset.id, true);
});
document.addEventListener('change', e => {
  if (!e.target.matches || !e.target.matches('#view [data-ckb]')) return;
  CK.bld = e.target.value; ckKeep(); renderView();
});

(function () {
  const s = document.createElement('style');
  s.textContent = `
.ckSum{display:flex;flex-wrap:wrap;gap:5px;align-items:center;margin:2px 0 8px}
.ckC{display:inline-flex;align-items:baseline;gap:4px;padding:3px 9px;border-radius:999px;background:#f3f4f8;border:1px solid #e3e6f0;font-size:12px;color:#4b5563}
.ckC b{color:#262f7d;font-size:13px}.ckC small{color:#9ca3af;font-size:10.5px}
.ckC.sp{background:#f8fafc;color:#94a3b8}.ckC.wn{background:#fffbeb;border-color:#fde68a;color:#92400e}.ckC.wn b{color:#b45309}
.ckC.bad{background:#fef2f2;border-color:#fecaca;color:#991b1b}.ckC.bad b{color:#dc2626}.ckC.ok{background:#f0fdf4;border-color:#bbf7d0}
.ckC.phR{border-left:4px solid #92400e}.ckC.phS{border-left:4px solid #18181b}.ckC.phT{border-left:4px solid #9ca3af}
.ckS{width:1px;height:18px;background:#d6dbe8;margin:0 3px}
.ckR{display:flex;flex-wrap:wrap;gap:5px;margin:4px 0 10px}
.ckR button{padding:4px 10px;border:1px solid #d6dbe8;background:#fff;border-radius:999px;font-size:12px;cursor:pointer;color:#64748b}
.ckR button.on{background:#262f7d;color:#fff;border-color:#262f7d}.ckR button b{margin-left:2px}
.ckLoose{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:8px 10px;font-size:12px;color:#92400e;margin-bottom:10px;line-height:1.6}
.ckTb tr.ckG td{background:#eef1fa;color:#262f7d;position:sticky;top:26px}
.ckTb .ckH{cursor:pointer;text-decoration:underline dotted}
.ckT{display:inline-block;font-size:10.5px;padding:1px 6px;border-radius:4px;margin-right:3px;background:#fef3c7;color:#92400e}
.ckT.t-ovr{background:#fee2e2;color:#b91c1c}.ckT.t-plc,.ckT.t-bld{background:#e0e7ff;color:#3730a3}`;
  document.head.appendChild(s);
})();
