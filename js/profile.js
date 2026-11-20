// playlog 내 정보 수정 — 사진, 닉네임 (이메일은 카카오 값이라 보기만)
(function () {
  'use strict';

  var S = window.PLAYLOG_STORE;
  var esc = window.PLAYLOG.esc;
  var $ = function (id) { return document.getElementById(id); };

  var user = null;
  var original = null;      // 처음 불러온 값
  var kakaoAvatar = '';     // 카카오에서 받아온 사진
  var pendingFile = null;   // 새로 고른 사진 (저장 전)
  var pendingPreview = '';  // 미리보기 주소
  var resetToKakao = false; // "카카오 사진으로 되돌리기"를 눌렀는지

  function show(el, text) { el.textContent = text; el.hidden = !text; }

  function drawPhoto(src, nick) {
    var box = $('photo');
    var first = (nick || '?').slice(0, 1);
    if (src) {
      box.classList.remove('initial');
      box.innerHTML = '<img src="' + esc(src) + '" alt="" referrerpolicy="no-referrer">';
      box.querySelector('img').addEventListener('error', function () { box.classList.add('initial'); box.textContent = first; });
    } else {
      box.classList.add('initial');
      box.textContent = first;
    }
  }

  function currentPhoto() {
    if (pendingPreview) return pendingPreview;
    if (resetToKakao) return kakaoAvatar;
    return original.avatar;
  }

  function refresh() {
    var nick = $('nickname').value.trim();
    drawPhoto(currentPhoto(), nick || original.nickname);
    $('nick-count').textContent = $('nickname').value.length + ' / 20';
    // 직접 올린 사진을 쓰는 중이면 "카카오 사진으로 되돌리기" 보여줌
    var usingCustom = pendingFile || (!resetToKakao && original.avatar && original.avatar !== kakaoAvatar);
    $('photo-reset').hidden = !(usingCustom && kakaoAvatar);
  }

  if (!S.live) {
    show($('msg-error'), '지금은 데모 모드라 내 정보를 바꿀 수 없어요.');
    $('save').disabled = true;
    return;
  }

  S.requireUser().then(function (u) {
    user = u;
    var m = u.user_metadata || {};
    kakaoAvatar = m.avatar_url || m.picture || '';
    return S.getProfile(u);
  }).then(function (p) {
    original = p;
    $('nickname').value = p.nickname || '';
    $('email').textContent = p.email || '이메일 없음';
    refresh();
  }).catch(function (err) { show($('msg-error'), S.friendly(err)); });

  $('nickname').addEventListener('input', refresh);

  $('photo-input').addEventListener('change', function () {
    var f = this.files && this.files[0];
    if (!f) return;
    show($('msg-error'), '');
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    pendingFile = f;
    pendingPreview = URL.createObjectURL(f);
    resetToKakao = false;
    refresh();
    this.value = ''; // 같은 사진을 다시 골라도 change 가 오도록
  });

  $('photo-reset').addEventListener('click', function () {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    pendingFile = null;
    pendingPreview = '';
    resetToKakao = true;
    refresh();
  });

  // 닫기·뒤로: 앱 안에서 왔으면 이전 화면으로
  $('back').addEventListener('click', function (e) {
    if (document.referrer && history.length > 1) { e.preventDefault(); history.back(); }
  });

  $('profile-form').addEventListener('submit', function (e) {
    e.preventDefault();
    show($('msg-error'), ''); show($('msg-ok'), '');
    if (!user) return;

    var nick = $('nickname').value.trim();
    $('nickname').setAttribute('aria-invalid', String(!nick));
    if (!nick) { show($('msg-error'), '닉네임을 적어 주세요.'); $('nickname').focus(); return; }

    var save = $('save');
    save.disabled = true;
    save.textContent = '저장 중…';

    var photoJob = pendingFile
      ? S.uploadAvatar(user, pendingFile)
      : Promise.resolve(resetToKakao ? '' : undefined); // '' = 카카오 사진으로, undefined = 그대로

    photoJob.then(function (avatarUrl) {
      return S.saveProfile(user, { nickname: nick, avatar_url: avatarUrl }).then(function () {
        original.nickname = nick;
        if (avatarUrl !== undefined) original.avatar = avatarUrl || kakaoAvatar;
        pendingFile = null;
        if (pendingPreview) { URL.revokeObjectURL(pendingPreview); pendingPreview = ''; }
        resetToKakao = false;
        refresh();
        show($('msg-ok'), '저장했어요.');
      });
    }).catch(function (err) {
      show($('msg-error'), S.friendly(err));
    }).then(function () {
      save.disabled = false;
      save.textContent = '저장';
    });
  });
})();
