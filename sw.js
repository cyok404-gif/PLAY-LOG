// playlog 서비스 워커 — 앱처럼 빨리 열리고, 인터넷이 끊겨도 화면은 뜨게 함
// 파일을 고쳐서 배포할 때마다 VERSION 숫자를 올려 주세요. (그래야 폰에 새 파일이 받아짐)
var VERSION = 'playlog-v3';

// 처음 설치할 때 미리 받아 둘 파일
var CORE = [
  './', 'index.html', 'records.html', 'record.html', 'game.html', 'login.html', 'profile.html',
  'css/style.css', 'css/pages.css', 'css/forms.css',
  'js/config.js', 'js/data.js', 'js/store.js', 'js/menu.js',
  'js/app.js', 'js/records.js', 'js/record.js', 'js/game.js', 'js/login.js', 'js/profile.js', 'js/pwa.js',
  'manifest.webmanifest', 'assets/icons/icon-192.png', 'assets/icons/icon.svg'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(VERSION).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); })
  );
});

// 예전 버전 캐시 정리
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);

  // 로그인·기록 데이터(Supabase)는 절대 캐시하지 않음 — 항상 서버에서
  if (url.hostname.endsWith('supabase.co')) return;

  // 페이지(HTML): 인터넷 먼저, 안 되면 저장해 둔 것
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').indexOf('text/html') > -1) {
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(VERSION).then(function (c) { c.put(req, copy); });
        return res;
      }).catch(function () {
        return caches.match(req, { ignoreSearch: true }).then(function (hit) { return hit || caches.match('index.html'); });
      })
    );
    return;
  }

  // 같은 사이트의 CSS·JS·이미지·글꼴, 그리고 글꼴·라이브러리 CDN: 저장해 둔 것 먼저 보여주고 뒤에서 새로 받아 둠
  var sameSite = url.origin === self.location.origin;
  var cdn = /(^|\.)(fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net)$/.test(url.hostname);
  if (!sameSite && !cdn) return;

  e.respondWith(
    caches.open(VERSION).then(function (c) {
      return c.match(req).then(function (hit) {
        var fresh = fetch(req).then(function (res) {
          if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone());
          return res;
        }).catch(function () { return hit; });
        return hit || fresh;
      });
    })
  );
});
