// playlog 상단 오른쪽 메뉴
// 로그인하면 … 버튼이 동그란 프사로 바뀌고, 누르면 내 정보 수정 / 내 기록 / 로그아웃
(function () {
  'use strict';

  var S = window.PLAYLOG_STORE;
  var esc = window.PLAYLOG.esc;
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

  // 프사 또는 이름 첫 글자 동그라미
  function avatarHtml(p, cls) {
    var first = esc((p.nickname || '?').slice(0, 1));
    return p.avatar
      ? '<span class="' + cls + '" data-initial="' + first + '"><img src="' + esc(p.avatar) + '" alt="" referrerpolicy="no-referrer"></span>'
      : '<span class="' + cls + ' initial">' + first + '</span>';
  }
  // 사진 주소가 깨졌으면 첫 글자로 대체
  function bindFallback(root) {
    root.querySelectorAll('[data-initial] img').forEach(function (img) {
      img.addEventListener('error', function () {
        var box = img.parentNode;
        box.classList.add('initial');
        box.textContent = box.getAttribute('data-initial');
      });
    });
  }

  var state = { user: null, profile: null };

  function fill() {
    if (!S.live) {
      pop.innerHTML = '<span class="who">데모 모드 · 저장되지 않아요</span>';
    } else if (state.user) {
      var p = state.profile;
      pop.innerHTML =
        '<div class="menu-me">' + avatarHtml(p, 'ava-md') +
          '<span><strong>' + esc(p.nickname) + '</strong><small>' + esc(p.email) + '</small></span></div>' +
        '<a href="profile.html">내 정보 수정</a>' +
        '<a href="records.html">내 기록</a>' +
        '<button type="button" data-act="logout">로그아웃</button>';
    } else {
      pop.innerHTML = '<a href="login.html">카카오로 로그인</a>';
    }
    bindFallback(pop);
  }

  // 로그인 상태면 버튼을 프사로 바꿈
  S.getUser().then(function (user) {
    state.user = user;
    if (!user) return;
    return S.getProfile(user).then(function (p) {
      state.profile = p;
      btn.classList.add('avatar-btn');
      btn.innerHTML = avatarHtml(p, 'ava-btn');
      bindFallback(btn);
      btn.setAttribute('aria-label', '내 정보 메뉴 (' + p.nickname + ')');
    });
  }).catch(function () { /* 실패해도 … 버튼 그대로 */ });

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
    fill();
    open(true);
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
