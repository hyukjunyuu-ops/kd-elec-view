/* =========================================================
   sync.js — 계통 데이터 자동 동기화 (3명이 같이 조사)
   - 순찰과 같은 구글 시트(Apps Script)를 씀 · [🔦 순찰 → 설정 ④]에서 주소·키 넣고 '계통도 동기화' 켜기
   - 고친 항목(회로·반 하나하나)만 시트로 보내고, 다른 사람이 고친 항목만 받아와서 합침 (1분마다 · 열 때 · 저장 뒤)
   - 같은 항목을 동시에 고치면 나중에 보낸 쪽이 남고 '충돌'로 알려줌
   - 도면 이미지·로고는 보내지 않음 (용량) — 글자 데이터만
   - 시트: '계통현재'(항목마다 최신 1줄) · '계통이력'(누가 언제 무엇을) · 드라이브에 하루 한 번 전체 스냅샷
   ========================================================= */

const SY = {on: false, base: null, seq: 0, q: [], busy: false, last: 0, conf: 0, err: '', applying: false, t: null, mine: {}};   // mine = 내가 보낸 항목의 순번 (그보다 앞선 남의 변경은 덮어쓰지 않음)
const syLS = (k, v) => { try { if (v === undefined) return JSON.parse(localStorage.getItem('ckd_sync_' + k) || 'null'); localStorage.setItem('ckd_sync_' + k, JSON.stringify(v)); } catch (e) { return null; } };
(function () { const o = syLS('st') || {}; SY.on = !!o.on; SY.seq = o.seq || 0; SY.q = syLS('q') || []; SY.base = syLS('base'); })();
const syKeep = () => { syLS('st', {on: SY.on, seq: SY.seq}); syLS('q', SY.q); syLS('base', SY.base); };
const syCfg = () => { const c = typeof ptCfg === 'function' ? ptCfg() : {}; return {url: c.url || '', key: c.key || ''}; };
const syWho = () => (typeof ptWho === 'function' && ptWho()) || syLS('who') || '';
const SY_SKIP = {app: 1, ver: 1, nodes: 1, cfg: 1};
const SY_SKIPC = {logo: 1};   // 이미지(로고)는 안 보냄

// 지금 상태 → 항목 지도 {키: JSON}
function syMap() {
  const m = {};
  S.nodes.forEach(n => { m['n:' + n.id] = JSON.stringify(n); });
  Object.keys(S.cfg || {}).forEach(k => { if (!SY_SKIPC[k]) m['c:' + k] = JSON.stringify(S.cfg[k]); });
  Object.keys(S).forEach(k => { if (!SY_SKIP[k]) m['s:' + k] = JSON.stringify(S[k]); });
  return m;
}
// 마지막으로 맞춘 상태와 비교 → 바뀐 항목을 보낼 줄에
// 최근 계통 변경 기록 (홈에 보여줌) · 이 기기에 60건까지
const syNm = v => { try { const j = typeof v === 'string' ? JSON.parse(v) : v; return j ? [j.no, j.name].filter(Boolean).join(' ') || j.type || '' : ''; } catch (e) { return ''; } };
function syLog(list) {
  if (!list.length) return;
  const L = syLS('log') || [], t = Date.now();
  if (list.length > 20) L.unshift({t, by: list[0].by, a: '여러 개', nm: `항목 ${list.length}개 변경`, id: ''});
  else list.forEach(x => L.unshift(Object.assign({t}, x)));
  syLS('log', L.slice(0, 60));
}
function syDiff() {
  if (!SY.on || SY.applying || !SY.base) return 0;
  const m = syMap(), B = SY.base, t = Date.now(), by = syWho(); let n = 0;
  const put = (k, v) => { SY.q = SY.q.filter(o => o.k !== k); SY.q.push({k, v, t, by}); n++; };
  const lg = [];
  Object.keys(m).forEach(k => { if (B[k] !== m[k]) { if (k.startsWith('n:')) lg.push({by, id: k.slice(2), a: B[k] === undefined ? '추가' : '수정', nm: syNm(m[k])}); put(k, m[k]); B[k] = m[k]; } });
  Object.keys(B).forEach(k => { if (!(k in m)) { if (k.startsWith('n:')) lg.push({by, id: k.slice(2), a: '삭제', nm: syNm(B[k])}); put(k, null); delete B[k]; } });   // 지운 것
  syLog(lg);
  if (n) syKeep();
  return n;
}
// 받은 변경을 내 데이터에 넣기
function syApply(ops) {
  if (!ops.length) return 0;
  SY.applying = true; let n = 0;
  const pend = new Set(SY.q.map(o => o.k)), idx = new Map(S.nodes.map((x, i) => [x.id, i]));
  const gone = new Set(), lg = [];
  ops.forEach(o => {
    if (pend.has(o.k) || (SY.mine[o.k] && o.seq < SY.mine[o.k])) { SY.conf++; return; }   // 내 것이 더 나중 → 내 것 유지
    const v = o.v == null || o.v === '' ? null : JSON.parse(o.v), [ty, ...r] = o.k.split(':'), id = r.join(':');
    if (ty === 'n') lg.push({by: o.by || '', id, a: !v ? '삭제' : idx.has(id) ? '수정' : '추가', nm: v ? syNm(v) : (idx.has(id) ? syNm(S.nodes[idx.get(id)]) : '')});
    if (ty === 'n') { if (v) { if (idx.has(id)) S.nodes[idx.get(id)] = v; else { S.nodes.push(v); idx.set(id, S.nodes.length - 1); } } else if (idx.has(id)) gone.add(id); }
    else if (ty === 'c') { if (v == null) delete S.cfg[id]; else S.cfg[id] = v; }
    else if (ty === 's') { if (v == null) delete S[id]; else S[id] = v; }
    if (o.v == null || o.v === '') delete SY.base[o.k]; else SY.base[o.k] = o.v;
    n++;
  });
  if (gone.size) S.nodes = S.nodes.filter(x => !gone.has(x.id));
  syLog(lg);
  dirty(); save(); SY.applying = false; syKeep();
  return n;
}
async function syReq(body) {
  const c = syCfg(); if (!c.url) throw new Error('url');
  const r = await fetch(c.url, {method: 'POST', body: JSON.stringify(Object.assign({k: c.key}, body))}); const j = await r.json();
  if (!j.ok) throw new Error(j.err || 'fail'); return j;
}
// 보내기 → 받기
async function sySync(quiet) {
  if (!SY.on || SY.busy || !syCfg().url) return;
  SY.busy = true; SY.err = ''; syShow();
  try {
    syDiff();
    while (SY.q.length) { const B = SY.q.slice(0, 150), j = await syReq({a: 'push', ops: B, dev: syDev()}); (j.seqs || []).forEach((q, i) => { SY.mine[B[i].k] = q; }); SY.q = SY.q.slice(B.length); syKeep(); }
    const j = await syReq({a: 'pull', since: SY.seq, dev: syDev()});
    const mine = syDev(), ops = (j.ops || []).filter(o => o.dev !== mine);
    const c0 = SY.conf, n = syApply(ops);
    SY.seq = Math.max(SY.seq, j.seq || 0); SY.mine = {}; SY.last = Date.now(); syKeep();
    if (n) { renderAll(); const who = [...new Set(ops.map(o => o.by).filter(Boolean))].join(', '); toast(`↻ 다른 사람 변경 ${n}건 반영${who ? ' (' + who + ')' : ''}${SY.conf > c0 ? ` · 충돌 ${SY.conf - c0}건은 내 입력 유지` : ''}`, false); }
    syLS('snapDay') !== new Date().toDateString() && syReq({a: 'snap', state: sySnap()}).then(() => syLS('snapDay', new Date().toDateString())).catch(() => {});
  } catch (e) { SY.err = String(e.message || e); }
  SY.busy = false; syShow();
}
const syDev = () => { let d = syLS('dev'); if (!d) { d = 'd' + Math.random().toString(36).slice(2, 9); syLS('dev', d); } return d; };
const sySnap = () => { const o = JSON.parse(JSON.stringify(S)); if (o.cfg) delete o.cfg.logo; return o; };
// 켜기: 시트가 비었으면 내 데이터를 올리고, 이미 있으면 시트 것으로 맞춤
async function syEnable() {
  const c = syCfg(); if (!c.url) return alert('먼저 [🔦 순찰 → 설정 ④]에 구글 시트 주소·비밀 키를 넣어 주세요.');
  if (!syWho()) { const w = (prompt('이름 (누가 고쳤는지 남겨요)', '') || '').trim(); if (!w) return; syLS('who', w); }
  let info; try { info = await syReq({a: 'info'}); } catch (e) { return alert('✘ 시트 연결 안 됨 — [연결 테스트]부터 해 보세요. (' + e.message + ')'); }
  if (info.count > 0) {
    if (S.nodes.length && !confirm(`시트에 계통 데이터가 이미 있어요 (항목 ${info.count}개).\n\n이 기기 데이터를 시트의 최신으로 바꿀까요?\n(이 기기에만 있고 시트에 없는 변경은 사라져요 — 필요하면 먼저 백업을 받아 두세요)`)) return;
    const j = await syReq({a: 'pull', since: 0, dev: ''});
    SY.applying = true;
    const st = {nodes: []}; (j.ops || []).forEach(o => { if (o.v == null || o.v === '') return; const v = JSON.parse(o.v), [ty, ...r] = o.k.split(':'), id = r.join(':');
      if (ty === 'n') st.nodes.push(v); else if (ty === 'c') (st.cfg = st.cfg || {})[id] = v; else st[id] = v; });
    const logo = S.cfg && S.cfg.logo;
    Object.keys(S).forEach(k => { if (k !== 'app' && k !== 'ver') delete S[k]; }); Object.assign(S, {cfg: {}}, st); if (logo) S.cfg.logo = logo;
    if (typeof fixData === 'function') fixData();
    dirty(); save(); SY.applying = false;
    SY.base = syMap(); SY.q = []; SY.seq = j.seq || 0;
  } else { SY.base = {}; SY.q = []; SY.seq = 0; }   // 시트가 비었음 → 다음 동기화 때 전부 올림
  SY.on = true; syKeep(); renderAll(); await sySync(); toast('☁ 계통 데이터 동기화를 켰어요.', false);
}
function syDisable() { SY.on = false; syKeep(); syShow(); toast('계통 동기화를 껐어요 (이 기기 데이터는 그대로).', false); }

/* ---------- 표시 ---------- */
function syShow() {
  let el = document.getElementById('syncSt');
  if (!el) { const st = document.getElementById('status'); if (!st) return; el = document.createElement('span'); el.id = 'syncSt'; st.before(el); }
  if (!SY.on) { el.textContent = ''; el.className = ''; return; }
  const q = SY.q.length;
  el.className = SY.err ? 'bad' : q ? 'q' : 'ok';
  el.textContent = SY.err ? '☁ 동기화 안 됨' : SY.busy ? '☁ 맞추는 중…' : q ? `☁ 보낼 것 ${q}` : `☁ 동기화 ${SY.last ? new Date(SY.last).toLocaleTimeString('ko-KR', {hour: '2-digit', minute: '2-digit', hour12: false}) : ''}`;
  el.title = SY.err ? '시트에 연결이 안 돼요: ' + SY.err : '다른 사람 변경을 1분마다 받아와요 · 누르면 지금 맞추기';
}
document.addEventListener('click', e => { if (e.target.closest && e.target.closest('#syncSt')) sySync(); });

/* ---------- 저장할 때마다 · 1분마다 · 다시 볼 때 ---------- */
{
  const _sv = save;
  save = function () { const r = _sv.apply(this, arguments); if (SY.on && !SY.applying) { clearTimeout(SY.t); SY.t = setTimeout(() => { syDiff(); syShow(); sySync(); }, 2500); } return r; };
}
setInterval(() => { if (SY.on && document.visibilityState === 'visible') sySync(true); }, 60e3);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && SY.on) sySync(true); });
window.addEventListener('online', () => sySync(true));
// 백업 불러오기·초기화처럼 통째로 바뀌면 동기화 기준을 다시 (불러온 내용 전부가 '변경'으로 보내짐)
setTimeout(() => { if (SY.on) { if (!SY.base) SY.base = syMap(); syShow(); sySync(true); } }, 1500);

/* ---------- 순찰 설정 ④에 스위치 ---------- */
{
  const _ps = ptSetH;
  ptSetH = function (c) {
    const h = _ps.apply(this, arguments);
    const box = `<div class="syBox"><b>☁ 계통 데이터도 자동 동기화</b> <span class="mu">(3명이 같이 조사 · 고친 항목만 주고받음 · 도면 이미지는 제외)</span><br>
      ${SY.on ? `<span class="ok">● 켜짐</span> · 보낼 것 ${SY.q.length} · 마지막 ${SY.last ? new Date(SY.last).toLocaleTimeString('ko-KR', {hour12: false}) : '-'}${SY.conf ? ' · 충돌 ' + SY.conf : ''}${SY.err ? ` · <span class="w">오류: ${esc(SY.err)}</span>` : ''} <button data-sya="now">지금 맞추기</button><button data-sya="off">끄기</button>`
        : `<button data-sya="on" class="pri">켜기</button> <span class="mu">시트 주소·키를 넣고 [연결 테스트]가 된 뒤에</span>`}</div>`;
    return h.replace('<div class="ptBt"><button data-pta="gas">', box + '<div class="ptBt"><button data-pta="gas">');
  };
}
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-sya]'); if (!b) return;
  const a = b.dataset.sya;
  if (a === 'on') syEnable().then(() => renderView());
  else if (a === 'off') { syDisable(); renderView(); }
  else sySync().then(() => renderView());
});
// 순찰자 설정 링크에 계통 동기화도 같이 켜기 (#ps 에 sy=1)
{
  const _sl = ptSetupLink;
  ptSetupLink = function () { const u = _sl.apply(this, arguments); return SY.on ? u + '&sy=1' : u; };
  let ask = false; try { ask = sessionStorage.getItem('ckd_sy_ask') === '1'; sessionStorage.removeItem('ckd_sy_ask'); } catch (_) {}
  if (ask && !SY.on) setTimeout(() => { if (confirm('계통 데이터 동기화도 켤까요? (시트의 최신 계통을 받아와요)')) syEnable(); }, 1200);
}
(function () {
  const s = document.createElement('style');
  s.textContent = `#syncSt{font-size:12px;cursor:pointer;white-space:nowrap}#syncSt.ok{color:#12b76a}#syncSt.q{color:#b54708}#syncSt.bad{color:#f04438;font-weight:700}
#view .syBox{margin:8px 0;padding:9px 11px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;font-size:13px}#view .syBox .ok{color:#12b76a;font-weight:700}#view .syBox .w{color:#c2410c}
#view .syBox button{padding:4px 10px;border:1px solid #d6dbe8;background:#fff;border-radius:6px;cursor:pointer;font-size:12.5px;margin-left:4px}#view .syBox button.pri{background:#273382;color:#fff;border-color:#273382;margin-left:0}`;
  document.head.appendChild(s);
})();
