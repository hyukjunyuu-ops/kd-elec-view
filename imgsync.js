/* =========================================================
   imgsync.js — 도면 이미지(층 도면·부하도면)도 구글 드라이브로 자동 동기화
   - 계통 동기화(sync.js)가 켜져 있을 때만 · 계통 맞춘 뒤 이어서
   - 이 기기에서 올리거나 지운 도면 → 드라이브 '계통 도면' 폴더 (시트 '도면목록'에 키·시각)
   - 다른 사람이 올린 도면 → 받아서 이 기기에 저장 (더 새것만)
   - 처음 켤 때: 시트에 없는 이 기기 도면은 올림 (도면 있는 PC 한 대가 켜면 나머지는 받기만)
   ========================================================= */

const IS = {busy: false, old: false, pend: syLS('imgq') || {}, meta: syLS('imgmeta') || {}, quiet: 0, last: ''};
const isKeep = () => { syLS('imgq', IS.pend); syLS('imgmeta', IS.meta); };
{
  // 이 기기에서 바뀐 도면은 '보낼 것'에 (받아서 저장할 때는 제외)
  const I = Store.img, put = I.put, del = I.del;
  I.put = (k, v) => { if (!IS.quiet) { IS.pend[k] = Date.now(); isKeep(); isSoon(); } return put(k, v); };
  I.del = k => { if (!IS.quiet) { IS.pend[k] = Date.now(); isKeep(); isSoon(); } return del(k); };
}
let isT = 0;
const isSoon = () => { clearTimeout(isT); if (SY.on) isT = setTimeout(() => isSync(), 3000); };
const isQuiet = async f => { IS.quiet++; try { return await f(); } finally { IS.quiet--; } };

async function isSync() {
  if (!SY.on || IS.busy || IS.old || !syCfg().url) return;
  IS.busy = true; let up = 0, down = 0;
  try {
    // ① 보내기 (한 장씩 · 이미지는 커서)
    for (const k of Object.keys(IS.pend)) {
      let data = ''; try { data = (await Store.img.get(k)) || ''; } catch (e) {}
      const t = IS.pend[k];
      try { await syReq({a: 'imgput', key: k, data, t, by: syWho()}); }
      catch (e) { if (/^a$/.test(e.message)) { IS.old = true; toast('🖼 도면 동기화: Apps Script 코드가 예전 것이에요 — [순찰 → 설정 ④ → 연결 방법]의 새 코드를 붙여 넣고 새 버전으로 배포해 주세요.', false); } throw e; }
      if (IS.pend[k] === t) delete IS.pend[k];
      IS.meta[k] = t; isKeep(); up++;
    }
    // ② 받기: 시트 목록에서 내 것보다 새것만
    const j = await syReq({a: 'imgs'}), R = j.imgs || [], seen = new Set();
    for (const r of R) {
      seen.add(r.k);
      if (IS.pend[r.k] || r.t <= (IS.meta[r.k] || 0)) continue;
      if (r.has) {
        const g = await syReq({a: 'img', key: r.k});
        if (g.data) { await isQuiet(() => Store.img.put(r.k, g.data)); if (typeof PL !== 'undefined') PL.img[r.k] = g.data; down++; }
      } else { await isQuiet(() => Store.img.del(r.k)).catch(() => {}); if (typeof PL !== 'undefined') PL.img[r.k] = ''; down++; }
      IS.meta[r.k] = r.t; isKeep();
    }
    // ③ 처음: 시트에 아직 없는 이 기기 도면 → 다음에 올림
    let ks = []; try { ks = (await Store.img.keys()) || []; } catch (e) {}
    const add = ks.filter(k => !seen.has(k) && !IS.pend[k] && !IS.meta[k]);
    add.forEach(k => { IS.pend[k] = Date.now(); }); if (add.length) { isKeep(); isSoon(); }
    IS.last = '';
  } catch (e) { IS.last = String(e.message || e); }
  IS.busy = false;
  if (down) { try { renderTree(); if (/^(plan|zone)$/.test(UI.tab)) renderView(); } catch (e) {} toast(`🖼 다른 사람이 올린 도면 ${down}장을 받았어요.`, false); }
  else if (up) setStatus(`🖼 도면 ${up}장 올림`);
}
// 계통 동기화가 끝나면 이어서 도면도
{ const _s = sySync; sySync = async function () { const r = await _s.apply(this, arguments); isSync(); return r; }; }
