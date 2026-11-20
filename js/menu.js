// playlog 상단 … 메뉴 — 로그인 정보, 로그인/로그아웃
(function () {
  'use strict';

  var S = window.PLAYLOG_STORE;
  var btn = document.querySelector('.topbar button[aria-label="메뉴"]');
  if (!btn) return;

  var wrap = document.createElement('div');
  wrap.className = 'menu-wrap';
  btn.parentNode.insertBefore(wrap, btn);
  wrap.appendChild(btn);

  var pop = document.createElement('div');
  pop.className = 'menu-pop';
  pop.id = 'app-menu';
  pop.hidden = true;
  wrap.appendChild(pop);

  btn.setAttribute('aria-haspopup', 'true');
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', 'app-menu');

  function fill() {
    return S.getUser().then(function (user) {
      var esc = window.PLAYLOG.esc;
      var html = '';
      if (!S.live) {
        html = '<span class="who">데모 모드 · 저장되지 않아요</span>';
      } else if (user) {
        var nick = S.displayName(user);
        html = '<span class="who">' + esc(nick ? nick + ' · ' : '') + esc(user.email) + '</span>' +
          '<a href="records.html">내 기록</a>' +
          '<button type="button" data-act="logout">로그아웃</button>';
      } else {
        html = '<a href="login.html">로그인 · 회원가입</a>';
      }
      pop.innerHTML = html;
    });
  }

  function open(on) {
    pop.hidden = !on;
    btn.setAttribute('aria-expanded', String(on));
    if (on) {
      var first = pop.querySelector('a, button');
      if (first) first.focus();
    }
  }

  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    if (!pop.hidden) return open(false);
    fill().then(function () { open(true); });
  });
  pop.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act="logout"]');
    if (!b) return;
    S.signOut().then(function () { location.href = 'login.html'; });
  });
  document.addEventListener('click', function (e) {
    if (!wrap.contains(e.target)) open(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !pop.hidden) { open(false); btn.focus(); }
  });
})();
