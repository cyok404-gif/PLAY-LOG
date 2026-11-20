// playlog 공통 데이터 · 헬퍼 (기록 · 게임 상세에서 사용)
// 지금은 시안 데이터. 나중에 DB(Supabase 등)로 옮길 때 이 파일만 바꾸면 됨.
window.PLAYLOG = (function () {
  'use strict';

  // 시안용 예시 커버. 실제 서비스에서는 게임 DB API가 돌려준 이미지 URL로 대체.
  var COVERS = {
    '윙스팬': 'assets/img/wingspan.png',
    '코드네임': 'assets/img/codenames.png',
    '테라포밍 마스': 'assets/img/terraforming-mars.png',
    '아줄': 'assets/img/azul.png',
    '스플렌더': 'assets/img/splendor.png',
    '문스톤 저택 살인 사건': 'assets/img/moonstone.png'
  };
  // 커버가 없는 게임의 타일 색
  var TILES = { '딕싯': 't-blue', '카탄': 't-sand' };
  // 상세 페이지가 있는 게임
  var DETAIL = { '윙스팬': 'game.html' };
  // 기록하기 화면 "누구랑?"의 데모용 친구 (로그인하면 직접 추가한 사람만 보임)
  var FRIENDS = ['민지', '준호', '서연', '다은'];

  // 플레이 기록 (date: YYYY-MM-DD)
  var RECORDS = [
    { date: '2026-11-19', name: '윙스팬', meta: '4명 · 승리', score: '5.0' },
    { date: '2026-11-19', name: '아줄', meta: '4명 · 2위', score: '4.5' },
    { date: '2026-11-19', name: '카탄', meta: '4명 · 승리', score: '4.0' },
    { date: '2026-11-15', name: '문스톤 저택 살인 사건', mm: true, meta: '4명 · 범인 적중', score: '3.5' },
    { date: '2026-11-14', name: '윙스팬', meta: '4명 · 승리', score: '5.0' },
    { date: '2026-11-14', name: '스플렌더', meta: '4명 · 2위', score: '4.0' },
    { date: '2026-11-08', name: '코드네임', meta: '6명 · 우리 팀 승리', score: '4.5' },
    { date: '2026-11-08', name: '딕싯', meta: '6명 · 3위', score: '4.0' },
    { date: '2026-11-07', name: '테라포밍 마스', meta: '3명 · 3위', score: '4.5' },
    { date: '2026-11-03', name: '코드네임', meta: '6명 · 상대 팀 승리', score: '4.5' },
    { date: '2026-11-01', name: '아줄', meta: '2명 · 승리', score: '4.5' },
    { date: '2026-11-01', name: '스플렌더', meta: '2명 · 1위', score: '4.0' }
  ];

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch];
    });
  }

  // 54px 썸네일 안쪽: 커버 이미지 또는 색 타일 + 첫 글자
  function thumbInner(name) {
    var cover = COVERS[name];
    if (cover) return '<img src="' + cover + '" alt="">';
    return '<span class="tile ' + (TILES[name] || 't-blue') + '">' + esc(name.slice(0, 1)) + '</span>';
  }

  // 기록 한 줄 (홈·기록 화면 공통 모양)
  function recordRow(r, first) {
    var href = DETAIL[r.name] || '#';
    return '<a href="' + href + '" class="rrow' + (first ? ' first' : '') + '">' +
      '<span class="th" aria-hidden="true">' + thumbInner(r.name) + '</span>' +
      '<span class="row-body">' +
        '<span class="row-name">' + esc(r.name) + '</span>' +
        '<span class="row-meta with-tag">' +
          (r.mm ? '<span class="tag">머더미스터리</span>' : '') + esc(r.meta) +
        '</span>' +
      '</span>' +
      '<span class="score"><span class="star" aria-hidden="true">★</span><span class="sr">평점 </span>' + esc(r.score) + '</span>' +
    '</a>';
  }

  // href="#" 링크는 아직 연결된 화면이 없으므로 페이지 맨 위로 튀지 않게 막음
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href="#"]');
    if (a) e.preventDefault();
  });

  return { COVERS: COVERS, TILES: TILES, DETAIL: DETAIL, FRIENDS: FRIENDS, RECORDS: RECORDS, esc: esc, thumbInner: thumbInner, recordRow: recordRow };
})();
