// playlog 홈 — 인원·시간 필터로 오늘 할 게임 추천
(function () {
  'use strict';

  /* ---------- 데이터 ---------- */
  var BOARDS = [
    { name: '스플렌더', min: 2, max: 4, minutes: 30, rating: 4.0, plays: 12, rec: [2, 3], c: 'k-orange', m: 'dice' },
    { name: '아줄', min: 2, max: 4, minutes: 45, rating: 4.5, plays: 8, rec: [2, 4], c: 'k-blue', m: 'hex' },
    { name: '카탄', min: 3, max: 4, minutes: 90, rating: 4.0, plays: 5, rec: [4], c: 'k-yellow', m: 'hex' },
    { name: '윙스팬', min: 1, max: 5, minutes: 70, rating: 5.0, plays: 6, rec: [3, 4], c: 'k-lime', m: 'meeple' },
    { name: '코드네임', min: 4, max: 8, minutes: 20, rating: 4.5, plays: 10, rec: [6, 7], c: 'k-pink', m: 'cards' },
    { name: '딕싯', min: 3, max: 8, minutes: 30, rating: 4.0, plays: 4, rec: [5, 6], c: 'k-lilac', m: 'cards' },
    { name: '테라포밍 마스', min: 1, max: 5, minutes: 150, rating: 4.5, plays: 3, rec: [3], c: 'k-cream', m: 'dice' }
  ];
  var SCENARIOS = [
    { name: '열차 7호칸', min: 4, max: 5, minutes: 150, wish: true, others: 4.3, c: 'd-ink', m: 'key' },
    { name: '등대지기의 편지', min: 3, max: 4, minutes: 100, wish: false, others: 4.1, c: 'd-navy', m: 'lens' },
    { name: '축제 전야', min: 6, max: 7, minutes: 210, wish: true, others: 4.6, c: 'd-plum', m: 'key' },
    { name: '폐교의 졸업식', min: 5, max: 5, minutes: 240, wish: false, others: 3.9, c: 'd-teal', m: 'lens' },
    { name: '항구 도시의 밀서', min: 4, max: 6, minutes: 180, wish: false, others: 4.2, c: 'd-wine', m: 'key' }
  ];

  // 커버가 없는 게임의 타일에 넣는 게임 성격 아이콘 (색 타일 위)
  var MOTIFS = {
    dice: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="4.5" y="4.5" width="15" height="15" rx="3.5"/><circle cx="9" cy="9" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="15" r="1.3" fill="currentColor" stroke="none"/></svg>',
    meeple: '<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3.5a2.8 2.8 0 0 1 2.8 2.8c0 .9-.4 1.6-1 2.1 2.6.4 6.2 1.4 6.2 3 0 1.2-2.2 1.4-3.6 1.3l2.4 6.8h-5.1L12 15.8l-1.7 3.7H5.2l2.4-6.8C6.2 12.8 4 12.6 4 11.4c0-1.6 3.6-2.6 6.2-3a2.8 2.8 0 0 1 1.8-4.9z"/></svg>',
    hex: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M8 3.5l4 2.3v4.6L8 12.7 4 10.4V5.8z"/><path d="M16 8l4 2.3v4.6l-4 2.3-4-2.3v-4.6z"/><path d="M8 12.7l4 2.3v4.6l-4 2.3-4-2.3V15z"/></svg>',
    cards: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="9" y="4" width="10" height="14" rx="2" transform="rotate(12 14 11)"/><rect x="5" y="6" width="10" height="14" rx="2" transform="rotate(-8 10 13)"/></svg>',
    lens: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/></svg>',
    key: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="4"/><path d="M11 11l9 9M16 16l2-2M18.5 18.5l2-2"/></svg>'
  };
  var HOT_RANK = { '윙스팬': 1, '코드네임': 2, '테라포밍 마스': 3, '아줄': 4, '스플렌더': 5, '딕싯': 6, '카탄': 7 };

  // 시안용 예시 커버. 실제 서비스에서는 게임 DB API가 돌려준 이미지 URL로 채우고,
  // 여기 없는 게임은 색 타일 + 게임 성격 아이콘(없으면 이름 첫 글자)으로 표시됨.
  var COVERS = {
    '윙스팬': 'assets/img/wingspan.png',
    '코드네임': 'assets/img/codenames.png',
    '테라포밍 마스': 'assets/img/terraforming-mars.png',
    '아줄': 'assets/img/azul.png',
    '스플렌더': 'assets/img/splendor.png'
  };

  var BOARD_TIME = {
    '전체': function () { return true; },
    '~ 30분': function (m) { return m <= 30; },
    '~ 1시간': function (m) { return m <= 60; },
    '~ 2시간': function (m) { return m <= 120; },
    '2시간 ~': function (m) { return m >= 120; }
  };
  var MM_TIME = {
    '전체': function () { return true; },
    '~ 2시간': function (m) { return m <= 120; },
    '2 ~ 3시간': function (m) { return m > 120 && m <= 180; },
    '3 ~ 4시간': function (m) { return m > 180 && m <= 240; },
    '4시간 ~': function (m) { return m >= 240; }
  };

  /* ---------- 상태 ---------- */
  var state = { kind: 'board', people: null, time: '전체' };

  var $ = function (sel) { return document.querySelector(sel); };
  var peopleEl = $('#people-chips');
  var timeEl = $('#time-chips');
  var listEl = $('#pick-list');

  function hm(m) {
    if (m < 60) return m + '분';
    return m % 60 === 0 ? (m / 60) + '시간' : Math.floor(m / 60) + '시간 ' + (m % 60) + '분';
  }
  function range(g) { return g.min === g.max ? String(g.min) : g.min + ' ~ ' + g.max; }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch];
    });
  }

  function computeList() {
    var s = state;
    var isBoard = s.kind === 'board';
    var filtered = s.people !== null || s.time !== '전체';
    var timeMap = isBoard ? BOARD_TIME : MM_TIME;
    var tf = timeMap[s.time] || timeMap['전체'];
    var pk = s.people === null ? -1 : (s.people >= 7 ? 7 : s.people);
    var fits = function (g) {
      if (s.people === null) return true;
      return s.people >= 7 ? g.max >= 7 : (g.min <= s.people && g.max >= s.people);
    };
    var boardMeta = function (g) { return g.min + ' ~ ' + g.max + '인 · ' + hm(g.minutes) + ' · ' + g.plays + '판 플레이'; };
    var mmMeta = function (g) { return range(g) + '인 · ' + hm(g.minutes) + ' · 다른 사람 평균'; };

    if (isBoard && !filtered) {
      return BOARDS.slice()
        .sort(function (a, b) { return HOT_RANK[a.name] - HOT_RANK[b.name]; })
        .map(function (g) {
          return { name: g.name, c: g.c, m: g.m, dark: false, badge: '인기 ' + HOT_RANK[g.name] + '위', meta: boardMeta(g), score: g.rating.toFixed(1) };
        });
    }
    if (isBoard) {
      return BOARDS.filter(function (g) { return fits(g) && tf(g.minutes); })
        .sort(function (a, b) {
          return (Number(b.rec.indexOf(pk) > -1) - Number(a.rec.indexOf(pk) > -1)) || (b.rating - a.rating);
        })
        .map(function (g) {
          return { name: g.name, c: g.c, m: g.m, dark: false, badge: g.rec.indexOf(pk) > -1 ? '추천 인원' : '', meta: boardMeta(g), score: g.rating.toFixed(1) };
        });
    }
    if (!filtered) {
      return SCENARIOS.slice()
        .sort(function (a, b) { return b.others - a.others; })
        .map(function (g, i) {
          return { name: g.name, c: g.c, m: g.m, dark: true, badge: '인기 ' + (i + 1) + '위', meta: mmMeta(g), score: g.others.toFixed(1) };
        });
    }
    return SCENARIOS.filter(function (g) { return fits(g) && tf(g.minutes); })
      .sort(function (a, b) { return Number(b.wish) - Number(a.wish); })
      .map(function (g) {
        return { name: g.name, c: g.c, m: g.m, dark: true, badge: g.wish ? '위시' : '', meta: mmMeta(g), score: g.others.toFixed(1) };
      });
  }

  function chip(label, on, attr) {
    return '<button type="button" class="pill' + (on ? ' on' : '') + '" ' + attr +
      ' aria-pressed="' + on + '">' + esc(label) + '</button>';
  }

  function thumb(g) {
    var cover = COVERS[g.name];
    if (cover) return '<img src="' + cover + '" alt="">';
    if (MOTIFS[g.m]) return MOTIFS[g.m];
    return '<span class="initial">' + esc(g.name.slice(0, 1)) + '</span>';
  }

  function render() {
    var s = state;
    var isBoard = s.kind === 'board';

    // 종류 토글
    document.querySelectorAll('.seg').forEach(function (b) {
      var on = b.dataset.kind === s.kind;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
    });

    // 인원 칩
    peopleEl.innerHTML = [2, 3, 4, 5, 6, 7].map(function (n) {
      return chip(n === 7 ? '7명+' : n + '명', s.people === n, 'data-people="' + n + '"');
    }).join('');

    // 시간 칩
    timeEl.innerHTML = Object.keys(isBoard ? BOARD_TIME : MM_TIME).map(function (t) {
      return chip(t, s.time === t, 'data-time="' + esc(t) + '"');
    }).join('');

    // 결과 (최대 4개)
    var list = computeList();
    if (!list.length) {
      listEl.innerHTML = '<div class="empty"><strong>맞는 게임이 없어요</strong><span>인원이나 시간을 바꿔 보세요</span></div>';
      return;
    }
    listEl.innerHTML = list.slice(0, 4).map(function (g, i) {
      var href = g.name === '윙스팬' ? 'game.html' : '#';
      return '<a href="' + href + '" class="rrow' + (i === 0 ? ' first' : '') + '">' +
        '<span class="th ' + g.c + (g.dark ? ' dk' : '') + '" aria-hidden="true">' + thumb(g) + '</span>' +
        '<span class="row-body">' +
          '<span class="row-title"><span class="row-name">' + esc(g.name) + '</span>' +
          (g.badge ? '<span class="badge">' + esc(g.badge) + '</span>' : '') + '</span>' +
          '<span class="row-meta">' + esc(g.meta) + '</span>' +
        '</span>' +
        '<span class="score"><span class="star" aria-hidden="true">★</span><span class="sr">평점 </span>' + g.score + '</span>' +
      '</a>';
    }).join('');
  }

  /* ---------- 이벤트 ---------- */
  // 칩은 다시 그려지므로, 누른 칩에 포커스를 돌려 놓음 (키보드 사용자용)
  function refocus(container, attr, value) {
    var el = container.querySelector('[' + attr + '="' + value + '"]');
    if (el) el.focus();
  }

  document.querySelectorAll('.seg').forEach(function (b) {
    b.addEventListener('click', function () {
      state.kind = b.dataset.kind;
      state.time = '전체';
      render();
    });
  });
  peopleEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-people]');
    if (!b) return;
    var n = Number(b.dataset.people);
    state.people = state.people === n ? null : n;
    render();
    refocus(peopleEl, 'data-people', n);
  });
  timeEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-time]');
    if (!b) return;
    state.time = b.dataset.time;
    render();
    refocus(timeEl, 'data-time', esc(state.time));
  });
  /* ---------- YOUR PLAY: 내 최근 기록 (Supabase 연결 시) ---------- */
  function recentRow(r, first) {
    var P = window.PLAYLOG;
    var d = r.date.split('-');
    var meta = Number(d[1]) + '월 ' + Number(d[2]) + '일 · ' + r.meta;
    return '<a href="' + (P.DETAIL[r.name] || '#') + '" class="rrow' + (first ? ' first' : '') + '">' +
      '<span class="th" aria-hidden="true">' + P.thumbInner(r.name) + '</span>' +
      '<span class="row-body">' +
        '<span class="row-name">' + esc(r.name) + '</span>' +
        (r.mm ? '<span class="tag">머더미스터리</span>' : '') +
        '<span class="row-meta">' + esc(meta) + '</span>' +
      '</span>' +
      '<span class="score"><span class="star" aria-hidden="true">★</span><span class="sr">평점 </span>' + esc(r.score) + '</span>' +
    '</a>';
  }

  function loadRecent() {
    var S = window.PLAYLOG_STORE;
    var box = $('#recent-list');
    if (!S || !S.live || !box) return; // 데모 모드: 시안 그대로
    S.getUser().then(function (user) {
      if (!user) {
        box.innerHTML = '<div class="empty"><strong>내 플레이를 모아 보세요</strong>' +
          '<span>로그인하면 기록이 여기에 쌓여요</span>' +
          '<a href="login.html" class="btn-butter" style="margin-top:6px">로그인 · 회원가입</a></div>';
        return;
      }
      return S.listPlays({ limit: 3 }).then(function (list) {
        box.innerHTML = list.length
          ? list.map(function (r, i) { return recentRow(r, i === 0); }).join('')
          : '<div class="empty"><strong>아직 기록이 없어요</strong><span>오늘 한 판을 남겨 볼까요?</span>' +
            '<a href="record.html" class="btn-butter" style="margin-top:6px">첫 기록 남기기</a></div>';
      });
    }).catch(function (err) {
      box.innerHTML = '<div class="empty"><strong>기록을 불러오지 못했어요</strong><span>' + esc(S.friendly(err)) + '</span></div>';
    });
  }

  // href="#" 링크는 아직 화면이 없어서 맨 위로 튀지 않게 막음 (새로 그린 행 포함)
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href="#"]');
    if (a) e.preventDefault();
  });

  render();
  loadRecent();
})();
