// playlog 게임 상세 — 내 플레이 펼치기/접기, 위시, 뒤로
(function () {
  'use strict';

  var esc = window.PLAYLOG.esc;
  var S = window.PLAYLOG_STORE;
  var GAME = '윙스팬';

  // 데모 모드에서 보여줄 시안 데이터
  var PLAYS = [
    { month: '11월', day: '19', result: '승리', meta: '4명 · 집에서', score: '5.0' },
    { month: '11월', day: '14', result: '승리', meta: '4명 · 보드게임 카페', score: '5.0' },
    { month: '10월', day: '27', result: '2위', meta: '3명 · 집에서', score: '4.5' },
    { month: '10월', day: '12', result: '승리', meta: '2명 · 집에서', score: '4.5' },
    { month: '9월', day: '28', result: '3위', meta: '5명 · 보드게임 카페', score: '4.0' },
    { month: '9월', day: '6', result: '승리', meta: '3명 · 친구 집', score: '5.0' }
  ];
  var SHOW = 3;
  var expanded = false;

  var playsEl = document.getElementById('plays');
  var toggleEl = document.getElementById('plays-toggle');

  var CHEVRON_RIGHT = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
  var CHEVRON_UP = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>';

  function render() {
    var shown = expanded ? PLAYS : PLAYS.slice(0, SHOW);
    playsEl.innerHTML = shown.map(function (p, i) {
      return '<a href="#" class="prow' + (i === 0 ? ' first' : '') + '">' +
        '<span class="date-chip" aria-hidden="true"><small>' + esc(p.month) + '</small><b>' + esc(p.day) + '</b></span>' +
        '<span class="sr">' + esc(p.month) + ' ' + esc(p.day) + '일 </span>' +
        '<span class="prow-body"><strong>' + esc(p.result) + '</strong><span>' + esc(p.meta) + '</span></span>' +
        '<span class="score sm"><span class="star" aria-hidden="true">★</span><span class="sr">이번 판 평점 </span>' + esc(p.score) + '</span>' +
      '</a>';
    }).join('');

    toggleEl.hidden = PLAYS.length <= SHOW;
    toggleEl.setAttribute('aria-expanded', String(expanded));
    toggleEl.innerHTML = expanded ? '접기' + CHEVRON_UP : '플레이 ' + PLAYS.length + '판 모두 보기' + CHEVRON_RIGHT;
  }

  toggleEl.addEventListener('click', function () {
    expanded = !expanded;
    render();
  });

  // 위시 토글
  var wish = document.getElementById('wish');
  wish.addEventListener('click', function () {
    var on = wish.getAttribute('aria-pressed') !== 'true';
    wish.setAttribute('aria-pressed', String(on));
    wish.setAttribute('aria-label', on ? '위시에서 빼기' : '위시에 담기');
  });

  // 뒤로: 앱 안에서 들어왔으면 이전 화면으로, 아니면 홈으로
  document.getElementById('back').addEventListener('click', function (e) {
    if (document.referrer && new URL(document.referrer).origin === location.origin && history.length > 1) {
      e.preventDefault();
      history.back();
    }
  });

  /* ---------- 내 실제 기록 (Supabase 연결 시) ---------- */
  var WIN = /승리|1위|적중|탈출 성공/;

  function fromRecords(list) {
    return list.map(function (r) {
      var d = r.date.split('-');
      return {
        month: Number(d[1]) + '월', day: String(Number(d[2])),
        result: r.result || '기록',
        meta: [r.players ? r.players + '명' : '', r.place].filter(Boolean).join(' · ') || '—',
        score: r.score
      };
    });
  }

  function summarize(list) {
    var rated = list.filter(function (r) { return r.rating !== null; });
    var avg = rated.length ? rated.reduce(function (s, r) { return s + r.rating; }, 0) / rated.length : null;
    var wins = list.filter(function (r) { return WIN.test(r.result); }).length;
    var last = list[0].date.split('-');
    document.querySelector('.my-summary').textContent =
      list.length + '판 · ' + wins + '승 · 마지막 플레이 ' + Number(last[1]) + '월 ' + Number(last[2]) + '일';
    document.querySelector('.my-rating').innerHTML = '내 평점 <span class="star" aria-hidden="true">★</span>' +
      (avg === null ? '–' : (Math.round(avg * 2) / 2).toFixed(1));
  }

  function emptyState(title, sub, href, label) {
    document.querySelector('.my-summary').textContent = sub;
    document.querySelector('.my-rating').hidden = true;
    playsEl.innerHTML = '<div class="day-empty"><span>' + esc(title) + '</span>' +
      '<a href="' + href + '" class="btn-butter">' + esc(label) + '</a></div>';
    toggleEl.hidden = true;
  }

  if (!S.live) {
    render();
  } else {
    playsEl.innerHTML = '<p class="list-empty">불러오는 중…</p>';
    S.getUser().then(function (user) {
      if (!user) return emptyState('로그인하면 내 플레이가 보여요', '아직 로그인하지 않았어요', 'login.html?next=game.html', '로그인');
      return S.listPlays({ game: GAME }).then(function (list) {
        if (!list.length) return emptyState('아직 ' + GAME + ' 기록이 없어요', '첫 판을 기록해 보세요', 'record.html', '기록 남기기');
        PLAYS = fromRecords(list);
        summarize(list);
        render();
      });
    }).catch(function (err) {
      playsEl.innerHTML = '<p class="list-empty">기록을 불러오지 못했어요. ' + esc(S.friendly(err)) + '</p>';
      toggleEl.hidden = true;
    });
  }
})();
