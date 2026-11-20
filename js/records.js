// playlog 기록 — 달력 / 리스트 보기
(function () {
  'use strict';

  var P = window.PLAYLOG;
  var S = window.PLAYLOG_STORE;
  var WD = ['일', '월', '화', '수', '목', '금', '토'];

  var today = new Date();
  today.setHours(0, 0, 0, 0);

  var params = new URLSearchParams(location.search);
  var state = {
    view: params.get('view') === 'list' ? 'list' : 'cal',
    year: today.getFullYear(),
    month: today.getMonth(), // 0 = 1월
    sel: null
  };

  // 방금 저장하고 왔으면 그 날짜를 보여줌 (?saved=2026-11-08)
  var saved = params.get('saved');
  if (/^\d{4}-\d{2}-\d{2}$/.test(saved || '')) {
    state.year = Number(saved.slice(0, 4));
    state.month = Number(saved.slice(5, 7)) - 1;
    state.sel = Number(saved.slice(8, 10));
    params.delete('saved');
    history.replaceState(null, '', location.pathname + (params.toString() ? '?' + params : ''));
  }

  // 달별로 불러온 기록 보관 { '2026-11': [...] }
  var cache = {};
  var loadError = '';

  var $ = function (sel) { return document.querySelector(sel); };
  var gridEl = $('#cal-grid');
  var dayTitleEl = $('#day-title');
  var dayListEl = $('#day-list');
  var listPanelEl = $('#list-panel');
  var summaryEl = $('#month-summary');

  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function daysIn(y, m) { return new Date(y, m + 1, 0).getDate(); }
  function dow(y, m, d) { return new Date(y, m, d).getDay(); }

  function monthKey(y, m) { return y + '-' + pad(m + 1); }

  // 그 달 기록을 저장소에서 불러옴 (한 번 불러온 달은 다시 안 부름)
  function loadMonth(y, m) {
    var key = monthKey(y, m);
    if (cache[key]) return Promise.resolve(cache[key]);
    return S.listPlays({ from: key + '-01', to: key + '-' + pad(daysIn(y, m)) }).then(function (list) {
      cache[key] = list;
      return list;
    });
  }

  // 이번에 보는 달의 기록을 날짜별로 묶음 { 19: [...], 15: [...] }
  function byDay(y, m) {
    var map = {};
    (cache[monthKey(y, m)] || []).forEach(function (r) {
      var d = Number(r.date.slice(8, 10));
      (map[d] = map[d] || []).push(r);
    });
    return map;
  }

  // 달을 바꾸면 기본 선택 날짜: 기록이 있는 가장 최근 날 → 없으면 오늘(이번 달) → 1일
  function defaultSel(y, m, map) {
    var isThisMonth = y === today.getFullYear() && m === today.getMonth();
    var days = Object.keys(map).map(Number).filter(function (d) {
      return !isThisMonth || d <= today.getDate();
    }).sort(function (a, b) { return b - a; });
    if (days.length) return days[0];
    return isThisMonth ? today.getDate() : 1;
  }

  function renderSummary(map) {
    var days = Object.keys(map).length;
    var plays = 0;
    Object.keys(map).forEach(function (d) { plays += map[d].length; });
    var mLabel = (state.month + 1) + '월';
    if (loadError) { summaryEl.textContent = loadError; return; }
    summaryEl.textContent = plays
      ? mLabel + '에 ' + days + '일 동안 ' + plays + '판 놀았어요'
      : mLabel + '엔 아직 기록이 없어요';
  }

  function renderCalendar(map) {
    var y = state.year, m = state.month;
    var first = dow(y, m, 1);
    var total = daysIn(y, m);
    var isThisMonth = y === today.getFullYear() && m === today.getMonth();
    var html = '';
    for (var b = 0; b < first; b++) html += '<span></span>';
    for (var d = 1; d <= total; d++) {
      var list = map[d] || [];
      var lead = list[0];
      var w = dow(y, m, d);
      var cls = 'cell' + (w === 0 ? ' sun' : '') + (isThisMonth && d === today.getDate() ? ' today' : '') + (state.sel === d ? ' sel' : '');
      var aria = (m + 1) + '월 ' + d + '일 ' + WD[w] + '요일, ' + (list.length ? list.length + '판' : '기록 없음');
      html += '<button type="button" class="' + cls + '" data-day="' + d + '" aria-label="' + aria + '" aria-pressed="' + (state.sel === d) + '">' +
        '<span class="num">' + d + '</span>' +
        (lead
          ? '<span class="ct">' + P.thumbInner(lead.name) +
              (list.length > 1 ? '<span class="more-count">+' + (list.length - 1) + '</span>' : '') +
            '</span>'
          : '') +
      '</button>';
    }
    gridEl.innerHTML = html;
    $('#cal-panel').setAttribute('aria-label', y + '년 ' + (m + 1) + '월 달력');
  }

  function renderDay(map) {
    var y = state.year, m = state.month, d = state.sel;
    dayTitleEl.textContent = (m + 1) + '월 ' + d + '일 ' + WD[dow(y, m, d)] + '요일';
    var list = map[d] || [];
    if (!list.length) {
      var dateStr = monthKey(y, m) + '-' + pad(d);
      var future = new Date(y, m, d) > today;
      dayListEl.innerHTML = '<div class="day-empty"><span>' + (future ? '아직 오지 않은 날이에요' : '이날은 기록이 없어요') + '</span>' +
        (future ? '' : '<a href="record.html?date=' + dateStr + '" class="btn-butter">이날 기록 남기기</a>') + '</div>';
      return;
    }
    dayListEl.innerHTML = list.map(function (r, i) { return P.recordRow(r, i === 0); }).join('');
  }

  function renderList(map) {
    var y = state.year, m = state.month;
    var days = Object.keys(map).map(Number).sort(function (a, b) { return b - a; });
    if (!days.length) {
      listPanelEl.innerHTML = '<p class="list-empty">이 달에는 기록이 없어요</p>';
      return;
    }
    listPanelEl.innerHTML = days.map(function (d, gi) {
      return '<div>' +
        '<div class="ghead' + (gi === 0 ? ' first' : '') + '">' +
          '<strong>' + (m + 1) + '월 ' + d + '일 ' + WD[dow(y, m, d)] + '요일</strong>' +
        '</div>' +
        map[d].map(function (r, i) { return P.recordRow(r, i === 0); }).join('') +
      '</div>';
    }).join('');
    listPanelEl.setAttribute('aria-label', (m + 1) + '월 기록 목록');
  }

  // 달이 바뀌면 불러온 뒤 그림
  function load() {
    loadError = '';
    summaryEl.textContent = '불러오는 중…';
    return loadMonth(state.year, state.month)
      .catch(function (err) { loadError = '기록을 불러오지 못했어요. ' + S.friendly(err); })
      .then(render);
  }

  function render() {
    var map = byDay(state.year, state.month);
    if (state.sel === null || state.sel > daysIn(state.year, state.month)) {
      state.sel = defaultSel(state.year, state.month, map);
    }

    document.querySelectorAll('[data-month-label]').forEach(function (el) {
      el.textContent = state.year + '년 ' + (state.month + 1) + '월';
    });
    document.querySelectorAll('.vseg').forEach(function (b) {
      var on = b.dataset.view === state.view;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
    });
    $('#view-cal').hidden = state.view !== 'cal';
    $('#view-list').hidden = state.view !== 'list';

    renderSummary(map);
    if (state.view === 'cal') {
      renderCalendar(map);
      renderDay(map);
    } else {
      renderList(map);
    }
  }

  /* ---------- 이벤트 ---------- */
  document.querySelectorAll('.vseg').forEach(function (b) {
    b.addEventListener('click', function () {
      state.view = b.dataset.view;
      // 새로고침해도 보던 방식 유지
      var url = new URL(location.href);
      if (state.view === 'list') url.searchParams.set('view', 'list');
      else url.searchParams.delete('view');
      history.replaceState(null, '', url);
      render();
    });
  });

  document.querySelectorAll('[data-month]').forEach(function (b) {
    b.addEventListener('click', function () {
      var m = state.month + Number(b.dataset.month);
      state.year += Math.floor(m / 12);
      state.month = ((m % 12) + 12) % 12;
      state.sel = null;
      load();
    });
  });

  gridEl.addEventListener('click', function (e) {
    var cell = e.target.closest('[data-day]');
    if (!cell) return;
    state.sel = Number(cell.dataset.day);
    render();
    var again = gridEl.querySelector('[data-day="' + state.sel + '"]');
    if (again) again.focus();
  });

  S.requireUser().then(load);
})();
