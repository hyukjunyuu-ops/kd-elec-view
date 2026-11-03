/* =========================================================
   theme.js — 화면 디자인 (기능은 그대로, 겉모습만)
   - PC: 왼쪽 세로 메뉴(홈·지도·단선도·회로도·위치·부하도면·점검·순찰) · 위 한 줄(동 ▾ · 검색 Ctrl+K · 저장/백업 · 편집 스위치)
   - 홈 화면: 오늘 순찰 · 데이터 점검 · 반/회로 · 백업 · 전기실 9곳 · 최근 본 반 (있는 숫자를 모아서)
   - 색·글꼴·버튼·카드 모양 통일 · 로고는 왼쪽 위 (눌러서 회사 로고 이미지 올리기)
   - 핸드폰(폭 760px 이하)은 지금 구조 그대로, 색·모양만
   ========================================================= */

const TH_I = {
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  map: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"/>',
  sld: '<path d="M12 3v5M12 16v5M7 8h10M7 8v3M17 8v3"/><circle cx="12" cy="13" r="3"/>',
  dg: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h6M9 11h2M13 11h2M9 15h2M13 15h2"/>',
  plan: '<path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  zone: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 4v16"/>',
  chk: '<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/>',
  pat: '<path d="M9 3h6l-1 6h4l-8 12 1-8H7z"/>',
  srch: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  tree: '<path d="M6 3v18M6 7h6M6 13h6M6 19h6"/><circle cx="16" cy="7" r="2.2"/><circle cx="16" cy="13" r="2.2"/><circle cx="16" cy="19" r="2.2"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  field: '<path d="M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1z"/><rect x="5" y="5" width="14" height="16" rx="2"/><path d="M9 11h6M9 15h4"/>'
};
const thIc = (k, s) => `<svg width="${s || 20}" height="${s || 20}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${TH_I[k]}</svg>`;
// 저장소에 넣은 회사 로고 파일 (넣으면 여기에 이름, 없으면 '')
const TH_LOGO = 'logo.png';   // 종근당 심볼 (왼쪽 메뉴 맨 위) · logo-full.png = 글자 로고 (위 한 줄)
const TH_NAV = [['home', '홈'], ['map', '지도'], ['sld', '단선도'], ['dg', '회로도'], ['plan', '위치'], ['zone', '부하도면'], ['chk', '점검'], ['pat', '순찰']];

/* ---------- 최근 본 반 (홈) ---------- */
const thRecent = () => { try { return JSON.parse(localStorage.getItem('ckd_elec2_recent') || '[]'); } catch (e) { return []; } };
{
  const _sel = select;
  select = function (id) {
    const n = byId(id);
    if (n && ['PNL', 'MDB', 'MCC', 'UPS'].includes(n.type)) { const R = [id, ...thRecent().filter(x => x !== id)].slice(0, 8); try { localStorage.setItem('ckd_elec2_recent', JSON.stringify(R)); } catch (e) {} }
    const r = _sel.apply(this, arguments); const q = document.getElementById('thQi'), sr = document.getElementById('search'); if (q && sr && !sr.value) q.value = ''; return r;
  };
}

/* ---------- 홈 화면 ---------- */
function homeView() {
  const d = new Date(), wd = '일월화수목금토'[d.getDay()];
  // 순찰
  let pt = '';
  if (typeof ptCfg === 'function') {
    const c = ptCfg(), R = c.rooms.map(rm => ({rm, r: ptTodayOf(rm.id)})), done = R.filter(x => x.r).length, bad = R.filter(x => x.r && (x.r.bad || []).length).length;
    pt = {done, n: R.length, bad, R};
  }
  // 데이터 점검
  let ck = {n: 0, top: ''};
  try { const r = ckRun(); ck.n = r.hit.size; ck.top = CK_RULES.filter(([k]) => r.cnt[k]).slice(0, 3).map(([k, l]) => `${l.split('·')[0].replace(/ /g, '')} ${r.cnt[k]}`).join(' · '); } catch (e) {}
  // 반 · 회로
  const P = S.nodes.filter(n => ['PNL', 'MDB', 'MCC', 'UPS'].includes(n.type) && !isSlot(n)), C = S.nodes.filter(n => (n.type === 'LOAD' || n.type === 'CB') && !kids(n.id).length && !isSlot(n));
  const bld = UI.bld || '', pb = bld ? P.filter(n => bk(n) === bld).length : 0;
  // 백업
  const days = typeof BK !== 'undefined' && BK.t ? Math.floor((Date.now() - BK.t) / 864e5) : -1;
  const bkTxt = days < 0 ? '받은 적 없음' : days ? days + '일 전' : '오늘', bkCol = days < 0 || days >= 7 ? 'var(--wn)' : 'var(--ok)';
  const rec = thRecent().map(byId).filter(Boolean).slice(0, 6);
  const todo = n => { try { return fdCircuits(n).filter(fdTodo).length; } catch (e) { return 0; } };
  return `<div class="thHome"><div class="thHh"><div class="mu">${d.getMonth() + 1}월 ${d.getDate()}일 (${wd})</div><h1>오늘 현황</h1></div>
    <div class="thK4">
      <a class="thK" data-t2="pat"><em>${thIc('pat', 16)}오늘 순찰</em><b>${pt ? pt.done + ' / ' + pt.n : '-'}</b><small>${pt && pt.bad ? `⚠ 이상 ${pt.bad}곳` : '이상 없음'}</small><div class="bar"><i style="width:${pt ? Math.round(pt.done / Math.max(1, pt.n) * 100) : 0}%"></i></div></a>
      <a class="thK" data-t2="chk"><em>${thIc('chk', 16)}데이터 점검</em><b>${ck.n}</b><small>${esc(ck.top || '확인할 것 없음')}</small></a>
      <a class="thK" data-t2="dg"><em>${thIc('dg', 16)}반 · 회로</em><b>${P.length} · ${C.length}</b><small>${bld ? esc(bld) + ' ' + pb + '면' : '전체 동'}</small></a>
      <a class="thK" data-bk="1"><em>${thIc('zone', 16)}백업</em><b style="color:${bkCol};${days < 0 ? 'font-size:21px;padding:5px 0' : ''}">${bkTxt}</b><small>${typeof BK !== 'undefined' && BK.chg ? `그 뒤 ${BK.chg}번 고침 · 눌러서 백업 받기` : '눌러서 백업 받기'}</small></a></div>
    <div class="thTwo"><div class="thC"><div class="thCh"><b>전기실 순찰</b><span class="sp"></span><button data-t2="pat">순찰 열기</button></div>
      <div class="thRm">${pt ? pt.R.map(({rm, r}) => { const b = r && (r.bad || []).length;
        return `<div class="thRo"><span class="ic ${r ? b ? 'wn' : 'ok' : 'no'}">${r ? b ? '!' : '✔' : '○'}</span><div><b>${esc(rm.name.replace(/ 전기실$/, ''))}</b><small>${r ? `${ptHM(r.ts)} ${esc(r.who || '')}${b ? ' · ' + esc(r.bad[0]) : ''}` : '미순찰'}</small></div></div>`; }).join('') : ''}</div></div>
      <div class="thC"><div class="thCh"><b>최근 본 반</b></div>
        ${rec.length ? rec.map(n => { const t = todo(n), K = typeof pvKindOf === 'function' ? pvKindOf(n) : {l: n.type, c: '#475569'};
          return `<div class="thLi" data-hgo="${esc(n.id)}"><span class="thTy" style="color:${K.c};background:${K.c}18">${esc(K.l)}</span><div class="s"><b>${esc(label(n))}</b><small>${esc(bk(n))}${t ? '' : ' · 회로 ' + kids(n.id).filter(k => !isSlot(k)).length}</small></div>${t ? `<span class="thTag">미조사 ${t}</span>` : ''}</div>`; }).join('')
          : '<div class="mu" style="padding:12px 0">트리에서 반을 고르면 여기 쌓여요.</div>'}</div></div></div>`;
}

/* ---------- 틀 만들기 ---------- */
(function () {
  // 글꼴: 외부에서 받지 않음 (인터넷 없는 PC도 같게) — 설치돼 있으면 Pretendard, 아니면 맑은 고딕
  const body = document.body, hdr = document.querySelector('header');
  // 왼쪽 세로 메뉴
  const nav = document.createElement('nav'); nav.id = 'thNav';
  nav.innerHTML = `<div id="thLogo"></div>${TH_NAV.map(([k, l]) => `<button data-t2="${k}">${thIc(k, 21)}<span>${l}</span></button>`).join('')}<span class="sp"></span>`;
  body.insertBefore(nav, body.firstChild);
  nav.querySelector('#thLogo').appendChild(document.getElementById('logo'));
  // 위 한 줄: 동 ▾ · 검색
  const ttl = hdr.querySelector('.ttl');
  const bs = document.createElement('select'); bs.id = 'thBld'; bs.title = '동 고르기';
  const sw = document.createElement('label'); sw.id = 'thQ'; sw.innerHTML = `${thIc('srch', 17)}<input id="thQi" placeholder="반 · 부하 · 차단기 검색" autocomplete="off"><span class="kbd">Ctrl K</span>`;
  ttl.after(bs); bs.after(sw);
  const wd = new Image(); wd.id = 'thWord'; wd.alt = '종근당'; wd.onload = () => { hdr.insertBefore(wd, ttl); const sm = ttl.querySelector('small'); if (sm) sm.textContent = '천안공장'; }; wd.src = 'logo-full.png';   // 글자 로고 (파일 있으면)
  // 홈 탭 버튼 (핸드폰 탭 줄에도)
  const tb = document.getElementById('tabs'); if (tb && !tb.querySelector('[data-t="home"]')) { const h = document.createElement('button'); h.dataset.t = 'home'; h.textContent = '홈'; tb.insertBefore(h, tb.firstChild); }
  // 동 고르기 = 기존 동 줄과 같은 동작
  const fillB = () => { const cnt = {}; S.nodes.forEach(n => { const b = bk(n); cnt[b] = (cnt[b] || 0) + 1; });
    const B = S.blds.filter(b => cnt[b]), E = S.blds.filter(b => !cnt[b]), o = b => `<option value="${esc(b)}"${b === UI.bld ? ' selected' : ''}>${esc(b)}${cnt[b] ? ' · ' + cnt[b] : ''}</option>`;
    bs.innerHTML = `<option value="">전체 동 · ${S.nodes.length}</option>${B.map(o).join('')}${E.length ? `<optgroup label="항목 아직 없는 동">${E.map(o).join('')}</optgroup>` : ''}`; };
  const _rb = renderBld; renderBld = function () { _rb.apply(this, arguments); fillB(); };
  bs.addEventListener('change', () => setBld(bs.value));
  // 검색 = 트리 검색으로
  const qi = sw.querySelector('input');
  qi.addEventListener('input', () => { const s = document.getElementById('search'); if (!s) return; const lt = document.querySelector('#lTabs [data-lt="tree"]'); if (lt && !lt.classList.contains('on')) lt.click(); s.value = qi.value; s.dispatchEvent(new Event('input', {bubbles: true})); });
  document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); qi.focus(); qi.select(); } if (e.key === 'Escape' && document.activeElement === qi) { qi.value = ''; qi.dispatchEvent(new Event('input')); qi.blur(); } });
  // 메뉴 누르기
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-t2]'); if (b) { UI.tab = b.dataset.t2; saveUI(); renderAll(); return; }
    const g = e.target.closest && e.target.closest('[data-hgo]'); if (g) { UI.tab = 'dg'; S.cfg.pvMode = 'pv'; saveUI(); select(g.dataset.hgo, true); return; }
    if (e.target.closest && e.target.closest('[data-bk]')) { if (typeof exportBackup === 'function') exportBackup(); }
  });
  // 메뉴 불 · 홈
  const _rv = renderView;
  renderView = function () {
    if (UI.tab === 'home') {
      document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === 'home'));
      $('#view').innerHTML = homeView();
    } else _rv.apply(this, arguments);
    nav.querySelectorAll('[data-t2]').forEach(b => b.classList.toggle('on', b.dataset.t2 === UI.tab || (UI.tab === 'sld' && b.dataset.t2 === 'sld')));
  };
  if (!localStorage.getItem('ckd_elec2_ui') && UI.tab !== 'home') UI.tab = 'home';   // 처음 쓰는 사람은 홈부터
  const s = document.createElement('style');
  s.textContent = `
:root{--nv:#1b2559;--nv2:#273382;--bl:#3b5bdb;--bg:#f4f6fb;--ln:#e6e9f2;--tx:#1a1f36;--mu:#6b7489;--ok:#12b76a;--wn:#f79009;--er:#f04438}
input[type=file]{display:none!important}
body{font-family:Pretendard,'Malgun Gothic','Apple SD Gothic Neo',sans-serif;background:var(--bg);color:var(--tx);font-size:13.5px}
button{border-color:#dfe3ee;border-radius:8px;color:#344054}button:hover{background:#f5f7fc}
button.pri,button.on{background:var(--nv2);border-color:var(--nv2);color:#fff}button.pri:hover{background:#2f3c95}
.card{border-color:var(--ln);border-radius:14px;box-shadow:0 1px 2px rgba(16,24,40,.04)}
table.tb th{background:#f8fafc;color:#475467;font-weight:700}table.tb th,table.tb td{border-bottom-color:#eef0f5}
#toast{border-radius:12px;padding:10px 14px;background:#101828}
.ty{border-radius:6px;font-weight:700}.trow{border-radius:8px;padding:4px 8px}.trow.sel{background:#eef2ff;border-left-color:var(--bl)}
#form input,#form select,#form textarea,#search{border-color:#dfe3ee;border-radius:8px}
.act{background:#f8f9fd;border-color:var(--ln);border-radius:12px}.sec{color:var(--tx)}
.ph h2,.pvBar h2,#view .sdBar h2,#view .mpBar h2{color:var(--tx);letter-spacing:-.3px}
#view .pvBar button,#view .pvAdd button,#view .sdBar button,#view .mpBar button,#view .plBar button,#view .bvBar button{border-color:#dfe3ee;border-radius:8px;color:#344054}
#view .pvBar button.on,#view .plBar button.on,#view .sdBar button.on{background:var(--nv2);border-color:var(--nv2);color:#fff}
/* ── PC: 왼쪽 메뉴 + 위 한 줄 ── */
body:not(.mob){flex-direction:column;padding-left:76px}
#thNav{display:none}
body:not(.mob) #thNav{position:fixed;left:0;top:0;bottom:0;width:76px;background:var(--nv);display:flex;flex-direction:column;align-items:center;gap:3px;padding:12px 0;z-index:40}
#thNav #thLogo{width:46px;height:46px;border-radius:12px;background:#fff;display:grid;place-items:center;margin-bottom:12px;overflow:hidden}
#thNav #logo{height:auto;min-width:0;font-size:13px;color:var(--nv);letter-spacing:-.5px}#thNav #logo img{width:46px;height:46px;object-fit:cover;display:block}
#thWord{display:none}body:not(.mob) #thWord{display:block;height:26px;margin-right:-2px}
#thNav [data-t2]{width:64px;padding:9px 0 7px;border:0;border-radius:12px;background:none;color:#aab3d9;display:flex;flex-direction:column;align-items:center;gap:4px;font-size:11px}
#thNav [data-t2]:hover{color:#fff;background:rgba(255,255,255,.06)}#thNav [data-t2].on{background:rgba(255,255,255,.14);color:#fff;font-weight:700}#thNav .sp{flex:1}
body:not(.mob) header{height:60px;border-bottom:1px solid var(--ln);padding:0 18px;gap:12px;flex-wrap:nowrap}
body:not(.mob) header .ttl{border-left:0;padding:0}body:not(.mob) header .ttl b{color:var(--tx);font-size:16px}
#thBld{display:none}body:not(.mob) #thBld{display:block;padding:7px 10px;border:1px solid var(--ln);border-radius:10px;font-weight:700;background:#fff;max-width:180px}
#thQ{display:none}body:not(.mob) #thQ{display:flex;flex:1;max-width:520px;margin:0 auto;align-items:center;gap:8px;background:var(--bg);border:1px solid var(--ln);border-radius:12px;padding:0 12px;color:var(--mu)}
#thQ input{flex:1;border:0;background:transparent;padding:9px 0;outline:0;font-size:14px}#thQ .kbd{font-size:11px;border:1px solid #d5d9e6;border-radius:6px;padding:1px 6px;background:#fff}
#thQ:focus-within{border-color:var(--bl);background:#fff;box-shadow:0 0 0 3px #e0e7ff}
body:not(.mob) header .sp{display:none}
body:not(.mob) #bldBar,body:not(.mob) #tabs,body:not(.mob) #left .top #search{display:none!important}
body:not(.mob) #left .top{justify-content:flex-end}
body:not(.mob) #bEdit{border-radius:20px;padding:6px 14px 6px 40px;position:relative;font-weight:700}
body:not(.mob) #bEdit:before{content:'';position:absolute;left:8px;top:50%;width:26px;height:15px;margin-top:-7.5px;border-radius:10px;background:#d0d5e2;transition:.15s}
body:not(.mob) #bEdit:after{content:'';position:absolute;left:10px;top:50%;width:11px;height:11px;margin-top:-5.5px;border-radius:50%;background:#fff;transition:.15s}
body:not(.mob) #bEdit.on{background:#fff7e6;border-color:#f79009;color:#b54708}body:not(.mob) #bEdit.on:before{background:#f79009}body:not(.mob) #bEdit.on:after{left:23px}
body:not(.mob) main{padding:12px;gap:12px}
body:not(.mob) #left{width:var(--lw,360px);position:relative}body:not(.mob) #right{width:330px}
body:not(.mob) #view{padding:20px 24px}
#lTabs button{border-radius:10px}
/* ── 홈 ── */
.thHome .mu{color:var(--mu);font-size:12.5px}.thHh h1{margin:4px 0 16px;font-size:24px;letter-spacing:-.5px}
.thK4{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px}
.thK{background:#fff;border:1px solid var(--ln);border-radius:16px;padding:16px 18px;cursor:pointer;color:inherit;text-decoration:none;display:block}.thK:hover{border-color:#c7d2fe;box-shadow:0 4px 14px rgba(39,51,130,.08)}
.thK em{font-style:normal;color:var(--mu);font-size:13px;display:flex;align-items:center;gap:6px}.thK b{display:block;font-size:28px;margin:6px 0 2px;letter-spacing:-.5px}.thK small{color:var(--mu)}
.thK .bar{height:8px;background:var(--bg);border-radius:6px;overflow:hidden;margin-top:10px}.thK .bar i{display:block;height:100%;background:var(--ok)}
.thTwo{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:14px;margin-top:14px}
.thC{background:#fff;border:1px solid var(--ln);border-radius:16px;padding:14px 16px}.thCh{display:flex;align-items:center;margin-bottom:10px}.thCh .sp{flex:1}.thCh b{font-size:15px}
.thRm{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:8px}
.thRo{border:1px solid var(--ln);border-radius:12px;padding:9px 11px;display:flex;align-items:center;gap:10px}.thRo b{font-size:13.5px}.thRo small{display:block;color:var(--mu);font-size:11.5px}
.thRo .ic{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;font-weight:800;flex:none}.ic.ok{background:#dcfae6;color:#067647}.ic.wn{background:#fef0c7;color:#b54708}.ic.no{background:#f2f4f7;color:#98a2b3}
.thLi{display:flex;align-items:center;gap:10px;padding:9px 6px;border-top:1px solid var(--ln);cursor:pointer;border-radius:8px}.thLi:first-of-type{border-top:0}.thLi:hover{background:#f8f9fd}.thLi .s{flex:1;min-width:0}.thLi small{color:var(--mu);display:block;font-size:12px}
.thTy{font-size:11px;font-weight:700;border-radius:6px;padding:2px 7px;white-space:nowrap}.thTag{font-size:11.5px;font-weight:700;border-radius:7px;padding:2px 8px;background:#fef0c7;color:#b54708;white-space:nowrap}
body.mob .thTwo{grid-template-columns:1fr}
body.mob header{border-bottom:1px solid var(--ln)}body.mob header .ttl{border-left:0;padding-left:2px}body.mob header .ttl b{color:var(--tx)}
body.mob #mbNav button svg{display:block}`;
  document.head.appendChild(s);
  // 로고: 직접 올린 것(백업에 저장) → 없으면 저장소의 로고 파일(TH_LOGO) → 없으면 'CKD'
  const _rl = renderLogo; renderLogo = function () { _rl.apply(this, arguments); if (!TH_LOGO) return;
    const el = document.getElementById('logo'); if (!el || (S.cfg && S.cfg.logo)) return;
    const im = new Image(); im.alt = '로고'; im.onload = () => { if (!(S.cfg && S.cfg.logo)) { el.innerHTML = ''; el.appendChild(im); } }; im.src = TH_LOGO; };
  if (TH_LOGO) renderLogo();
  fillB();
  setTimeout(() => { const M = {home: 'home', patrol: 'pat', field: 'field', tree: 'tree', plan: 'plan', main: 'map', info: 'info'};
    document.querySelectorAll('#mbNav button').forEach(b => { const k = M[b.dataset.mv]; const sp = b.querySelector('span'); if (k && sp) b.innerHTML = thIc(k, 22) + sp.outerHTML; }); }, 0);
})();

// 계통 트리 폭: 오른쪽 가장자리를 끌어서 넓히기 (이름이 잘릴 때) · 더블클릭 = 기본 폭
(function () {
  const L = document.getElementById('left'); if (!L) return;
  const set = w => { w = Math.max(260, Math.min(760, w)); document.body.style.setProperty('--lw', w + 'px'); return w; };
  try { const w = +localStorage.getItem('ckd_lw'); if (w) set(w); } catch (e) {}
  const g = document.createElement('div'); g.id = 'lwG'; g.title = '끌어서 트리 폭 조절 · 더블클릭 = 기본 폭'; L.appendChild(g);
  g.addEventListener('pointerdown', e => {
    e.preventDefault(); g.setPointerCapture(e.pointerId); const x0 = e.clientX, w0 = L.getBoundingClientRect().width; let w = w0;
    const mv = ev => { w = set(w0 + ev.clientX - x0); };
    const up = () => { g.removeEventListener('pointermove', mv); g.removeEventListener('pointerup', up); try { localStorage.setItem('ckd_lw', w); } catch (er) {} window.dispatchEvent(new Event('resize')); };
    g.addEventListener('pointermove', mv); g.addEventListener('pointerup', up);
  });
  g.addEventListener('dblclick', () => { document.body.style.removeProperty('--lw'); try { localStorage.removeItem('ckd_lw'); } catch (e) {} window.dispatchEvent(new Event('resize')); });
  const st = document.createElement('style');
  st.textContent = '#lwG{position:absolute;top:0;right:-7px;width:8px;height:100%;cursor:col-resize;z-index:5;border-radius:4px}#lwG:hover,#lwG:active{background:#c7d2fe}body.mob #lwG{display:none}';
  document.head.appendChild(st);
})();
