/* =========================================================
   patrol.js — 전기실 순찰 (핸드폰으로 순찰, PC로 확인)
   - 전기실(QR)마다: 외관 점검 항목 · 온도/습도 · 지정 배전반 V·A·kW·PF
   - 핸드폰: 오늘 순찰 목록 → QR 찍으면 그 전기실 → [저장하고 다음]
   - PC [🔦 순찰] 탭: 오늘 현황 · 기록 · 설정(전기실·배전반 고르기·항목·기준값·구글 시트) · QR 출력
   - 저장: 핸드폰에 먼저 → 구글 시트(Apps Script)로 보냄 (통신 안 되면 대기했다가 다시)
   - 순찰 전용: 설정 링크로 연 핸드폰은 순찰 화면만 (계통 데이터 없이도 됨)
   ========================================================= */

const PT_DEF = {
  rooms: [['util', '유틸리티동'], ['main', '본동'], ['qc', '품질동'], ['bio1', '바이오동', '①'], ['bio2', '바이오동', '②'], ['new', '신관'], ['pen', '페니동'], ['cep', '세파동'], ['ani', '동물실험동']]
    .map(([id, bld, s]) => ({id, bld, name: bld + (s ? ' ' + s : '') + ' 전기실', panels: []})),
  items: ['에어컨 작동', '소음·진동', '이상 냄새', '누수·결로', '조명', '청결·적치물', '소화기', '출입문 잠금'],
  lim: {tHi: 30, hHi: 70, vTol: 10, pfLo: 0.9, aJump: 30},
  url: '', key: ''
};
const PT = {room: '', tab: 'today', remote: [], fetched: 0, busy: false, start: 0, qr: 0};
const ptLS = (k, v) => { try { if (v === undefined) return JSON.parse(localStorage.getItem('ckd_pt_' + k) || 'null'); localStorage.setItem('ckd_pt_' + k, JSON.stringify(v)); } catch (e) { return null; } };
// 설정: PC는 계통 데이터(S.cfg.patrol), 순찰 전용 핸드폰은 설정 링크로 받은 것
function ptCfg() {
  const own = typeof S !== 'undefined' && S.cfg && S.cfg.patrol, link = ptLS('cfg');
  if (own && !ptOnly()) { const c = own; c.items = c.items || PT_DEF.items.slice(); c.lim = Object.assign({}, PT_DEF.lim, c.lim || {});
    if (!c.url && link && link.url) { c.url = link.url; c.key = link.key; if (!link.rooms || !own.rooms.some(r => (r.panels || []).length)) c.rooms = link.rooms || c.rooms; }   // 설정 링크로 받은 시트 주소를 전체 기능에서도
    return c; }
  if (link) return link;
  if (typeof S !== 'undefined' && S.cfg) { S.cfg.patrol = JSON.parse(JSON.stringify(PT_DEF)); return S.cfg.patrol; }
  return JSON.parse(JSON.stringify(PT_DEF));
}
const ptOnly = () => ptLS('only') === 1;
const ptWho = () => ptLS('who') || '';
const ptToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const ptHM = ts => { const d = new Date(ts); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
// 기록: 핸드폰에 쌓고(최근 60일), 시트에서 받은 것과 합침
function ptLocal() { return ptLS('rec') || []; }
function ptAll() { const m = new Map(); [...PT.remote, ...ptLocal()].forEach(r => m.set(r.id, r)); return [...m.values()].sort((a, b) => a.ts < b.ts ? -1 : 1); }
function ptSaveLocal(r) { const L = ptLocal().filter(x => x.id !== r.id); L.push(r); const lim = new Date(Date.now() - 60 * 864e5).toISOString(); ptLS('rec', L.filter(x => x.ts >= lim)); }
// 그 전기실의 오늘 기록 · 지난 기록 (어제 값 비교용)
const ptTodayOf = rid => ptAll().filter(r => r.room === rid && r.d === ptToday()).pop();
const ptPrevOf = rid => ptAll().filter(r => r.room === rid && r.d < ptToday()).pop();

/* ---------- 이상 판정 ---------- */
// 고압 반(3.3kV 등)은 계기에 kV로 나오니 100 미만이면 kV로 보고 V로 바꿈
const ptVolt = (v, nv) => { const x = +v; return nv >= 1000 && x > 0 && x < 100 ? x * 1000 : x; };
function ptCheck(r, c, prev) {
  const L = c.lim, bad = [];
  (c.items || []).forEach(k => { if ((r.items || {})[k] === 'bad') bad.push(`${k} 이상`); });
  if (r.t !== '' && r.t != null && +r.t >= L.tHi) bad.push(`온도 ${r.t}℃`);
  if (r.h !== '' && r.h != null && +r.h >= L.hHi) bad.push(`습도 ${r.h}%`);
  (r.P || []).forEach(p => {
    const nv = pV(p.nv), vv = ptVolt(p.V, nv);
    if (p.V !== '' && nv && Math.abs(vv - nv) / nv * 100 > L.vTol) bad.push(`${p.n} 전압 ${p.V}${nv >= 1000 && +p.V < 100 ? 'kV' : 'V'}`);
    if (p.PF !== '' && +p.PF > 0 && +p.PF < L.pfLo) bad.push(`${p.n} 역률 ${p.PF}`);
    const q = prev && (prev.P || []).find(x => x.n === p.n);
    if (q && q.A > 0 && p.A !== '' && Math.abs(+p.A - q.A) / q.A * 100 >= L.aJump) bad.push(`${p.n} 전류 ${q.A}→${p.A}A`);
  });
  return bad;
}
const ptFieldBad = (k, v, c, p, prev) => {
  if (v === '' || v == null) return false; const L = c.lim;
  if (k === 't') return +v >= L.tHi; if (k === 'h') return +v >= L.hHi;
  if (k === 'V') { const nv = pV(p.nv); return nv && Math.abs(ptVolt(v, nv) - nv) / nv * 100 > L.vTol; }
  if (k === 'PF') return +v > 0 && +v < L.pfLo;
  if (k === 'A') { const q = prev && (prev.P || []).find(x => x.n === p.n); return q && q.A > 0 && Math.abs(+v - q.A) / q.A * 100 >= L.aJump; }
  return false;
};

/* ---------- 구글 시트 (Apps Script) ---------- */
async function ptPost(body) {
  const c = ptCfg(); if (!c.url) return false;
  try { const r = await fetch(c.url, {method: 'POST', body: JSON.stringify(Object.assign({k: c.key}, body))}); const j = await r.json(); return !!j.ok; } catch (e) { return false; }
}
async function ptFlush() {
  const c = ptCfg(); if (!c.url || PT.busy) return; PT.busy = true;
  const Q = ptLocal().filter(r => !r.sent);
  for (const r of Q) { if (await ptPost({a: 'rec', r})) { r.sent = 1; ptSaveLocal(r); } else break; }
  PT.busy = false; ptRerender();
}
async function ptFetch() {   // 최근 기록 (3명 것 다) + 최신 설정
  const c = ptCfg(); if (!c.url) return;
  try {
    const u = `${c.url}?a=recs&days=35&k=${encodeURIComponent(c.key)}`, r = await fetch(u), j = await r.json();
    if (j.ok) { PT.remote = j.recs || []; PT.fetched = Date.now(); }
    // 시트의 순찰 설정(전기실·배전반 목록)이 더 새것이면 받기 — PC에서 고치면 핸드폰은 다음에 열 때 자동 반영
    const r2 = await fetch(`${c.url}?a=cfg&k=${encodeURIComponent(c.key)}`), j2 = await r2.json(), g = j2.ok && j2.cfg;
    // 이 PC 설정이 더 새것이면(또는 시트에 아직 없으면) 시트로 올리기
    if (!ptOnly() && c.rooms.some(r => (r.panels || []).length) && (!g || !g.rooms || (c.at && (!g.at || c.at > g.at)))) { c.at = c.at || Date.now(); await ptPost({a: 'cfg', cfg: ptCfgOut(c)}); }
    else if (g && g.rooms) {
      if (ptOnly()) ptLS('cfg', Object.assign(g, {url: c.url, key: c.key}));
      else if ((g.at || 0) > (c.at || 0)) { if (S.cfg && S.cfg.patrol) { Object.assign(S.cfg.patrol, {rooms: g.rooms, items: g.items || c.items, lim: g.lim || c.lim, at: g.at}); if (typeof save === 'function') save(); } else ptLS('cfg', Object.assign({}, ptLS('cfg') || {}, g, {url: c.url, key: c.key})); }
      if (PT.draft && !ptTouched(PT.draft)) PT.draft = null;   // 아직 아무것도 안 적었으면 새 목록으로 다시
    }
  } catch (e) {}
  ptRerender();
}
const ptWait = () => ptLocal().filter(r => !r.sent).length;

/* ---------- 핸드폰: ① 오늘 순찰 ---------- */
function ptHomeH() {
  const c = ptCfg(), who = ptWho();
  if (!who) return `<div class="ptW"><h2>🔦 전기실 순찰</h2><p class="mu">처음 한 번만 이름을 입력해 주세요.</p><input id="ptWho" placeholder="이름 (예: 홍길동)" autocomplete="name"><button class="ptBig" data-pta="who">시작</button></div>`;
  const T = c.rooms.map(rm => ({rm, r: ptTodayOf(rm.id)})), done = T.filter(x => x.r).length;
  // 다음 = 마지막으로 저장한 전기실 다음부터 순서대로 (동선)
  const last = T.filter(x => x.r).sort((a, b) => a.r.ts < b.r.ts ? -1 : 1).pop(), i0 = last ? T.indexOf(last) + 1 : 0;
  const nx = T.slice(i0).concat(T.slice(0, i0)).find(x => !x.r);
  return `<div class="ptW"><div class="ptHd"><b>🔦 오늘 순찰</b><span>${ptToday().slice(5).replace('-', '/')} · ${esc(who)}</span>${ptOnly() ? '' : ''}</div>
    <div class="ptPr"><i style="width:${Math.round(done / Math.max(1, T.length) * 100)}%"></i></div><div class="mu">${done}/${T.length} 완료${ptWait() ? ` · <b class="w">전송 대기 ${ptWait()}건</b>` : c.url ? ' · 시트 연결됨' : ' · 핸드폰에만 저장 중'}</div>
    <div class="ptL">${T.map(({rm, r}) => { const bad = r && (r.bad || []).length;
      return `<button class="ptR${r ? bad ? ' bad' : ' ok' : rm === (nx || {}).rm ? ' nx' : ''}" data-ptr="${esc(rm.id)}"><span class="ic">${r ? bad ? '⚠' : '✔' : rm === (nx || {}).rm ? '▶' : '○'}</span>
        <span class="nm">${esc(rm.name)}${rm === (nx || {}).rm ? ' <small>다음</small>' : ''}</span><span class="tm">${r ? `${ptHM(r.ts)} ${esc(r.who || '')}${bad ? `<br><em>${esc(r.bad.slice(0, 2).join(' · '))}</em>` : ''}` : ''}</span></button>`; }).join('')}</div>
    ${'BarcodeDetector' in window ? '<button class="ptBig" data-pta="scan">📷 QR 찍기</button>' : '<div class="mu ptTip">전기실 문의 QR을 핸드폰 카메라로 찍으면 그 전기실 순찰이 바로 열려요.</div>'}
    <div class="ptFt"><button data-pta="name">이름 바꾸기</button>${c.url ? '<button data-pta="sync">↻ 새로고침</button>' : ''}${ptOnly() ? '<button data-pta="full">전체 기능 보기</button>' : ''}</div></div>`;
}
/* ---------- 핸드폰: ② 전기실 순찰 ---------- */
function ptRoomH(rid) {
  const c = ptCfg(), rm = c.rooms.find(x => x.id === rid); if (!rm) { PT.room = ''; return ptHomeH(); }
  const cur = PT.draft && PT.draft.room === rid ? PT.draft : (PT.draft = ptNew(rm, c)), prev = ptPrevOf(rid), i = c.rooms.indexOf(rm);
  const it = k => { const bad = cur.items[k] === 'bad';
    return `<div class="ptI${bad ? ' bad' : ''}"><span>${esc(k)}</span><button data-pti="${esc(k)}" data-v="ok"${bad ? '' : ' class="on"'}>정상</button><button data-pti="${esc(k)}" data-v="bad"${bad ? ' class="on b"' : ''}>이상</button></div>
      ${bad ? `<input class="ptMm" data-ptm="${esc(k)}" placeholder="${esc(k)} — 어떤 이상인지" value="${esc(cur.im[k] || '')}">` : ''}`; };
  const num = (k, v, ph, p, u, step) => `<label class="ptN${ptFieldBad(k, v, c, p, prev) ? ' bad' : ''}"><em>${k === 't' ? '온도' : k === 'h' ? '습도' : k}</em><input type="text" inputmode="decimal" enterkeyhint="next" data-ptk="${k}"${p ? ` data-ptp="${esc(p.n)}"` : ''} value="${esc(v === undefined ? '' : v)}" placeholder="${esc(ph)}"><small>${u}</small></label>`;
  const pv = (p, k) => { const q = prev && (prev.P || []).find(x => x.n === p.n); return q && q[k] !== '' && q[k] != null ? String(q[k]) : ''; };
  const bad = ptCheck(cur, c, prev);
  return `<div class="ptW rm"><div class="ptHd"><button data-pta="home">‹</button><b>${esc(rm.name)}</b><span>${i + 1}/${c.rooms.length}</span></div>${c.at ? `<div class="ptCfgAt">배전반 목록: ${(d => `${d.getMonth() + 1}/${d.getDate()} ${ptHM(d)}`)(new Date(c.at))} 설정 기준</div>` : ''}
    ${PT.qr ? '<div class="ptQ">📷 QR로 열림 · ' + ptHM(PT.start) + '</div>' : ''}
    <div class="ptS"><div class="ptSh"><b>외관 점검</b><span class="mu">기본 정상 · 이상만 누르세요</span></div>${(c.items || []).map(it).join('')}</div>
    <div class="ptS"><div class="ptSh"><b>실내 환경</b>${prev ? `<span class="mu">어제 ${prev.t ?? '-'}℃ · ${prev.h ?? '-'}%</span>` : ''}</div><div class="ptG">${num('t', cur.t, prev ? prev.t : '', null, '℃')}${num('h', cur.h, prev ? prev.h : '', null, '%')}</div></div>
    ${cur.P.map(p => `<div class="ptS"><div class="ptSh"><b>${esc(p.n)}</b><span class="mu">${esc(p.nv || '')}${prev ? ' · 회색 = 어제' : ''}</span></div>
      <div class="ptG">${num('V', p.V, pv(p, 'V'), p, pV(p.nv) >= 1000 ? 'kV' : 'V')}${num('A', p.A, pv(p, 'A'), p, 'A')}${num('kW', p.kW, pv(p, 'kW'), p, 'kW')}${num('PF', p.PF, pv(p, 'PF'), p, '')}</div></div>`).join('')
      || '<div class="ptS mu">이 전기실은 계측할 배전반이 아직 없어요 (PC 순찰 설정에서 추가).</div>'}
    <div class="ptS"><textarea data-ptk="memo" rows="2" placeholder="메모 (선택)">${esc(cur.memo || '')}</textarea></div>
    ${bad.length ? `<div class="ptBad">⚠ ${bad.map(esc).join(' · ')}</div>` : ''}
    <div class="ptSave"><button class="ptBig" data-pta="save">저장하고 다음 전기실 ▶</button></div></div>`;
}
function ptNew(rm, c) {
  const old = ptTodayOf(rm.id);   // 오늘 이미 했으면 그걸 고치기 — 배전반 목록은 지금 설정에 맞춤
  if (old) {
    const r = JSON.parse(JSON.stringify(old)), had = r.P || [];
    const P = (rm.panels || []).map(p => { const o = had.find(x => (p.nid && x.nid === p.nid) || x.n === p.n); return o ? Object.assign(o, {n: p.n, nid: p.nid || o.nid || '', nv: p.v || o.nv || ''}) : {n: p.n, nid: p.nid || '', nv: p.v || '', V: '', A: '', kW: '', PF: ''}; });
    // 설정에서 뺀 반은 다시 열면 빠짐 (예전엔 값이 있으면 남겼는데 '왜 아직 나오냐' 헷갈림)
    r.P = P; return r;
  }
  return {id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), room: rm.id, rn: rm.name, items: {}, im: {}, t: '', h: '', memo: '',
    P: (rm.panels || []).map(p => ({n: p.n, nid: p.nid || '', nv: p.v || '', V: '', A: '', kW: '', PF: ''}))};
}
function ptSave() {
  const c = ptCfg(), r = PT.draft; if (!r) return;
  const num = v => v === '' || v == null ? '' : +v;
  r.t = num(r.t); r.h = num(r.h); r.P.forEach(p => { ['V', 'A', 'kW', 'PF'].forEach(k => { p[k] = num(p[k]); }); if (p.PF !== '' && p.PF > 1 && p.PF <= 100) p.PF = Math.round(p.PF) / 100; });   // 역률 88 → 0.88
  const miss = (r.items && Object.keys(r.items).filter(k => r.items[k] === 'bad' && !(r.im[k] || '').trim())) || [];
  if (miss.length && !confirm(`이상 항목에 메모가 없어요 (${miss.join(', ')}). 그냥 저장할까요?`)) return;
  r.who = ptWho(); r.d = r.d || ptToday(); r.ts = new Date().toISOString(); r.st = r.st || new Date(PT.start || Date.now()).toISOString(); r.qr = r.qr || PT.qr || 0;
  (c.items || []).forEach(k => { if (!r.items[k]) r.items[k] = 'ok'; });
  r.bad = ptCheck(r, c, ptPrevOf(r.room)); r.sent = 0;
  ptSaveLocal(r); PT.draft = null;
  const i = c.rooms.findIndex(x => x.id === r.room), nx = c.rooms.slice(i + 1).concat(c.rooms.slice(0, i)).find(x => !ptTodayOf(x.id));
  PT.room = ''; PT.qr = 0; ptRerender(); const pv = document.getElementById('ptV'); if (pv) pv.scrollTop = 0;
  if (typeof toast === 'function') toast(r.bad.length ? `⚠ 저장 · 이상 ${r.bad.length}건` : `✔ ${r.rn} 저장${nx ? ' · 다음: ' + nx.name : ' · 오늘 순찰 끝!'}`, false);
  ptFlush();
}

/* ---------- PC: [🔦 순찰] 탭 ---------- */
function ptView() {
  const c = ptCfg(), tabs = [['today', '오늘 현황'], ['log', '기록'], ['set', '설정 · QR']];
  if (c.url && Date.now() - PT.fetched > 60e3) setTimeout(ptFetch, 0);
  return `<div class="ph" style="max-width:none"><div class="ptBar"><h2>🔦 전기실 순찰</h2><span class="seg">${tabs.map(([k, l]) => `<button data-ptt="${k}"${PT.tab === k ? ' class="on"' : ''}>${l}</button>`).join('')}</span>
    <span class="sp"></span><span class="mu">${c.url ? `구글 시트 연결됨${PT.fetched ? ' · ' + ptHM(PT.fetched) + ' 받음' : ''}` : '구글 시트 미연결 (이 기기 기록만)'}</span>${c.url ? '<button data-pta="sync">↻</button>' : ''}</div>
    ${PT.tab === 'set' ? ptSetH(c) : PT.tab === 'log' ? ptLogH(c) : ptTodayH(c)}</div>`;
}
function ptTodayH(c) {
  const d = PT.day || ptToday(), prevOf = rid => ptAll().filter(r => r.room === rid && r.d < d).pop();
  const R = c.rooms.map(rm => ({rm, r: ptAll().filter(x => x.room === rm.id && x.d === d).pop()})), done = R.filter(x => x.r).length, bad = R.filter(x => x.r && (x.r.bad || []).length).length;
  const late = d === ptToday() && new Date().getHours() >= 17 && done < R.length;
  const v = (val, u, isBad) => val === '' || val == null ? '<span class="nil">–</span>' : `<span${isBad ? ' class="bd"' : ''}>${esc(val)}${u}</span>`;
  const rows = R.map(({rm, r}) => {
    const nm = esc(rm.name.replace(/ 전기실$/, ''));
    if (!r) return `<tr class="no"><td class="rm">${nm}</td><td colspan="8" class="nil">미순찰</td></tr>`;
    const P = r.P && r.P.length ? r.P : [null], pr = prevOf(rm.id), n = P.length, B = r.bad || [];
    return P.map((p, j) => `<tr class="${B.length ? 'bad' : ''}${j ? ' sub' : ''}">${j ? '' : `<td class="rm" rowspan="${n + (B.length || r.memo ? 1 : 0)}"><b>${nm}</b><small>${ptHM(r.ts)} · ${esc(r.who || '')}${r.qr ? ' · QR' : ''}</small></td>
        <td rowspan="${n}" class="c">${v(r.t, '℃', ptFieldBad('t', r.t, c))}</td><td rowspan="${n}" class="c">${v(r.h, '%', ptFieldBad('h', r.h, c))}</td>`}
      ${p ? `<td>${esc(p.n)}</td><td class="r">${v(p.V, '', ptFieldBad('V', p.V, c, p))}</td><td class="r">${v(p.A, '', ptFieldBad('A', p.A, c, p, pr))}</td><td class="r">${v(p.kW, '', false)}</td><td class="r">${v(p.PF, '', ptFieldBad('PF', p.PF, c, p))}</td>` : '<td colspan="5" class="nil">계측 반 없음</td>'}
      ${j ? '' : `<td rowspan="${n}" class="st">${B.length ? '<span class="tg b">이상</span>' : '<span class="tg o">정상</span>'}</td>`}</tr>`).join('')
      + (B.length || r.memo ? `<tr class="nt${B.length ? ' bad' : ''}"><td colspan="8">${B.length ? `<b>${B.map(esc).join(' · ')}</b>` : ''}${r.memo ? `${B.length ? '<br>' : ''}<span class="mm">메모: ${esc(r.memo)}</span>` : ''}</td></tr>` : '');
  }).join('');
  return `<div class="ptDay"><input type="date" data-ptday value="${d}"><span class="sum"><b>${done}</b>/${R.length} 완료${bad ? ` · <span class="bd">이상 ${bad}곳</span>` : ''}${done < R.length ? ` · 미순찰 ${R.length - done}곳${late ? ' <span class="bd">(17시 지남)</span>' : ''}` : ''}</span></div>
    <table class="ptTd"><thead><tr><th>전기실</th><th>온도</th><th>습도</th><th>배전반</th><th class="r">V</th><th class="r">A</th><th class="r">kW</th><th class="r">PF</th><th>상태</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="mu" style="margin-top:6px;font-size:12px">빨간 값 = 기준 벗어남 (전압 ±${c.lim.vTol}% · 역률 ${c.lim.pfLo} 미만 · 온도 ${c.lim.tHi}℃ · 습도 ${c.lim.hHi}% 이상 · 전류 지난번보다 ${c.lim.aJump}% 이상 변화)</div>`;
}
function ptLogH(c) {
  const A = ptAll().slice().reverse().slice(0, 300);
  return `<div class="ptLog"><button data-pta="csv">📊 엑셀(CSV) 받기</button><span class="mu"> 최근 ${A.length}건 · 배전반 줄마다 한 행</span>
    <table class="tb"><thead><tr><th>날짜</th><th>시간</th><th>전기실</th><th>순찰자</th><th>온도</th><th>습도</th><th>배전반</th><th>V</th><th>A</th><th>kW</th><th>PF</th><th>이상</th></tr></thead><tbody>
    ${A.map(r => (r.P && r.P.length ? r.P : [{n: '', V: '', A: '', kW: '', PF: ''}]).map((p, j) => `<tr${(r.bad || []).length ? ' class="bad"' : ''}>${j ? '<td colspan="6"></td>' : `<td>${esc(r.d)}</td><td>${ptHM(r.ts)}</td><td>${esc(r.rn || r.room)}</td><td>${esc(r.who || '')}</td><td>${r.t}</td><td>${r.h}</td>`}
      <td>${esc(p.n)}</td><td>${p.V}</td><td>${p.A}</td><td>${p.kW}</td><td>${p.PF}</td><td>${j ? '' : esc((r.bad || []).join(' · '))}</td></tr>`).join('')).join('') || '<tr><td colspan="12" class="mu">아직 기록이 없어요.</td></tr>'}</tbody></table></div>`;
}
function ptCsv() {
  const rows = [['날짜', '시간', '전기실', '순찰자', 'QR', '온도', '습도', '배전반', 'V', 'A', 'kW', 'PF', '이상', '메모']];
  ptAll().forEach(r => (r.P && r.P.length ? r.P : [{n: ''}]).forEach(p => rows.push([r.d, ptHM(r.ts), r.rn || r.room, r.who || '', r.qr ? 'O' : '', r.t, r.h, p.n, p.V ?? '', p.A ?? '', p.kW ?? '', p.PF ?? '', (r.bad || []).join(' · '), r.memo || ''])));
  download(new Blob(['﻿' + rows.map(r => r.map(csvQ).join(',')).join('\r\n')], {type: 'text/csv'}), `전기실순찰_${stamp()}.csv`);
}
// 설정: 전기실마다 배전반 고르기 · 항목 · 기준값 · 시트 · QR
function ptSetH(c) {
  const L = c.lim, cand = S.nodes.filter(n => (['MDB', 'MCC', 'UPS'].includes(n.type) || (n.type === 'CB' && (n.cbk === 'ACB' || n.cbk === 'VCB'))) && !isSlot(n));   // 계측기 있는 큐비클: VCB·ACB·배전반·MCC·UPS
  const room = rm => `<div class="ptRm"><div class="h"><input data-ptrn="${esc(rm.id)}" value="${esc(rm.name)}"><span class="mu">${(rm.panels || []).length}개</span></div>
    <ol>${(rm.panels || []).map((p, j) => `<li><b>${esc(p.n)}</b> <span class="mu">${esc(p.v || '')}</span><span class="sp"></span><button data-ptmv="${esc(rm.id)}|${j}|-1">▲</button><button data-ptmv="${esc(rm.id)}|${j}|1">▼</button><button data-ptdel="${esc(rm.id)}|${j}">✕</button></li>`).join('')}</ol>
    <div class="ad"><select data-ptadd="${esc(rm.id)}">${(() => { const B = ptRmBld(rm), L = cand.filter(n => ptSameBld(bk(n), B) && !(rm.panels || []).some(p => p.nid === n.id))
        .sort((a, b) => ptOrd(a) - ptOrd(b) || label(a).localeCompare(label(b), 'ko', {numeric: true}));
      return `<option value="">+ 추가: VCB·ACB·배전반·MCC (${esc(B || '동 모름')} · ${L.length}개)</option>` + (L.length ? L.map(n => `<option value="${esc(n.id)}">${esc(n.type === 'CB' && n.cbk ? n.cbk : tlabel(n))} · ${esc(label(n))}${effV(n) ? ' · ' + esc(effV(n)) : ''}</option>`).join('') : '<option value="" disabled>이 동에 반이 아직 없어요 → [+ 직접 입력]</option>'); })()}</select>
      <button data-ptfree="${esc(rm.id)}" title="트리에 없는 반 이름 직접">+ 직접 입력</button></div>
    ${(() => { const sl = byId(UI.sel), has = sl && (rm.panels || []).some(p => p.nid === sl.id);
      return `<button class="ptTr" data-ptsel="${esc(rm.id)}"${sl && !has ? '' : ' disabled'} title="왼쪽 계통 트리에서 항목을 누른 뒤">🌲 트리에서 고른 것 넣기${sl ? ` · <b>${esc(label(sl))}</b>${has ? ' (이미 있음)' : ''}` : ' (트리에서 먼저 고르세요)'}</button>`; })()}</div>`;
  return `<div class="ptSet">
    <div class="ptBox"><h3>① 전기실 · 계측할 배전반 <span class="mu">(QR 하나 = 전기실 하나)</span></h3><div class="ptRms">${c.rooms.map(room).join('')}</div>
      <button data-pta="addroom">+ 전기실 추가</button></div>
    <div class="ptBox"><h3>② 외관 점검 항목 <span class="mu">(한 줄에 하나 · 모든 전기실 공통)</span></h3><textarea data-ptitems rows="8">${esc((c.items || []).join('\n'))}</textarea></div>
    <div class="ptBox"><h3>③ 이상 기준</h3><div class="ptLim">
      <label>온도 ≥ <input data-ptlim="tHi" value="${L.tHi}">℃</label><label>습도 ≥ <input data-ptlim="hHi" value="${L.hHi}">%</label>
      <label>전압 ± <input data-ptlim="vTol" value="${L.vTol}">% (배전반 전압 기준)</label><label>역률 &lt; <input data-ptlim="pfLo" value="${L.pfLo}"></label>
      <label>전류 지난번 대비 ± <input data-ptlim="aJump" value="${L.aJump}">%</label></div></div>
    <div class="ptBox"><h3>④ 구글 시트 연결 <span class="mu">(3명 기록을 한곳에)</span></h3>
      <div class="ptLim"><label style="flex:1">Apps Script 주소 <input data-ptcfg="url" value="${esc(c.url || '')}" placeholder="https://script.google.com/macros/s/…/exec" style="width:100%"></label><label>비밀 키 <input data-ptcfg="key" value="${esc(c.key || '')}"></label></div>
      <div class="ptBt"><button data-pta="gas">📄 시트에 붙일 스크립트 · 방법</button><button data-pta="test">연결 테스트</button><button data-pta="push">설정을 시트로 보내기</button></div></div>
    <div class="ptBox"><h3>⑤ QR · 순찰자 핸드폰 설정</h3><div class="ptBt"><button data-pta="qr" class="pri">🖨 전기실 QR 출력 (${c.rooms.length}장)</button><button data-pta="setup">📱 순찰자 설정 링크·QR</button></div>
      <div class="mu">설정 링크는 순찰자 핸드폰에서 한 번만 열면 돼요 (카톡으로 보내기). 문에는 전기실 QR만 붙여요.</div></div></div>`;
}
// 사이트 주소 (공개 사이트 기준, 파일로 열었으면 그 주소)
// 전기실의 동: 저장된 동 → 이름 앞부분 (예: '바이오동 ① 전기실' → 바이오동, '페니동' ↔ '페니실린동')
function ptRmBld(rm) {
  if (rm.bld && S.blds.includes(rm.bld)) return rm.bld;
  const nm = String(rm.name || ''), b = S.blds.find(x => nm.startsWith(x)) || S.blds.find(x => x.length >= 2 && nm.slice(0, 2) === x.slice(0, 2)) || rm.bld || '';
  return b;
}
const ptSameBld = (a, b) => !!a && !!b && (a === b || (a.slice(0, 2) === b.slice(0, 2) && /동$/.test(a) && /동$/.test(b)));
const ptOrd = n => n.type === 'CB' ? (n.cbk === 'VCB' ? 0 : 1) : n.type === 'MDB' ? 2 : n.type === 'MCC' ? 3 : n.type === 'UPS' ? 4 : 5;   // VCB → ACB → 배전반 → MCC → UPS
const ptBase = () => location.href.split(/[?#]/)[0];
function ptQrSvg(text, px) {
  if (typeof qrcode !== 'function') return '';
  const q = qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({cellSize: Math.max(2, Math.floor(px / (q.getModuleCount() + 8))), margin: 4, scalable: true});
}
function ptQrPage() {
  const c = ptCfg(), w = window.open('', '_blank'); if (!w) return alert('팝업이 막혔어요. 팝업을 허용해 주세요.');
  w.document.write(`<!doctype html><meta charset="utf-8"><title>전기실 순찰 QR</title><style>body{font-family:'Malgun Gothic',sans-serif;margin:10mm}.g{display:grid;grid-template-columns:repeat(3,1fr);gap:8mm}.q{border:2px solid #262f7d;border-radius:8px;padding:6mm;text-align:center;page-break-inside:avoid}.q svg{width:45mm;height:45mm}.q b{display:block;font-size:16pt;margin-top:3mm}.q small{color:#555}</style>
    <div class="g">${c.rooms.map(rm => `<div class="q">${ptQrSvg(ptBase() + '?pr=' + encodeURIComponent(rm.id), 200)}<b>${esc(rm.name)}</b><small>🔦 전기실 순찰 · 핸드폰 카메라로 찍으세요</small></div>`).join('')}</div><script>setTimeout(()=>print(),400)<\/script>`);
  w.document.close();
}
function ptSetupLink() {
  const c = ptCfg(), cfg = {rooms: c.rooms.map(r => ({id: r.id, name: r.name, bld: r.bld || (typeof ptRmBld === 'function' ? ptRmBld(r) : ''), panels: (r.panels || []).map(p => ({n: p.n, v: p.v}))})), items: c.items, lim: c.lim, url: c.url, key: c.key};
  return ptBase() + '#ps=' + btoa(unescape(encodeURIComponent(JSON.stringify(cfg))));
}
function ptGasH() {
  return `<h3>📄 구글 시트 연결 방법 (한 번만)</h3><ol class="ptGas">
    <li>구글 드라이브 → 새 <b>구글 스프레드시트</b> (이름: 전기실 순찰기록)</li>
    <li>메뉴 <b>확장 프로그램 → Apps Script</b> → 원래 있던 내용을 지우고 아래 코드를 붙여 넣기</li>
    <li>코드 맨 위 <code>KEY</code>를 아무 비밀 문자로 바꾸기 (예: ckd-${Math.random().toString(36).slice(2, 8)}) → 저장</li>
    <li><b>배포 → 새 배포 → 유형: 웹 앱</b> · 실행: <b>나</b> · 액세스: <b>모든 사용자</b> → 배포 → 권한 허용</li>
    <li>나온 <b>웹 앱 주소(…/exec)</b>와 비밀 키를 ④에 붙여 넣기 → [연결 테스트] → [설정을 시트로 보내기]</li></ol>
    <textarea readonly rows="12" style="width:100%;font-family:monospace;font-size:11px">${esc(PT_GAS)}</textarea>
    <div class="mdlA"><button data-pta="gascopy">코드 복사</button><button data-mdl="x">닫기</button></div>`;
}
const PT_GAS = `// 전기실 순찰 + 계통 동기화 — 구글 시트 (Apps Script 웹 앱)
const KEY = '여기에-비밀키';
function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function sh(n, head) { const ss = SpreadsheetApp.getActive(); let s = ss.getSheetByName(n); if (!s) { s = ss.insertSheet(n); if (head) s.appendRow(head); } return s; }
function doPost(e) {
  const d = JSON.parse(e.postData.contents); if (d.k !== KEY) return out({ok: false, err: 'key'});
  // 도면 이미지 받기 (목록 · 1장) — 읽기만이라 잠금 없이
  if (d.a === 'imgs') return out({ok: true, imgs: imRows().map(x => ({k: x[0], t: +x[1] || 0, has: !!x[3]}))});
  if (d.a === 'img') { const x = imRows().find(r => r[0] === d.key); return out({ok: true, data: x && x[3] ? DriveApp.getFileById(x[3]).getBlob().getDataAsString() : ''}); }
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    if (d.a === 'cfg') { sh('설정').getRange(1, 1).setValue(JSON.stringify(d.cfg)); return out({ok: true}); }
    if (d.a === 'test') return out({ok: true});
    if (d.a === 'info') { const v = syRows(); return out({ok: true, count: v.filter(r => r[5] !== '').length}); }
    if (d.a === 'push') {   // 계통 항목 변경: 항목마다 최신 1줄 + 이력
      const s = sh('계통현재', ['키', '순번', '시각', '누가', '기기', 'json']), h = sh('계통이력', ['시각', '누가', '항목', '내용']);
      const v = s.getDataRange().getValues(), row = {}; v.forEach((r, i) => { if (i) row[r[0]] = i + 1; });
      const P = PropertiesService.getScriptProperties(); let q = +P.getProperty('seq') || 0; const seqs = [], now = new Date(), H = [];
      d.ops.forEach(o => { q++; seqs.push(q); const val = [o.k, q, now, o.by || '', d.dev || '', o.v == null ? '' : o.v];
        if (row[o.k]) s.getRange(row[o.k], 1, 1, 6).setValues([val]); else { s.appendRow(val); row[o.k] = s.getLastRow(); }
        let nm = ''; try { const j = o.v ? JSON.parse(o.v) : null; nm = j && (j.name || j.no) ? [j.no, j.name].filter(Boolean).join(' ') : ''; } catch (_) {}
        H.push([now, o.by || '', o.k, o.v == null ? '삭제' : nm]); });
      if (H.length) h.getRange(h.getLastRow() + 1, 1, H.length, 4).setValues(H);
      P.setProperty('seq', String(q)); return out({ok: true, seq: q, seqs});
    }
    if (d.a === 'pull') { const since = +d.since || 0, v = syRows(); return out({ok: true, seq: +PropertiesService.getScriptProperties().getProperty('seq') || 0,
      ops: v.filter(r => +r[1] > since).map(r => ({k: r[0], seq: +r[1], by: r[3], dev: r[4], v: r[5] === '' ? null : r[5]}))}); }
    if (d.a === 'snap') {   // 하루 한 번 전체 스냅샷 (드라이브 '계통 스냅샷' 폴더)
      const nm = '계통_' + Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd') + '.json', it = DriveApp.getFoldersByName('계통 스냅샷');
      const fo = it.hasNext() ? it.next() : DriveApp.createFolder('계통 스냅샷');
      if (!fo.getFilesByName(nm).hasNext()) fo.createFile(nm, JSON.stringify(d.state), 'application/json');
      return out({ok: true});
    }
    if (d.a === 'imgput') {   // 도면 이미지 올리기·지우기 (드라이브 '계통 도면' 폴더 + 시트 '도면목록')
      const s = sh('도면목록', ['키', '시각', '누가', '파일ID']), v = s.getDataRange().getValues(); let r = 0;
      v.forEach((x, i) => { if (i && x[0] === d.key) r = i + 1; });
      if (r && v[r - 1][3]) { try { DriveApp.getFileById(v[r - 1][3]).setTrashed(true); } catch (_) {} }
      const it = DriveApp.getFoldersByName('계통 도면'), fo = it.hasNext() ? it.next() : DriveApp.createFolder('계통 도면');
      const id = d.data ? fo.createFile(encodeURIComponent(d.key) + '.txt', d.data, 'text/plain').getId() : '';
      const val = [d.key, +d.t || Date.now(), d.by || '', id];
      if (r) s.getRange(r, 1, 1, 4).setValues([val]); else s.appendRow(val);
      return out({ok: true});
    }
    if (d.a === 'rec') {
      const r = d.r, s1 = sh('순찰', ['날짜', '시간', '전기실', '순찰자', 'QR', '온도', '습도', '이상', '메모', 'id', 'json']);
      const s2 = sh('계측', ['날짜', '시간', '전기실', '배전반', 'V', 'A', 'kW', 'PF', '순찰자', 'id']);
      [s1, s2].forEach(s => { const v = s.getDataRange().getValues(), c = v[0].indexOf('id'); for (let i = v.length - 1; i > 0; i--) if (v[i][c] === r.id) s.deleteRow(i + 1); });   // 고친 기록은 바꿔 쓰기
      const t = Utilities.formatDate(new Date(r.ts), 'Asia/Seoul', 'HH:mm');
      s1.appendRow([r.d, t, r.rn, r.who, r.qr ? 'O' : '', r.t, r.h, (r.bad || []).join(' · '), r.memo || '', r.id, JSON.stringify(r)]);
      (r.P || []).forEach(p => s2.appendRow([r.d, t, r.rn, p.n, p.V, p.A, p.kW, p.PF, r.who, r.id]));
      return out({ok: true});
    }
    return out({ok: false, err: 'a'});
  } finally { lock.releaseLock(); }
}
function imRows() { return sh('도면목록', ['키', '시각', '누가', '파일ID']).getDataRange().getValues().slice(1).filter(r => r[0]); }
function syRows() { const v = sh('계통현재', ['키', '순번', '시각', '누가', '기기', 'json']).getDataRange().getValues(); return v.slice(1); }
function doGet(e) {
  const p = e.parameter; if (p.k !== KEY) return out({ok: false, err: 'key'});
  if (p.a === 'cfg') { const v = sh('설정').getRange(1, 1).getValue(); return out({ok: true, cfg: v ? JSON.parse(v) : null}); }
  if (p.a === 'recs') {
    const s = sh('순찰', ['날짜', '시간', '전기실', '순찰자', 'QR', '온도', '습도', '이상', '메모', 'id', 'json']), v = s.getDataRange().getValues(), c = v[0].indexOf('json');
    const lim = new Date(Date.now() - (+p.days || 35) * 864e5).toISOString();
    return out({ok: true, recs: v.slice(1).map(x => { try { return JSON.parse(x[c]); } catch (_) { return null; } }).filter(r => r && r.ts >= lim)});
  }
  return out({ok: true});
}`;

// 연결 테스트: 어디서 막혔는지 알려주기
async function ptDiag() {
  const c = ptCfg(), u = (c.url || '').trim();
  if (!u) return '✘ Apps Script 주소가 비어 있어요.';
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(u))
    return '✘ 주소 모양이 달라요.\n\n· https://script.google.com/macros/s/……/exec 로 끝나야 해요\n· 편집기 주소(…/edit)나 /dev 주소가 아니라, [배포 → 새 배포] 뒤에 나온 "웹 앱 URL"을 넣어 주세요.';
  let r, txt = '';
  try { r = await fetch(u + '?a=cfg&k=' + encodeURIComponent(c.key || '')); txt = await r.text(); }
  catch (e) { return '✘ 응답을 못 받았어요 (' + e.message + ').\n\n가장 흔한 원인: 배포 때 "액세스 권한이 있는 사용자"를 [모든 사용자]로 안 했어요.\n→ 배포 → 배포 관리 → ✏️ → 액세스: 모든 사용자 → 버전: 새 버전 → 배포\n\n(회사 구글 계정이면 관리자가 막았을 수 있어요 → 개인 계정으로 만들어 주세요)'; }
  if (/<html|<!DOCTYPE/i.test(txt)) {
    if (/로그인|Sign in|accounts\.google/i.test(txt)) return '✘ 구글 로그인 화면이 돌아왔어요.\n\n→ 배포 설정의 "액세스 권한이 있는 사용자"를 [모든 사용자]로 바꾸고 새 버전으로 다시 배포해 주세요.';
    if (/doGet|함수를 찾을 수 없|Script function not found/i.test(txt)) return '✘ 스크립트 코드가 안 들어간 상태로 배포됐어요.\n\n→ 코드를 붙여 넣고 저장(Ctrl+S)한 뒤, 배포 관리 → ✏️ → 버전: 새 버전 → 배포';
    return '✘ 웹 앱이 오류 화면을 보냈어요. 코드를 다시 붙여 넣고 저장 → 새 버전으로 배포해 주세요.\n\n(받은 내용 앞부분: ' + txt.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 120) + ')';
  }
  let j; try { j = JSON.parse(txt); } catch (e) { return '✘ 알 수 없는 응답: ' + txt.slice(0, 120); }
  if (!j.ok && j.err === 'key') return '✘ 비밀 키가 안 맞아요.\n\n· 코드 2번째 줄 KEY = \'…\' 안의 글자와 ④의 비밀 키 칸이 똑같아야 해요 (띄어쓰기 주의)\n· 코드에서 키를 바꿨다면 저장 뒤 [새 버전으로 배포]까지 해야 반영돼요';
  if (!j.ok) return '✘ 웹 앱 응답: ' + JSON.stringify(j).slice(0, 120);
  const ok2 = await ptPost({a: 'test'});
  return ok2 ? '✔ 연결됐어요. 이제 [설정을 시트로 보내기]와 ☁ 계통 동기화 [켜기]를 하면 돼요.' : '△ 읽기는 되는데 저장이 안 돼요. 스크립트를 최신 코드로 다시 붙여 넣고 새 버전으로 배포해 주세요.';
}

/* ---------- 그리기 · 이벤트 ---------- */
function ptRerender() {
  const v = document.getElementById('ptV');
  if (v && document.body.dataset.mv === 'patrol') { const y = v.scrollTop; v.innerHTML = PT.room ? ptRoomH(PT.room) : ptHomeH(); v.scrollTop = y; }
  if (typeof UI !== 'undefined' && UI.tab === 'pat' && !(document.body.dataset.mv === 'patrol')) renderView();
}
function ptOpenRoom(id, qr) { PT.room = id; PT.qr = qr ? 1 : 0; PT.start = Date.now(); PT.draft = null; if (typeof mbSet === 'function' && MB.on) mbSet('patrol'); else { UI.tab = 'pat'; } ptRerender(); const v = document.getElementById('ptV'); if (v) v.scrollTop = 0; }
// 순찰 설정을 고치면 저장 + 시트에도 자동으로 보내기 (핸드폰이 열 때 받아감)
const ptCfgOut = c => ({rooms: c.rooms.map(r => ({id: r.id, name: r.name, bld: r.bld || (typeof ptRmBld === 'function' ? ptRmBld(r) : ''), panels: (r.panels || []).map(p => ({nid: p.nid || '', n: p.n, v: p.v}))})), items: c.items, lim: c.lim, at: c.at || Date.now()});
const ptTouched = d => !!(d.t !== '' || d.h !== '' || d.memo || Object.keys(d.items || {}).length || (d.P || []).some(p => ['V', 'A', 'kW', 'PF'].some(k => p[k] !== '' && p[k] != null)));
let ptCfgT = 0;
const ptCfgSave = () => {
  if (ptOnly()) return; const c = ptCfg(); c.at = Date.now();
  if (typeof save === 'function') save();
  clearTimeout(ptCfgT); if (c.url) ptCfgT = setTimeout(() => ptPost({a: 'cfg', cfg: ptCfgOut(c)}), 1500);
};
document.addEventListener('click', async e => {
  const t = e.target; if (!t.closest) return;
  let b;
  if ((b = t.closest('[data-ptt]'))) { PT.tab = b.dataset.ptt; return renderView(); }
  if ((b = t.closest('[data-ptr]'))) return ptOpenRoom(b.dataset.ptr, 0);
  const D = PT.draft;
  if ((b = t.closest('[data-pti]')) && D) { D.items[b.dataset.pti] = b.dataset.v; return ptRerender(); }
  const c = ptCfg();
  if ((b = t.closest('[data-ptmv]'))) { const [rid, j, d] = b.dataset.ptmv.split('|'), rm = c.rooms.find(x => x.id === rid), P = rm.panels, k = +j + +d; if (k < 0 || k >= P.length) return; [P[j], P[k]] = [P[k], P[j]]; ptCfgSave(); return renderView(); }
  if ((b = t.closest('[data-ptdel]'))) { const [rid, j] = b.dataset.ptdel.split('|'), rm = c.rooms.find(x => x.id === rid); rm.panels.splice(+j, 1); ptCfgSave(); return renderView(); }
  if ((b = t.closest('[data-ptsel]'))) { const n = byId(UI.sel), rm = c.rooms.find(x => x.id === b.dataset.ptsel); if (!n || !rm) return; rm.panels = rm.panels || []; if (!rm.panels.some(p => p.nid === n.id)) rm.panels.push({nid: n.id, n: label(n), v: effV(n) || ''}); ptCfgSave(); return renderView(); }
  if ((b = t.closest('[data-ptfree]'))) { const nm = (prompt('배전반 이름 (예: LV-B2-A)') || '').trim(); if (!nm) return; const v = (prompt('전압 (예: 380V)', '380V') || '').trim(); c.rooms.find(x => x.id === b.dataset.ptfree).panels.push({n: nm, v}); ptCfgSave(); return renderView(); }
  if (!(b = t.closest('[data-pta]'))) return;
  const a = b.dataset.pta;
  if (a === 'who' || a === 'name') { const v = a === 'who' ? (document.getElementById('ptWho') || {}).value : prompt('이름', ptWho()); if (v && v.trim()) { ptLS('who', v.trim()); ptRerender(); } return; }
  if (a === 'home') { PT.room = ''; PT.draft = null; return ptRerender(); }
  if (a === 'save') return ptSave();
  if (a === 'sync') { ptFlush(); return ptFetch(); }
  if (a === 'full') { ptLS('only', 0); location.href = ptBase(); return; }
  if (a === 'scan') return ptScan();
  if (a === 'csv') return ptCsv();
  if (a === 'addroom') { const nm = (prompt('전기실 이름 (예: 바이오동 ③ 전기실)') || '').trim(); if (!nm) return; const bld = (prompt('동 이름', nm.split(' ')[0]) || '').trim(); c.rooms.push({id: 'r' + Date.now().toString(36), bld, name: nm, panels: []}); ptCfgSave(); return renderView(); }
  if (a === 'qr') return ptQrPage();
  if (a === 'gas') return uiModal(ptGasH(), true);
  if (a === 'gascopy') { try { await navigator.clipboard.writeText(PT_GAS); toast('코드를 복사했어요.', false); } catch (_) { alert('복사가 막혔어요. 상자 안 코드를 직접 복사해 주세요.'); } return; }
  if (a === 'test') return alert(await ptDiag());
  if (a === 'push') { c.at = Date.now(); if (typeof save === 'function') save(); const cfg = ptCfgOut(c);
    const ok = await ptPost({a: 'cfg', cfg}); return alert(ok ? '✔ 시트에 설정을 보냈어요. 순찰자 핸드폰이 다음에 열 때 받아요.' : '✘ 보내기 실패 — [연결 테스트]부터 해 보세요.'); }
  if (a === 'setup') { const u = ptSetupLink();
    return uiModal(`<h3>📱 순찰자 핸드폰 설정</h3><p>순찰자 핸드폰에서 이 링크를 <b>한 번</b> 열면 순찰 전용 화면이 돼요 (카톡으로 보내기). 또는 아래 QR을 찍어도 돼요.</p>
      <div style="text-align:center">${ptQrSvg(u, 260)}</div><textarea readonly rows="3" style="width:100%;font-size:11px">${esc(u)}</textarea>
      ${c.url ? '' : '<p class="w">⚠ 구글 시트를 아직 연결하지 않았어요 — 연결 전에는 순찰 기록이 각 핸드폰에만 남아요.</p>'}
      <div class="mdlA"><button data-pta="setcopy">링크 복사</button><button data-mdl="x">닫기</button></div>`, true); }
  if (a === 'setcopy') { try { await navigator.clipboard.writeText(ptSetupLink()); toast('링크를 복사했어요. 카톡으로 보내세요.', false); } catch (_) {} return; }
});
document.addEventListener('change', e => {
  const t = e.target, c = ptCfg();
  if (t.dataset.ptadd !== undefined && t.value) { const n = byId(t.value), rm = c.rooms.find(x => x.id === t.dataset.ptadd); if (n && rm) { rm.panels = rm.panels || []; rm.panels.push({nid: n.id, n: label(n), v: effV(n) || ''}); ptCfgSave(); renderView(); } return; }
  if (t.dataset.ptrn) { const rm = c.rooms.find(x => x.id === t.dataset.ptrn); if (rm && t.value.trim()) { rm.name = t.value.trim(); ptCfgSave(); } return; }
  if (t.dataset.ptitems !== undefined) { c.items = t.value.split('\n').map(x => x.trim()).filter(Boolean); ptCfgSave(); return; }
  if (t.dataset.ptlim) { c.lim[t.dataset.ptlim] = parseFloat(t.value) || 0; ptCfgSave(); return; }
  if (t.dataset.ptcfg) { c[t.dataset.ptcfg] = t.value.trim(); ptCfgSave(); PT.fetched = 0; return; }
  if (t.dataset.ptday !== undefined) { PT.day = t.value; renderView(); }
});
// 숫자 칸: 입력 즉시 반영 · 이상이면 빨갛게 · [다음]으로 다음 칸
document.addEventListener('input', e => {
  const t = e.target, D = PT.draft; if (!D || !t.closest || !t.closest('#ptV, #view')) return;
  if (t.dataset.ptm) { D.im[t.dataset.ptm] = t.value; return; }
  const k = t.dataset.ptk; if (!k) return;
  const v = t.value.replace(/[^\d.\-]/g, '');
  if (k === 'memo') { D.memo = t.value; return; }
  if (t.dataset.ptp) { const p = D.P.find(x => x.n === t.dataset.ptp); if (p) p[k] = v; } else D[k] = v;
  const lab = t.closest('label'), c = ptCfg(), p = t.dataset.ptp ? D.P.find(x => x.n === t.dataset.ptp) : null;
  if (lab) lab.classList.toggle('bad', !!ptFieldBad(k, v, c, p, ptPrevOf(D.room)));
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || !e.target.dataset || !e.target.dataset.ptk || e.target.dataset.ptk === 'memo') return;
  e.preventDefault(); const A = [...document.querySelectorAll('#ptV [data-ptk]')], i = A.indexOf(e.target); if (A[i + 1]) A[i + 1].focus(); else e.target.blur();
});
// 앱 안 QR 찍기 (지원하는 핸드폰만)
async function ptScan() {
  try {
    const st = await navigator.mediaDevices.getUserMedia({video: {facingMode: 'environment'}}), v = document.createElement('video'), bd = new BarcodeDetector({formats: ['qr_code']});
    const box = document.createElement('div'); box.id = 'ptScan'; box.innerHTML = '<div>QR을 화면 가운데에 · <button>닫기</button></div>'; box.prepend(v); document.body.appendChild(box);
    v.srcObject = st; v.setAttribute('playsinline', ''); await v.play();
    const stop = () => { st.getTracks().forEach(x => x.stop()); box.remove(); };
    box.querySelector('button').onclick = stop;
    const tick = async () => { if (!box.isConnected) return; const r = await bd.detect(v).catch(() => []); const m = r[0] && String(r[0].rawValue).match(/[?&]pr=([^&#]+)/);
      if (m) { stop(); ptOpenRoom(decodeURIComponent(m[1]), 1); } else requestAnimationFrame(tick); };
    tick();
  } catch (e) { alert('카메라를 열 수 없어요. 핸드폰 카메라 앱으로 QR을 찍어 주세요.'); }
}

/* ---------- 시작: 설정 링크(#ps=) · 전기실 QR(?pr=) ---------- */
(function () {
  const v = document.createElement('section'); v.id = 'ptV'; document.querySelector('main').appendChild(v);
  const h = location.hash.match(/ps=([^&]+)/);
  if (h) { try { const cfg = JSON.parse(decodeURIComponent(escape(atob(h[1])))); ptLS('cfg', cfg);
    // 계통 동기화 링크(&sy=1)는 전체 기능으로 열고 동기화를 물어봄 · 순찰만 링크는 순찰 전용 화면
    if (/[#&]sy=1/.test(location.hash)) { ptLS('only', 0); try { sessionStorage.setItem('ckd_sy_ask', '1'); } catch (_) {} } else ptLS('only', 1);
    history.replaceState(null, '', ptBase()); } catch (e) { alert('설정 링크가 잘못됐어요.'); } }
  const q = location.search.match(/[?&]pr=([^&#]+)/);
  // 순찰 전용 핸드폰 · QR로 들어옴 → 순찰 화면
  setTimeout(() => {
    if (ptOnly()) document.body.classList.add('ptOnly');
    if (q) { const rid = decodeURIComponent(q[1]); history.replaceState(null, '', ptBase());
      // 최신 배전반 목록을 먼저 받고 열기 (안 받고 열면 이 핸드폰에 남은 예전 목록이 나옴)
      Promise.race([ptFetch(), new Promise(r => setTimeout(r, 4000))]).finally(() => ptOpenRoom(rid, 1)); ptFlush(); }
    else { if (ptOnly() && typeof mbSet === 'function') mbSet('patrol'); ptFlush(); ptFetch(); }
  }, 0);
  window.addEventListener('online', ptFlush);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { ptFlush(); ptFetch(); } });
  setInterval(() => { if (document.visibilityState === 'visible' && (document.body.dataset.mv === 'patrol' || (typeof UI !== 'undefined' && UI.tab === 'pat'))) ptFetch(); }, 60e3);
  // 핸드폰 아래 탭에 [🔦 순찰]
  const nav = document.getElementById('mbNav');
  if (nav) { const bt = document.createElement('button'); bt.dataset.mv = 'patrol'; bt.innerHTML = '🔦<span>순찰</span>'; nav.insertBefore(bt, nav.firstChild); }
  const _ms = typeof mbSet === 'function' ? mbSet : null;
  if (_ms) mbSet = function (v) { _ms(v); if (v === 'patrol') ptRerender(); };
  const s = document.createElement('style');
  s.textContent = `
#ptV{display:none}body.mob[data-mv="patrol"] #ptV{display:block;height:100%;overflow-y:auto;overflow-x:hidden;padding-bottom:90px;box-sizing:border-box}body.mob[data-mv="patrol"] #bldBar{display:none}
body.ptOnly #mbNav button:not([data-mv="patrol"]),body.ptOnly #bldBar,body.ptOnly header #mFile,body.ptOnly header #bEdit{display:none!important}
.ptW{font-size:15px}.ptW .mu{color:#64748b;font-size:13px}.ptW .w{color:#c2410c}
.ptW input,.ptW textarea{font-size:16px;font-family:inherit;box-sizing:border-box}
.ptW>input{width:100%;padding:12px;border:1.5px solid #c7d2fe;border-radius:12px;margin:8px 0}
.ptBig{width:100%;padding:15px;border:0;border-radius:14px;background:#262f7d;color:#fff;font-size:17px;font-weight:700;margin-top:10px;cursor:pointer}
.ptCfgAt{font-size:11.5px;color:#94a3b8;margin:-4px 0 6px 50px}
.ptHd{display:flex;align-items:center;gap:8px;position:sticky;top:0;background:#f4f6fa;padding:4px 0 8px;z-index:2}.ptHd b{font-size:18px;flex:1}.ptHd span{color:#64748b;font-size:13px}
.ptHd button{width:42px;height:42px;border:1px solid #d6dbe8;background:#fff;border-radius:10px;font-size:24px}
.ptPr{height:10px;background:#e2e8f0;border-radius:6px;overflow:hidden;margin:2px 0 4px}.ptPr i{display:block;height:100%;background:#16a34a}
.ptL{display:flex;flex-direction:column;gap:6px;margin-top:10px}
.ptR{display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:13px 12px;border:1px solid #e2e8f0;background:#fff;border-radius:12px;font-size:15.5px;min-height:56px;cursor:pointer}
.ptR .ic{width:24px;text-align:center;font-size:18px}.ptR .nm{flex:1;font-weight:600}.ptR .nm small{background:#262f7d;color:#fff;border-radius:8px;padding:1px 7px;font-size:11px}
.ptR .tm{font-size:12px;color:#64748b;text-align:right}.ptR .tm em{font-style:normal;color:#c2410c}
.ptR.ok{background:#f0fdf4;border-color:#bbf7d0}.ptR.ok .ic{color:#16a34a}.ptR.bad{background:#fff7ed;border-color:#fdba74}.ptR.nx{border:2px solid #262f7d;box-shadow:0 2px 10px rgba(38,47,125,.18)}
.ptTip{margin-top:12px;padding:10px;background:#eef2ff;border-radius:10px}.ptFt{display:flex;gap:6px;margin-top:14px}.ptFt button{flex:1;padding:9px;border:1px solid #d6dbe8;background:#fff;border-radius:10px;font-size:13px}
.ptQ{font-size:12px;color:#15803d;margin:-4px 0 6px}
.ptS{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:10px 12px;margin-bottom:8px}.ptSh{display:flex;align-items:baseline;gap:8px;margin-bottom:6px}.ptSh b{font-size:15.5px}
.ptI{display:flex;align-items:center;gap:6px;padding:5px 0;border-top:1px solid #f1f5f9}.ptI span{flex:1}.ptI button{min-width:64px;padding:10px 8px;border:1px solid #d6dbe8;background:#fff;border-radius:10px;font-size:14px;cursor:pointer}
.ptI button.on{background:#16a34a;border-color:#16a34a;color:#fff;font-weight:700}.ptI button.on.b{background:#dc2626;border-color:#dc2626}.ptI.bad span{color:#dc2626;font-weight:700}
.ptMm{width:100%;padding:10px;border:1.5px solid #fca5a5;border-radius:10px;margin:2px 0 6px}
.ptG{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px}.ptG>*{min-width:0}.ptN{display:flex;align-items:center;gap:6px;border:1.5px solid #cbd5e1;border-radius:10px;padding:4px 8px;background:#fff}
.ptN em{font-style:normal;font-weight:700;color:#262f7d;width:30px;font-size:13px}.ptN input{flex:1;min-width:0;width:100%;border:0;padding:8px 0;font-size:19px;font-weight:700;outline:0}.ptN input::placeholder{color:#cbd5e1;font-weight:400}.ptN small{color:#94a3b8}
.ptN.bad{border-color:#dc2626;background:#fef2f2}.ptN.bad input{color:#dc2626}
.ptS textarea{width:100%;border:1px solid #e2e8f0;border-radius:8px;padding:8px}
.ptBad{background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;border-radius:10px;padding:9px 12px;font-size:13.5px;margin-bottom:8px}
.ptSave{position:sticky;bottom:0;background:linear-gradient(transparent,#f4f6fa 30%);padding-top:10px}
#ptScan{position:fixed;inset:0;background:#000;z-index:200;display:flex;flex-direction:column}#ptScan video{flex:1;object-fit:cover}#ptScan div{color:#fff;padding:14px;text-align:center}#ptScan button{margin-left:10px;padding:8px 16px;border-radius:8px;border:0}
#view .ptBar{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:10px}#view .ptBar h2{margin:0 8px 0 0;color:#262f7d}#view .ptBar .sp{flex:1}#view .ptBar .mu{font-size:12px;color:#64748b}
#view .ptBar button{padding:5px 11px;border:1px solid #d6dbe8;background:#fff;border-radius:6px;cursor:pointer;font-size:12.5px}#view .ptBar .seg button.on{background:#262f7d;color:#fff}
#view .ptDay{margin-bottom:8px;font-size:14px}#view .ptDay .w{color:#c2410c;font-weight:700}
#view .ptDay{display:flex;align-items:center;gap:12px}#view .ptDay input{font:inherit;font-size:13px;padding:3px 6px;border:1px solid #d6dbe8;border-radius:6px}#view .ptDay .sum{font-size:13.5px;color:#334155}#view .ptDay .sum b{font-size:15px}
#view .ptTd{width:100%;border-collapse:collapse;font-size:13px;background:#fff;border:1px solid #e5e7eb}
#view .ptTd th{background:#f8fafc;color:#475569;font-weight:600;font-size:12px;text-align:left;padding:7px 10px;border-bottom:1px solid #e5e7eb}#view .ptTd th.r,#view .ptTd td.r{text-align:right;font-variant-numeric:tabular-nums}
#view .ptTd td{padding:6px 10px;border-bottom:1px solid #f1f5f9;vertical-align:middle}#view .ptTd td.c{text-align:center;font-variant-numeric:tabular-nums}
#view .ptTd td.rm{border-right:1px solid #f1f5f9;min-width:120px}#view .ptTd td.rm b{display:block;font-size:13.5px}#view .ptTd td.rm small{color:#64748b;font-size:11.5px}
#view .ptTd tr.no td{color:#94a3b8}#view .ptTd tr.no td.rm{color:#64748b}#view .ptTd .nil{color:#cbd5e1}#view .ptTd .bd,#view .ptDay .bd{color:#dc2626;font-weight:700}
#view .ptTd tr.nt td{font-size:12.5px;color:#475569;padding-top:2px}#view .ptTd tr.nt.bad td b{color:#b91c1c}#view .ptTd .mm{color:#64748b}
#view .ptTd .tg{font-size:11.5px;font-weight:700;padding:1px 7px;border-radius:5px}#view .ptTd .tg.o{background:#f0fdf4;color:#15803d}#view .ptTd .tg.b{background:#fef2f2;color:#b91c1c}
#view .ptCards{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px}
#view .ptC{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:10px 12px;font-size:12.5px}#view .ptC.ok{border-left:5px solid #16a34a}#view .ptC.bad{border-left:5px solid #dc2626;background:#fffbfb}#view .ptC:not(.ok):not(.bad){opacity:.7;border-left:5px solid #cbd5e1}
#view .ptC .h{display:flex;justify-content:space-between;gap:6px;margin-bottom:4px}#view .ptC .h b{font-size:14px}#view .ptC .h span{color:#64748b}
#view .ptC table{width:100%;font-size:12px;border-collapse:collapse}#view .ptC td{padding:2px 4px;border-top:1px solid #f1f5f9}#view .ptC .b{color:#b91c1c;margin-top:4px;font-weight:600}#view .ptC .m{color:#475569;margin-top:3px}
#view .ptLog table{width:100%;font-size:12px;margin-top:8px}#view .ptLog tr.bad td{background:#fff7ed}#view .ptLog button{padding:5px 11px;border:1px solid #d6dbe8;background:#fff;border-radius:6px;cursor:pointer}
#view .ptSet{display:flex;flex-direction:column;gap:12px}#view .ptBox{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px}#view .ptBox h3{margin:0 0 8px;font-size:15px;color:#262f7d}#view .ptBox .mu{font-size:12px;color:#64748b;font-weight:400}
#view .ptRms{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px;margin-bottom:8px}
#view .ptRm{border:1px solid #e2e8f0;border-radius:10px;padding:8px 10px;background:#f8fafc}#view .ptRm .h{display:flex;gap:6px;align-items:center}#view .ptRm .h input{flex:1;font-weight:700;border:1px solid transparent;background:transparent;font-size:14px;padding:3px}#view .ptRm .h input:hover,#view .ptRm .h input:focus{border-color:#cbd5e1;background:#fff}
#view .ptRm ol{margin:6px 0;padding-left:20px;font-size:12.5px}#view .ptRm li{display:flex;align-items:center;gap:4px;padding:2px 0}#view .ptRm li .sp{flex:1}#view .ptRm li button{border:1px solid #e2e8f0;background:#fff;border-radius:4px;font-size:10px;padding:1px 5px;cursor:pointer}
#view .ptRm .ad{display:flex;gap:4px}#view .ptRm .ptTr{width:100%;margin-top:5px;padding:5px 8px;border:1px dashed #94a3b8;background:#fff;border-radius:6px;font-size:12px;cursor:pointer;text-align:left}#view .ptRm .ptTr:disabled{opacity:.55;cursor:default}#view .ptRm .ptTr b{color:#273382}#view .ptRm .ad select{flex:1;min-width:0;font-size:12px}#view .ptRm .ad button,#view .ptBox>button,#view .ptBt button{padding:5px 10px;border:1px solid #d6dbe8;background:#fff;border-radius:6px;cursor:pointer;font-size:12.5px}
#view .ptBt{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}#view .ptBt .pri{background:#262f7d;color:#fff;border-color:#262f7d}
#view .ptBox textarea{width:100%;box-sizing:border-box;font-family:inherit;font-size:13px}#view .ptLim{display:flex;flex-wrap:wrap;gap:12px;font-size:13px}#view .ptLim input{width:60px;padding:4px}
.ptGas li{margin:4px 0;font-size:13px}.ptGas code{background:#f1f5f9;padding:1px 5px;border-radius:4px}`;
  document.head.appendChild(s);
})();
