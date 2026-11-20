// playlog — 앱(PWA) 설치 지원: 서비스 워커 등록
(function () {
  'use strict';
  // 서비스 워커는 https 또는 localhost 에서만 동작 (파일을 더블클릭해 연 file:// 에서는 건너뜀)
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').catch(function () { /* 실패해도 사이트는 그대로 동작 */ });
  });
})();
