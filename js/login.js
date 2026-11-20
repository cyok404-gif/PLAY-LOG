// playlog 로그인 — 카카오 계정으로 로그인 (처음이면 자동 가입)
(function () {
  'use strict';

  var S = window.PLAYLOG_STORE;
  var $ = function (id) { return document.getElementById(id); };
  var btn = $('kakao');
  var errEl = $('msg-error');

  // 로그인 후 돌아갈 곳 (같은 사이트 안의 페이지만 허용)
  var params = new URLSearchParams(location.search);
  var next = params.get('next') || 'index.html';
  if (!/^[\w-]+\.html(\?[\w=&%.-]*)?$/.test(next)) next = 'index.html';

  function showError(text) { errEl.textContent = text; errEl.hidden = !text; }

  if (!S.live) {
    $('demo-note').hidden = false;
    btn.disabled = true;
    return;
  }
  if (!S.canOAuth()) {
    $('file-note').hidden = false;
    btn.disabled = true;
  }

  // 카카오에서 돌아올 때 실패했으면 주소에 error 가 붙어 옴
  var hash = new URLSearchParams(location.hash.slice(1));
  var oauthErr = params.get('error_description') || params.get('error') || hash.get('error_description') || hash.get('error');
  if (oauthErr) showError(S.friendly(new Error(oauthErr)));

  // 이미 로그인돼 있거나, 카카오에서 막 돌아와 로그인된 상태면 바로 이동
  S.getUser().then(function (user) { if (user) location.replace(next); });

  btn.addEventListener('click', function () {
    showError('');
    btn.disabled = true;
    $('kakao-label').textContent = '카카오로 이동 중…';
    S.signInWithProvider('kakao', next).catch(function (err) {
      showError(S.friendly(err));
      btn.disabled = false;
      $('kakao-label').textContent = '카카오로 시작하기';
    });
  });
})();
