/* =========================================================
   tools.js — 중요 부하 · 엑셀(CSV) 일괄 수정 · 공용 창
   - 중요 부하: 속성창에서 직접 체크한 것만 (n.imp = 분류 이름)
   - 일괄 수정: [📁 파일] → CSV 받기 → 엑셀에서 고침 → CSV 올리기 → 바뀌는 것 미리보기 → 반영
     '추천' 열은 이름으로 짐작한 참고용이고 반영하지 않아요
   ========================================================= */

const IMP_CATS = ['통신·서버', '유틸리티', 'UPS', '저온창고', '냉장·냉동·챔버', '기타'];
// 이름으로 짐작 (엑셀 '추천' 열에만 씀)
const IMP_RX = [
  ['UPS', /\bUPS\b/i],
  ['저온창고', /저온\s*창고/],
  ['냉장·냉동·챔버', /냉장|냉동|챔버|chamber|항온|안정성|인큐베이터/i],
  ['통신·서버', /서버|전산|통신|중계기|네트워크|IDC|교환기|\bNW\b/i],
  ['유틸리티', /CHILLER|칠러|냉각수|순환펌프|\bPUMP\b|펌프장|압축기|컴프레서|\bRO\b|정제수|청정증기|보일러|수처리|냉각탑/i],
];
function impSuggest(n) {
  const nm = String(n.name || '');
  if (!nm.trim() || /spare|예비|라벨\s*x|칸\s*채우기/i.test(nm)) return '';
  const h = IMP_RX.find(([, rx]) => rx.test(nm)); return h ? h[0] : '';
}
// 편집 모드 속성창에 들어가는 칸
function impForm(n) {
  const slot = (n.type === 'LOAD' || n.type === 'CB') ? `<div class="slotRow"><button type="button" data-slot="${esc(n.id)}">${isSlot(n) ? '↺ 빈 자리 해제 (차단기 있음)' : '▢ 빈 자리로 표시 (차단기 없음)'}</button><span class="muted"> 현장 순서 맞추기용 칸</span></div>` : '';
  if (isSlot(n)) return slot;
  return slot + `<label>중요 부하 (계획정전 보고서에 나와요)<select data-f="imp"><option value="">— 아님 —</option>${IMP_CATS.map(c => `<option${c === n.imp ? ' selected' : ''}>${c}</option>`).join('')}</select></label>`;
}

/* ---------- 공용 창 ---------- */
function uiModal(html, wide) {
  let m = document.getElementById('mdl');
  if (!m) { m = document.createElement('div'); m.id = 'mdl'; document.body.appendChild(m); }
  m.innerHTML = `<div class="mdlB${wide ? ' wide' : ''}"><span class="mdlX" data-mdl="x">✕</span>${html}</div>`;
  m.hidden = false;
  return m;
}
const uiModalClose = () => { const m = document.getElementById('mdl'); if (m) m.hidden = true; };

/* ---------- CSV ---------- */
const XC = [   // [열 이름, 필드, 고칠 수 있음]
  ['ID', 'id', 0], ['동', n => effBld(n), 0], ['경로', n => pathOf(n).slice(0, -1).map(label).join(' › '), 0], ['종류', n => tlabel(n), 0],
  ['번호', 'no', 1], ['명칭', 'name', 1], ['정격(A)', 'rating', 1], ['극수', 'poles', 1], ['형식', 'model', 1], ['상(R/S/T)', 'phase', 1],
  ['kW', 'kw', 1], ['중요 부하', 'imp', 1], ['추천(참고)', n => n.imp ? '' : impSuggest(n), 0], ['비고', 'note', 1]];
const csvQ = v => { v = String(v ?? ''); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
function xlsOut() {
  const rows = [XC.map(c => c[0])], walk = pid => kids(pid).forEach(n => { rows.push(XC.map(([, f]) => typeof f === 'function' ? f(n) : n[f] || '')); walk(n.id); });
  walk('');
  download(new Blob(['﻿' + rows.map(r => r.map(csvQ).join(',')).join('\r\n')], {type: 'text/csv'}), `전기계통_일괄수정_${stamp()}.csv`);
  toast('일괄 수정용 CSV를 받았어요. 엑셀에서 고친 뒤 [CSV UTF-8] 또는 [CSV (쉼표로 분리)]로 저장해서 올리세요. ID 열은 고치지 마세요.', false);
}
function csvParse(t) {
  const out = []; let row = [], cur = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; row.push(cur); out.push(row); row = []; cur = ''; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); out.push(row); }
  return out.filter(r => r.some(v => v.trim()));
}
// 엑셀이 바꿔 놓는 것(01 → 1 등)은 같은 값으로 봄
const sameV = (a, b) => { a = String(a ?? '').trim(); b = String(b ?? '').trim(); return a === b || (a !== '' && b !== '' && !isNaN(a) && !isNaN(b) && Number(a) === Number(b)); };
function impNorm(v, old) {
  v = String(v || '').trim(); if (!v) return '';
  const c = IMP_CATS.find(k => k === v) || IMP_CATS.find(k => k.split('·').some(p => v.includes(p)));
  if (c) return c;
  return /^(o|y|v|1|중요|✓|✔|●)$/i.test(v) ? (old || '기타') : '기타';
}
let XI = null;   // 반영 대기 중인 변경
async function xlsIn(file) {
  const buf = await file.arrayBuffer();
  let t, kr = false; try { t = new TextDecoder('utf-8', {fatal: true}).decode(buf); } catch (e) { t = new TextDecoder('euc-kr').decode(buf); kr = true; }   // 엑셀 기본 CSV는 EUC-KR
  // EUC-KR로 저장하면 일부 특수문자(›, ⚠ 등)가 깨지거나 빠짐 → 그것만 다른 칸은 건너뜀
  const bare = v => String(v ?? '').replace(/[^\u0020-\u007E\uAC00-\uD7A3\u3131-\u318E\u00B7]/g, '').replace(/\?/g, '').trim();
  let lossy = 0;
  const R = csvParse(t.replace(/^﻿/, '')); if (!R.length) { alert('빈 파일이에요.'); return; }
  const H = R[0].map(h => h.trim()), ix = name => H.indexOf(name), iId = ix('ID');
  if (iId < 0) { alert('ID 열이 없어요. [📤 일괄 수정용 엑셀(CSV) 받기]로 받은 파일을 고쳐서 올려 주세요.'); return; }
  const ch = [], miss = [];
  R.slice(1).forEach(r => {
    const n = byId(String(r[iId] || '').trim()); if (!n) { if (String(r[iId] || '').trim()) miss.push(r[iId]); return; }
    XC.filter(c => c[2]).forEach(([h, f]) => {
      const i = ix(h); if (i < 0) return;
      let v = String(r[i] ?? '').trim(); if (f === 'imp') v = impNorm(v, n.imp);
      if (f === 'phase') v = v.toUpperCase().replace(/상$/, '');
      if (sameV(n[f], v)) return;
      if (kr && bare(n[f]) === bare(v)) { lossy++; return; }
      ch.push({n, f, h, a: n[f] || '', b: v});
    });
  });
  XI = ch;
  const cnt = new Set(ch.map(c => c.n.id)).size, by = {};
  ch.forEach(c => { by[c.h] = (by[c.h] || 0) + 1; });
  uiModal(`<h3>엑셀 반영 미리보기</h3>
    <p>${ch.length ? `<b>${cnt}개 항목 · ${ch.length}칸</b>이 바뀌어요. (${Object.entries(by).map(([k, v]) => `${esc(k)} ${v}`).join(' · ')})` : '바뀌는 칸이 없어요.'}
      ${miss.length ? `<br><span class="muted">지금 데이터에 없는 ID ${miss.length}줄은 건너뛰어요.</span>` : ''}
      ${lossy ? `<br><span style="color:#b45309">⚠ 엑셀 기본 CSV(EUC-KR)로 저장돼서 특수문자만 깨진 ${lossy}칸은 건너뛰었어요. 엑셀에서 <b>[CSV UTF-8]</b>로 저장하면 정확해요.</span>` : ''}</p>
    ${ch.length ? `<div class="mdlS"><table class="tb"><thead><tr><th>항목</th><th>칸</th><th>지금</th><th></th><th>바뀔 값</th></tr></thead><tbody>
      ${ch.slice(0, 500).map(c => `<tr><td title="${esc(pathOf(c.n).map(label).join(' › '))}">${esc(label(c.n))}</td><td>${esc(c.h)}</td><td class="old">${esc(c.a) || '<i>빈칸</i>'}</td><td>→</td><td class="new">${esc(c.b) || '<i>빈칸</i>'}</td></tr>`).join('')}
      </tbody></table>${ch.length > 500 ? `<div class="muted">처음 500칸만 보여요.</div>` : ''}</div>
      <div class="mdlA"><button data-mdl="x">취소</button><button data-mdl="xi" class="pri">✔ ${ch.length}칸 반영</button></div>` : '<div class="mdlA"><button data-mdl="x">닫기</button></div>'}`, true);
}
function xlsApply() {
  if (!XI || !XI.length) return;
  snap('엑셀 반영'); XI.forEach(c => { c.n[c.f] = c.b; });
  const k = XI.length; XI = null; save(); renderAll(); uiModalClose();
  toast(`엑셀에서 ${k}칸을 반영했어요.`, true);
}

/* ---------- 이벤트 ---------- */
document.addEventListener('click', e => {
  const t = e.target; if (!t.closest) return;
  if (t.closest('#bXo')) { xlsOut(); return; }
  const sl = t.closest('[data-slot]');
  if (sl) { const n = byId(sl.dataset.slot); if (!n) return; snap('빈 자리');
    if (isSlot(n)) { delete n.slot; if (/^x$/i.test(String(n.no || '').trim())) n.no = ''; if (/^(x+|칸\s*채우기|빈\s*칸)$/i.test(String(n.name || '').trim())) n.name = ''; }
    else n.slot = 'E';
    save(); renderAll(); return; }
  if (t.closest('#bXi')) { $('#fXi').click(); return; }
  const m = t.closest('[data-mdl]');
  if (m) { if (m.dataset.mdl === 'xi') xlsApply(); else uiModalClose(); return; }
  if (t.id === 'mdl') uiModalClose();
});
document.addEventListener('change', e => {
  if (e.target.id === 'fXi') { const f = e.target.files[0]; e.target.value = ''; if (f) xlsIn(f); }
});

(function () {
  const s = document.createElement('style');
  s.textContent = `
#mdl{position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:100;display:flex;align-items:center;justify-content:center}
#mdl[hidden]{display:none}
#mdl .mdlB{position:relative;background:#fff;border-radius:12px;padding:18px 20px;width:min(520px,94vw);max-height:88vh;display:flex;flex-direction:column;box-shadow:0 20px 50px rgba(0,0,0,.3)}
#mdl .mdlB.wide{width:min(900px,96vw)}
#mdl h3{margin:0 0 8px;color:#262f7d}#mdl p{margin:0 0 10px;font-size:13px;line-height:1.6}
#mdl .mdlX{position:absolute;right:14px;top:10px;cursor:pointer;color:#94a3b8;font-size:18px}
#mdl .mdlS{overflow:auto;flex:1;border:1px solid #e2e8f0;border-radius:8px}
#mdl td.old{color:#94a3b8;text-decoration:line-through}#mdl td.new{color:#15803d;font-weight:700}
#mdl .mdlA{display:flex;justify-content:flex-end;gap:6px;margin-top:12px}
#mdl .mdlA button{padding:6px 14px;border-radius:6px;border:1px solid #cbd5e1;background:#fff;cursor:pointer}
#mdl .mdlA button.pri{background:#262f7d;color:#fff;border-color:#262f7d}
.slotRow{margin:6px 0}.slotRow button{padding:4px 10px;border:1px dashed #94a3b8;background:#fff;border-radius:6px;cursor:pointer;font-size:12px}
.trow .imp{background:#fef3c7;color:#92400e;border:1px solid #fcd34d;border-radius:4px;font-size:10px;padding:0 4px;margin-left:4px}`;
  document.head.appendChild(s);
})();

/* ---------- 백업 알림 ---------- */
// 마지막 백업 시각 · 그 뒤로 고친 횟수 (이 PC 기준)
const BK = {t: 0, chg: 0};
try { BK.t = +localStorage.getItem('ckd_elec2_lastbk') || 0; BK.chg = +localStorage.getItem('ckd_elec2_chg') || 0; } catch (e) {}
function bkShow() {
  const el = $('#bkAge'); if (!el) return;
  const days = BK.t ? Math.floor((Date.now() - BK.t) / 864e5) : -1;
  const warn = BK.chg > 0 && (days < 0 || days >= 7);
  el.textContent = days < 0 ? (BK.chg ? ' · ⚠ 백업 받은 적 없음' : '') : ` · 백업 ${days ? days + '일 전' : '오늘'}${BK.chg ? ` (그 뒤 ${BK.chg}번 고침)` : ''}`;
  el.classList.toggle('warn', warn);
  el.title = warn ? '[📁 파일] → [💾 백업 받기]로 백업해 두세요' : '';
}
(function () {
  const _save = save, _exp = exportBackup;
  save = function () { const r = _save.apply(this, arguments); BK.chg++; try { localStorage.setItem('ckd_elec2_chg', BK.chg); } catch (e) {} bkShow(); return r; };
  exportBackup = async function () { const r = await _exp.apply(this, arguments); BK.t = Date.now(); BK.chg = 0;
    try { localStorage.setItem('ckd_elec2_lastbk', BK.t); localStorage.setItem('ckd_elec2_chg', 0); } catch (e) {} bkShow(); return r; };
  $('#bExp').onclick = exportBackup;   // app.js가 먼저 연결해 둔 것을 새 것으로
  setTimeout(bkShow, 0);
})();

/* ---------- 백업 파일과 비교 ---------- */
const CMP_F = [['type', '종류'], ['no', '번호'], ['name', '명칭'], ['bld', '동'], ['loc', '위치'], ['volt', '전압'], ['v1', '1차'], ['v2', '2차'], ['kva', 'kVA'],
  ['cbk', '차단기'], ['rating', '정격'], ['poles', '극수'], ['model', '형식'], ['phase', '상'], ['wire', '결선'], ['kw', 'kW'], ['src', '전원'], ['imp', '중요 부하'], ['link', '공급 위치'], ['note', '비고']];
async function cmpIn(file) {
  let o; try { o = JSON.parse(await file.text()); } catch (e) { alert('JSON 파일을 읽지 못했어요.'); return; }
  const old = o && o.state && Array.isArray(o.state.nodes) ? o.state.nodes : null;
  if (!old) { alert('이 프로그램에서 받은 백업(JSON)만 비교할 수 있어요.'); return; }
  const M = new Map(old.map(n => [String(n.id), n])), oldName = id => { const n = M.get(id); return n ? [n.no, n.name].filter(Boolean).join(' ') || '(이름 없음)' : ''; };
  const add = S.nodes.filter(n => !M.has(n.id)), del = old.filter(n => !byId(String(n.id)));
  const chg = [];
  S.nodes.forEach(n => {
    const b = M.get(n.id); if (!b) return;
    const d = CMP_F.filter(([f]) => !sameV(b[f], n[f])).map(([f, l]) => `${l}: ${esc(b[f] || '빈칸')} → <b>${esc(n[f] || '빈칸')}</b>`);
    if ((b.pid || '') !== (n.pid || '')) d.push(`위치 이동: ${esc(oldName(String(b.pid)) || '최상위')} 아래 → <b>${esc(par(n) ? label(par(n)) : '최상위')}</b> 아래`);
    if (d.length) chg.push([n, d]);
  });
  const when = o.at ? new Date(o.at).toLocaleString('ko-KR') : '';
  const row = (k, n, txt, path) => `<tr><td><span class="cmpK ${k}">${{a: '추가', d: '삭제', c: '변경'}[k]}</span></td><td title="${esc(path)}">${esc(n)}</td><td>${txt}</td></tr>`;
  const rows = [...add.map(n => row('a', label(n), esc(pathOf(n).slice(0, -1).map(label).join(' › ')), '')),
    ...del.map(n => row('d', [n.no, n.name].filter(Boolean).join(' ') || '(이름 없음)', '', '')),
    ...chg.map(([n, d]) => row('c', label(n), d.join('<br>'), pathOf(n).map(label).join(' › ')))];
  uiModal(`<h3>백업 파일과 비교</h3><p>백업 <b>${esc(file.name)}</b>${when ? ` (${esc(when)})` : ''} → <b>지금</b><br>
    추가 <b style="color:#15803d">${add.length}</b> · 삭제 <b style="color:#dc2626">${del.length}</b> · 변경 <b style="color:#b45309">${chg.length}</b></p>
    ${rows.length ? `<div class="mdlS"><table class="tb"><thead><tr><th></th><th>항목</th><th>내용</th></tr></thead><tbody>${rows.slice(0, 600).join('')}</tbody></table></div>${rows.length > 600 ? '<div class="muted">처음 600줄만 보여요.</div>' : ''}` : '<p>다른 점이 없어요. 👍</p>'}
    <div class="mdlA"><button data-mdl="x">닫기</button></div>`, true);
}
document.addEventListener('click', e => { if (e.target.closest && e.target.closest('#bCmp')) $('#fCmp').click(); });
document.addEventListener('change', e => { if (e.target.id === 'fCmp') { const f = e.target.files[0]; e.target.value = ''; if (f) cmpIn(f); } });
(function () { const s = document.createElement('style');
  s.textContent = '.cmpK{font-size:11px;padding:1px 6px;border-radius:4px;color:#fff}.cmpK.a{background:#16a34a}.cmpK.d{background:#dc2626}.cmpK.c{background:#d97706}';
  document.head.appendChild(s); })();
