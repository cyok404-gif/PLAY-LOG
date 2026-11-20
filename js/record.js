// playlog 기록하기 — 한 판 저장
// 게임 고르기 → 날짜 → 함께한 사람 → 사람별 점수(최고점이 승리) → 별점 → (선택) 장소·시간·사진·감상
(function () {
  'use strict';

  var S = window.PLAYLOG_STORE;
  var P = window.PLAYLOG;
  var esc = P.esc;
  var $ = function (id) { return document.getElementById(id); };

  var BOARD_GAMES = ['윙스팬', '스플렌더', '아줄', '카탄', '코드네임', '딕싯', '테라포밍 마스'];
  var MM_GAMES = ['문스톤 저택 살인 사건', '열차 7호칸', '등대지기의 편지', '축제 전야', '폐교의 졸업식', '항구 도시의 밀서'];
  var PLACES = ['집에서', '친구 집', '보드게임 카페', '머더미스터리 카페'];
  // 기록이 아직 없을 때 보여줄 게임
  var STARTER_GAMES = ['스플렌더', '윙스팬', '아줄', '코드네임'];
  var WD = ['일', '월', '화', '수', '목', '금', '토'];
  var ME = '나';
  var FRIENDS_KEY = 'playlog.friends';

  var state = {
    game: '',
    with: [ME],
    friends: loadFriends(),
    scores: {},   // { 이름: '16' } — 입력칸 그대로(문자열)
    rating: 0,    // 0 = 아직 안 고름
    recent: STARTER_GAMES.slice()
  };

  /* ---------- 함께한 사람: 이 기기에 기억 ---------- */
  function loadFriends() {
    try {
      var saved = JSON.parse(localStorage.getItem(FRIENDS_KEY) || 'null');
      if (Array.isArray(saved)) return saved.filter(function (n) { return typeof n === 'string' && n; });
    } catch (e) { /* 저장소를 못 쓰면 기본값 */ }
    return S.live ? [] : P.FRIENDS.slice();
  }
  function saveFriends() {
    try { localStorage.setItem(FRIENDS_KEY, JSON.stringify(state.friends)); } catch (e) { /* 무시 */ }
  }

  /* ---------- 날짜 ---------- */
  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function dateLabel(v) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return '날짜 고르기';
    var d = new Date(Number(v.slice(0, 4)), Number(v.slice(5, 7)) - 1, Number(v.slice(8, 10)));
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var diff = Math.round((today - d) / 86400000);
    var label = (d.getMonth() + 1) + '월 ' + d.getDate() + '일 ' + WD[d.getDay()] + '요일';
    if (d.getFullYear() !== today.getFullYear()) label = d.getFullYear() + '년 ' + label;
    return label + (diff === 0 ? ' · 오늘' : diff === 1 ? ' · 어제' : '');
  }
  function renderDate() { $('date-text').textContent = dateLabel($('date').value); }

  /* ---------- 게임 ---------- */
  var CHECK = '<span class="chk" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg></span>';

  function renderGames() {
    $('game-grid').innerHTML = state.recent.map(function (name) {
      var on = state.game === name;
      return '<button type="button" class="gcard" data-game="' + esc(name) + '" aria-pressed="' + on + '">' +
        '<span class="cv">' + P.thumbInner(name) + (on ? CHECK : '') + '</span>' +
        esc(name) +
      '</button>';
    }).join('');
  }

  /* ---------- 사람 ---------- */
  var PLUS = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 6v12M6 12h12"/></svg>';

  function renderPeople() {
    var all = [ME].concat(state.friends);
    $('people').innerHTML = all.map(function (n) {
      var on = state.with.indexOf(n) > -1;
      return '<button type="button" class="pill' + (on ? ' on' : '') + '" data-person="' + esc(n) + '" aria-pressed="' + on + '"' +
        (n === ME ? ' aria-disabled="true"' : '') + '>' + esc(n) + '</button>';
    }).join('') +
      '<button type="button" class="pill add" id="add-btn" aria-expanded="' + !$('add-person').hidden + '" aria-controls="add-person">' + PLUS + '추가</button>';
    $('people-count').textContent = '나 포함 ' + state.with.length + '명';
  }

  /* ---------- 점수 ---------- */
  var CROWN = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 8l4 3 4-6 4 6 4-3-2 10H6z"/></svg>';

  function num(v) { return v === '' || v === undefined || isNaN(Number(v)) ? null : Number(v); }

  // 사람 순서는 칩 순서(나 → 친구 순)
  function players() {
    return [ME].concat(state.friends).filter(function (n) { return state.with.indexOf(n) > -1; });
  }
  function topScore() {
    var vals = players().map(function (n) { return num(state.scores[n]); }).filter(function (v) { return v !== null; });
    return vals.length ? Math.max.apply(null, vals) : null;
  }

  function renderScores() {
    $('score-rows').innerHTML = players().map(function (n, i) {
      var id = 'score-' + i;
      return '<div class="srow' + (i === 0 ? ' first' : '') + '" data-row="' + esc(n) + '">' +
        '<span class="srow-name">' + esc(n) + '<span class="win" hidden>' + CROWN + '승리</span></span>' +
        '<label for="' + id + '"><span class="sr">' + esc(n) + ' 점수</span>' +
          '<input class="sinput" id="' + id + '" type="number" inputmode="numeric" min="0" step="1" data-score="' + esc(n) + '" value="' + esc(state.scores[n] || '') + '" placeholder="0">점' +
        '</label>' +
      '</div>';
    }).join('');
    renderWinners();
  }
  // 입력 중에는 줄을 다시 그리지 않고 승리 표시만 갱신 (포커스 유지)
  function renderWinners() {
    var top = topScore();
    $('score-rows').querySelectorAll('[data-row]').forEach(function (row) {
      var v = num(state.scores[row.dataset.row]);
      row.querySelector('.win').hidden = !(top !== null && top > 0 && v === top);
    });
  }

  /* ---------- 별점 ---------- */
  var STAR = '<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3.2l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6-4.4-4.2 6-.8z"/></svg>';
  function renderRating() {
    var html = '';
    for (var k = 1; k <= 5; k++) {
      var on = k <= state.rating;
      html += '<button type="button" class="rate-star' + (on ? ' on' : '') + '" data-rate="' + k + '" aria-label="' + k + '점" aria-pressed="' + (k === state.rating) + '">' + STAR + '</button>';
    }
    $('rate').innerHTML = html;
  }

  /* ---------- 이벤트 ---------- */
  $('game-grid').addEventListener('click', function (e) {
    var b = e.target.closest('[data-game]');
    if (!b) return;
    var name = b.dataset.game;
    state.game = state.game === name ? '' : name;
    $('game').value = '';
    $('game').removeAttribute('aria-invalid');
    renderGames();
    var again = $('game-grid').querySelector('[data-game="' + CSS.escape(name) + '"]');
    if (again) again.focus();
  });
  $('game').addEventListener('input', function () {
    state.game = this.value.trim();
    this.removeAttribute('aria-invalid');
    renderGames(); // 검색 이름이 최근 게임과 같으면 그 카드가 선택된 것으로 보임
  });

  $('date').addEventListener('change', renderDate);
  $('date').addEventListener('input', renderDate);
  // 투명한 날짜 칸 어디를 눌러도 달력이 열리게
  $('date').addEventListener('click', function () {
    if (typeof this.showPicker === 'function') { try { this.showPicker(); } catch (err) { /* 일부 브라우저는 막음 */ } }
  });

  function toggleAdd(open) {
    $('add-person').hidden = !open;
    var btn = $('add-btn');
    if (btn) btn.setAttribute('aria-expanded', String(open));
    if (open) $('new-person').focus();
  }
  function addPerson() {
    var n = $('new-person').value.trim();
    if (!n) return $('new-person').focus();
    if (n !== ME && state.friends.indexOf(n) === -1) { state.friends.push(n); saveFriends(); }
    if (state.with.indexOf(n) === -1) state.with.push(n);
    $('new-person').value = '';
    toggleAdd(false);
    renderPeople();
    renderScores();
    $('add-btn').focus();
  }

  $('people').addEventListener('click', function (e) {
    if (e.target.closest('#add-btn')) return toggleAdd($('add-person').hidden);
    var b = e.target.closest('[data-person]');
    if (!b || b.dataset.person === ME) return;
    var n = b.dataset.person;
    var i = state.with.indexOf(n);
    if (i > -1) state.with.splice(i, 1); else state.with.push(n);
    renderPeople();
    renderScores();
    var again = $('people').querySelector('[data-person="' + CSS.escape(n) + '"]');
    if (again) again.focus();
  });
  $('add-ok').addEventListener('click', addPerson);
  $('new-person').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); addPerson(); }
    if (e.key === 'Escape') { toggleAdd(false); $('add-btn').focus(); }
  });

  $('score-rows').addEventListener('input', function (e) {
    var input = e.target.closest('[data-score]');
    if (!input) return;
    state.scores[input.dataset.score] = input.value;
    renderWinners();
  });

  $('rate').addEventListener('click', function (e) {
    var b = e.target.closest('[data-rate]');
    if (!b) return;
    var k = Number(b.dataset.rate);
    state.rating = state.rating === k ? 0 : k; // 같은 별을 다시 누르면 지움
    renderRating();
    $('rate').querySelector('[data-rate="' + k + '"]').focus();
  });

  $('more-toggle').addEventListener('click', function () {
    var open = this.getAttribute('aria-expanded') !== 'true';
    this.setAttribute('aria-expanded', String(open));
    $('more-body').hidden = !open;
  });

  // 사진은 아직 서버에 올리지 않음 — 골랐다는 것만 보여줌
  $('photo').addEventListener('change', function () {
    $('photo-text').textContent = this.files && this.files.length
      ? '사진 1장 골랐어요 · 사진 저장은 곧 지원돼요'
      : '사진 추가';
  });

  // 닫기: 앱 안에서 왔으면 이전 화면으로
  $('back').addEventListener('click', function (e) {
    if (document.referrer && history.length > 1) { e.preventDefault(); history.back(); }
  });

  /* ---------- 저장 ---------- */
  // 내 점수로 결과 만들기: 최고점이면 승리, 아니면 n위
  function myResult() {
    var mine = num(state.scores[ME]);
    if (mine === null) return null;
    var higher = players().filter(function (n) {
      var v = num(state.scores[n]);
      return n !== ME && v !== null && v > mine;
    }).length;
    return higher === 0 ? '승리' : (higher + 1) + '위';
  }
  function scoreMap() {
    var out = {}, any = false;
    players().forEach(function (n) {
      var v = num(state.scores[n]);
      if (v !== null) { out[n] = v; any = true; }
    });
    return any ? out : null;
  }

  $('play-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var err = $('msg-error');
    err.hidden = true;

    var name = state.game;
    var date = $('date').value;
    if (!name) {
      err.textContent = '어떤 게임을 했는지 골라 주세요.';
      err.hidden = false;
      $('game').setAttribute('aria-invalid', 'true');
      $('game').focus();
      return;
    }
    if (!date) { err.textContent = '날짜를 골라 주세요.'; err.hidden = false; $('date').focus(); return; }

    var mins = parseInt(String($('minutes').value).replace(/[^\d]/g, ''), 10);

    var submit = $('submit');
    submit.disabled = true;
    submit.textContent = '저장 중…';

    S.addPlay({
      game_name: name,
      is_mm: MM_GAMES.indexOf(name) > -1,
      played_on: date,
      players: state.with.length,
      result: myResult(),
      place: $('place').value.trim() || null,
      rating: state.rating || null,
      memo: $('memo').value.trim() || null,
      scores: scoreMap(),
      minutes: mins > 0 ? Math.min(mins, 1440) : null
    }).then(function () {
      location.href = 'records.html?saved=' + encodeURIComponent(date);
    }).catch(function (ex) {
      err.textContent = S.friendly(ex);
      err.hidden = false;
      submit.disabled = false;
      submit.textContent = '기록 저장';
    });
  });

  /* ---------- 시작 ---------- */
  // ?date=2026-11-08 로 열면 그 날짜로 채움 (기록 화면의 "이날 기록 남기기")
  var qDate = new URLSearchParams(location.search).get('date');
  $('date').value = /^\d{4}-\d{2}-\d{2}$/.test(qDate || '') ? qDate : ymd(new Date());
  $('date').max = ymd(new Date());

  $('game-list').innerHTML = BOARD_GAMES.concat(MM_GAMES).map(function (g) { return '<option value="' + esc(g) + '">'; }).join('');
  $('place-list').innerHTML = PLACES.map(function (p) { return '<option value="' + esc(p) + '">'; }).join('');

  if (!S.live) $('demo-note').hidden = false;

  renderDate();
  renderGames();
  renderPeople();
  renderScores();
  renderRating();

  // 최근에 한 게임 4개 (기록이 없으면 기본 게임을 "많이 하는 게임"으로)
  S.requireUser()
    .then(function () { return S.listPlays({ limit: 40 }); })
    .then(function (list) {
      var seen = [];
      list.forEach(function (r) { if (seen.indexOf(r.name) === -1) seen.push(r.name); });
      if (!seen.length) { $('recent-label').textContent = '많이 하는 게임'; return; }
      state.recent = seen.slice(0, 4);
      renderGames();
    })
    .catch(function () { /* 못 불러와도 기본 게임으로 기록 가능 */ });
})();
