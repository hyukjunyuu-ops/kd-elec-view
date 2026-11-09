/* =========================================================
   ptdemo.js — 순찰 예시 데이터 (흐름 보기용)
   - 순찰 설정의 전기실·배전반 그대로 10/08~11/08 하루 한 번씩 기록을 만들어 이 기기에만 넣음
   - 구글 시트로는 안 올라감 (sent 표시) · [예시 지우기] 한 번이면 전부 없어짐
   - 일부러 넣은 일: 에어컨 고장(온도 상승) · 비 온 날 습도 · 역률 저하 · 누수 · 전류 변화
   ========================================================= */

const PD_FROM = '2026-10-08', PD_TO = '2026-11-08', PD_WHO = ['김OO', '이OO', '박OO'];
const pdIs = r => String(r.id || '').startsWith('demo');
const pdHas = () => ptLocal().some(pdIs);

function pdMake() {
  const c = ptCfg(), rooms = c.rooms || [];
  if (!rooms.length) return alert('순찰 설정에 전기실이 없어요.');
  // 늘 같은 값이 나오게 (씨앗 고정 난수)
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const nrm = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const r1 = x => Math.round(x * 10) / 10, r2 = x => Math.round(x * 100) / 100;
  const days = []; for (let d = PD_FROM; d <= PD_TO; d = hmDate(d, 1)) days.push(d);
  const hot = rooms[Math.min(1, rooms.length - 1)], wet = rooms[Math.min(2, rooms.length - 1)], leak = rooms[rooms.length - 1];
  const pfRm = rooms.find(rm => (rm.panels || []).length > 1) || rooms.find(rm => (rm.panels || []).length) || null;
  const base = {}; rooms.forEach((rm, i) => { base[rm.id] = {t: 23.5 + rnd() * 3, h: 45 + rnd() * 10}; (rm.panels || []).forEach(p => { base[rm.id + '|' + p.n] = {A: Math.round(60 + rnd() * 420), pf: .93 + rnd() * .04}; }); });
  const out = [], acks = {}, prevOf = {};
  days.forEach((d, di) => {
    const dow = new Date(d + 'T00:00:00').getDay(), wk = dow === 0 || dow === 6, who = PD_WHO[di % 3], rain = ['2026-10-16', '2026-10-17', '2026-11-02'].includes(d);
    let tm = (9 * 60) + Math.round(rnd() * 20);
    rooms.forEach((rm, ri) => {
      if (rnd() < (wk ? .12 : .03)) return;   // 가끔 빠짐
      tm += 5 + Math.round(rnd() * 6);
      const b = base[rm.id], items = {}, im = {};
      (c.items || []).forEach(k => { items[k] = 'ok'; });
      let t = b.t + nrm() * .5 - di * .04, h = b.h + nrm() * 2.5;   // 11월로 갈수록 조금 서늘
      // 에어컨 고장: 10/27~10/29 상승 → 10/30 수리 / 11/06~11/08 다시 상승 (지금 확인할 것)
      if (rm === hot) { const up = {'2026-10-27': 2.5, '2026-10-28': 4.5, '2026-10-29': 6.8, '2026-11-06': 2.2, '2026-11-07': 4.1, '2026-11-08': 5.9}[d]; if (up) { t = b.t + up; if (items['에어컨 작동'] && d >= '2026-10-28' && d <= '2026-10-29') { items['에어컨 작동'] = 'bad'; im['에어컨 작동'] = d === '2026-10-28' ? '실내기 1대 정지 · 송풍만 됨' : '여전히 정지 · 업체 연락함'; } } }
      if (rain && rm === wet) h = 73 + rnd() * 4;
      if (rm === leak && d === '2026-11-07' && items['누수·결로'] !== undefined) { items['누수·결로'] = 'bad'; im['누수·결로'] = '배관 아래 바닥 물기 (결로 추정)'; }
      if (rm === leak && d === '2026-10-21' && items['조명'] !== undefined) { items['조명'] = 'bad'; im['조명'] = '입구 형광등 1개 나감'; }
      const P = (rm.panels || []).map((p, pi) => {
        const k = base[rm.id + '|' + p.n], nv = pV(p.v) || 380, hv = nv >= 1000;
        let A = k.A * (wk ? .9 : 1) * (1 + nrm() * .04), pf = k.pf + nrm() * .006;
        if (pfRm && rm === pfRm && pi === 0 && d >= '2026-11-03') pf = .9 - (Date.parse(d) - Date.parse('2026-11-03')) / 864e5 * .007;   // 콘덴서 불량 의심
        if (rm === pfRm && pi === (pfRm.panels.length > 1 ? 1 : 0) && d === '2026-10-23') A *= 1.45;   // 설비 추가 가동
        const V = hv ? r2(nv / 1000 * (1 + nrm() * .006)) : Math.round(nv * (1 + nrm() * .008));
        pf = Math.min(.99, r2(pf)); A = Math.round(A);
        return {n: p.n, nid: p.nid || '', nv: p.v || '', V, A, kW: Math.round(Math.sqrt(3) * (hv ? V * 1000 : V) * A * pf / 1000), PF: pf};
      });
      const ts = new Date(`${d}T${String(Math.floor(tm / 60)).padStart(2, '0')}:${String(tm % 60).padStart(2, '0')}:00`);
      const r = {id: `demo-${d}-${rm.id}`, room: rm.id, rn: rm.name, d, ts: ts.toISOString(), st: new Date(ts - 4 * 60e3).toISOString(), who, qr: 1,
        items, im, t: r1(t), h: Math.round(h), memo: '', P, sent: 1, demo: 1};
      if (rm === hot && d === '2026-10-30') r.memo = '에어컨 수리 완료 (업체) · 온도 정상';
      if (rm === pfRm && d === '2026-10-23') r.memo = '생산 설비 추가 가동 (생산팀 확인)';
      r.bad = ptCheck(r, c, prevOf[rm.id]); prevOf[rm.id] = r; out.push(r);
      if (d < '2026-11-01') Object.keys(items).forEach(k => { if (items[k] === 'bad') acks[r.id + '|' + k] = {by: PD_WHO[(di + 1) % 3], at: ts.getTime() + 864e5, m: k === '조명' ? '램프 교체' : '업체 수리 완료', demo: 1}; });
    });
  });
  ptLS('rec', ptLocal().filter(r => !pdIs(r)).concat(out));
  Object.assign(hmAck(), acks); save();
  return out.length;
}
function pdClear() {
  ptLS('rec', ptLocal().filter(r => !pdIs(r)));
  const a = hmAck(); Object.keys(a).forEach(k => { if (k.startsWith('demo')) delete a[k]; }); save();
}

// 기록 탭 · 홈 위에 버튼
{
  const _lg = ptLogH;
  ptLogH = function () {
    const has = pdHas();
    return `<div class="pdBar">${has ? `<b>예시 데이터 보는 중</b> <span class="mu">(10/08~11/08 · 이 기기에만 · 시트에 안 올라감)</span> <button data-pda="clear">🗑 예시 지우기</button>`
      : `<span class="mu">흐름을 미리 보려면</span> <button data-pda="make">예시 데이터 넣기 (10/08~11/08)</button>`}</div>` + _lg.apply(this, arguments);
  };
  const _hv = homeView;
  homeView = function () {
    const h = _hv.apply(this, arguments);
    return pdHas() ? h.replace('<div class="thHh">', '<div class="pdBar hm1"><b>📎 예시 순찰 데이터 (10/08~11/08)</b> <span class="mu">실제 기록 아님 · 이 기기에만</span> <button data-pda="clear">지우기</button></div><div class="thHh">') : h;
  };
}
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-pda]'); if (!b) return;
  e.preventDefault(); e.stopPropagation();
  if (b.dataset.pda === 'make') { const n = pdMake(); if (n) { toast(`예시 기록 ${n}건을 넣었어요. 홈 · 월간 일지(2026-10)에서 확인해 보세요.`, false); renderView(); } }
  else if (confirm('예시 순찰 기록을 모두 지울까요? (실제 기록은 그대로)')) { pdClear(); toast('예시 데이터를 지웠어요.', false); renderView(); }
}, true);

(function () {
  const s = document.createElement('style');
  s.textContent = `.pdBar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 10px;padding:8px 12px;border:1px dashed #a5b4fc;border-radius:10px;background:#f5f7ff;font-size:13px}
.pdBar button{padding:4px 11px;border:1px solid #262f7d;border-radius:8px;background:#fff;color:#262f7d;font-size:12.5px;cursor:pointer}`;
  document.head.appendChild(s);
})();
