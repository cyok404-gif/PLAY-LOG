// playlog — 데이터 저장소
// config.js 에 Supabase 정보가 있으면 Supabase(로그인 + DB)를, 없으면 예시 데이터(데모 모드)를 씀.
// 화면 코드는 이 파일의 함수만 부르면 되고, 어디에 저장되는지는 몰라도 됨.
window.PLAYLOG_STORE = (function () {
  'use strict';

  var cfg = window.PLAYLOG_CONFIG || {};
  var live = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase);
  var client = live ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;

  // DB 한 줄 → 화면에서 쓰는 모양
  function toRecord(row) {
    var meta = [row.players ? row.players + '명' : '', row.result || ''].filter(Boolean).join(' · ');
    return {
      id: row.id,
      date: row.played_on,
      name: row.game_name,
      mm: !!row.is_mm,
      players: row.players,
      result: row.result || '',
      place: row.place || '',
      memo: row.memo || '',
      rating: row.rating === null || row.rating === undefined ? null : Number(row.rating),
      meta: meta || '기록',
      score: row.rating === null || row.rating === undefined ? '–' : Number(row.rating).toFixed(1)
    };
  }

  function demoRecords() {
    return (window.PLAYLOG ? window.PLAYLOG.RECORDS : []).map(function (r, i) {
      return Object.assign({ id: 'demo-' + i }, r);
    });
  }

  function loginUrl() {
    var here = location.pathname.split('/').pop() + location.search;
    return 'login.html?next=' + encodeURIComponent(here || 'index.html');
  }

  // 한국어 오류 메시지
  function friendly(err) {
    var m = (err && err.message) || String(err || '');
    if (/Invalid login credentials/i.test(m)) return '이메일 또는 비밀번호가 맞지 않아요.';
    if (/Email not confirmed/i.test(m)) return '메일함에서 인증 링크를 먼저 눌러 주세요.';
    if (/User already registered/i.test(m)) return '이미 가입된 이메일이에요. 로그인해 주세요.';
    if (/Password should be at least/i.test(m)) return '비밀번호는 6자 이상이어야 해요.';
    if (/rate limit/i.test(m)) return '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.';
    if (/Failed to fetch|NetworkError/i.test(m)) return '서버에 연결할 수 없어요. 인터넷 연결을 확인해 주세요.';
    if (/provider is not enabled|Unsupported provider/i.test(m)) return 'Supabase에서 카카오 로그인이 아직 켜져 있지 않아요.';
    if (/access_denied|cancel/i.test(m)) return '카카오 로그인을 취소했어요.';
    if (/email/i.test(m) && /missing|provider|required/i.test(m)) return '카카오에서 이메일을 받지 못했어요. 카카오 동의 항목에서 이메일을 켜 주세요.';
    return m || '문제가 생겼어요. 다시 시도해 주세요.';
  }

  return {
    live: live,
    client: client,
    friendly: friendly,

    /* ---------- 로그인 ---------- */
    getUser: function () {
      if (!live) return Promise.resolve(null);
      return client.auth.getSession().then(function (res) {
        return res.data.session ? res.data.session.user : null;
      });
    },
    // 로그인이 필요한 화면에서 호출. 로그인 안 했으면 로그인 화면으로 보냄.
    requireUser: function () {
      return this.getUser().then(function (user) {
        if (live && !user) {
          location.replace(loginUrl());
          return new Promise(function () {}); // 이동하는 동안 아래 코드 멈춤
        }
        return user;
      });
    },
    signIn: function (email, password) {
      return client.auth.signInWithPassword({ email: email, password: password }).then(function (res) {
        if (res.error) throw res.error;
        return res.data;
      });
    },
    signUp: function (email, password, nickname) {
      var redirect = location.protocol.indexOf('http') === 0 ? location.href.split('?')[0] : undefined;
      return client.auth.signUp({
        email: email,
        password: password,
        options: { data: { nickname: nickname }, emailRedirectTo: redirect }
      }).then(function (res) {
        if (res.error) throw res.error;
        return res.data; // data.session 이 없으면 메일 인증 대기
      });
    },
    // 소셜 로그인 (지금은 카카오): 카카오 화면으로 갔다가 redirectTo 주소로 돌아옴. 처음이면 자동 가입.
    // 파일을 더블클릭해 연 file:// 주소로는 돌아올 수 없어서 http(s) 주소에서만 동작.
    canOAuth: function () { return location.protocol === 'http:' || location.protocol === 'https:'; },
    signInWithProvider: function (provider, next) {
      var back = location.origin + location.pathname.replace(/[^/]*$/, '') + 'login.html' +
        (next ? '?next=' + encodeURIComponent(next) : '');
      return client.auth.signInWithOAuth({
        provider: provider,
        options: { redirectTo: back }
      }).then(function (res) {
        if (res.error) throw res.error;
      });
    },
    // 닉네임: 직접 정한 것 → 구글 이름 → 이메일 앞부분
    displayName: function (user) {
      var m = (user && user.user_metadata) || {};
      return m.nickname || m.full_name || m.name || (user && user.email ? user.email.split('@')[0] : '');
    },
    signOut: function () {
      if (!live) return Promise.resolve();
      return client.auth.signOut();
    },

    /* ---------- 플레이 기록 ---------- */
    // opts: { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD', game: '윙스팬', limit: 3 }
    listPlays: function (opts) {
      opts = opts || {};
      if (!live) {
        var list = demoRecords().filter(function (r) {
          return (!opts.from || r.date >= opts.from) && (!opts.to || r.date <= opts.to) && (!opts.game || r.name === opts.game);
        });
        return Promise.resolve(opts.limit ? list.slice(0, opts.limit) : list);
      }
      var q = client.from('plays')
        .select('id, game_name, is_mm, played_on, players, result, place, rating, memo')
        .order('played_on', { ascending: false })
        .order('created_at', { ascending: false });
      if (opts.from) q = q.gte('played_on', opts.from);
      if (opts.to) q = q.lte('played_on', opts.to);
      if (opts.game) q = q.eq('game_name', opts.game);
      if (opts.limit) q = q.limit(opts.limit);
      return q.then(function (res) {
        if (res.error) throw res.error;
        return res.data.map(toRecord);
      });
    },
    // play: { game_name, is_mm, played_on, players, result, place, rating, memo, scores, minutes }
    addPlay: function (play) {
      if (!live) return Promise.reject(new Error('지금은 데모 모드예요. Supabase를 연결하면 저장할 수 있어요.'));
      function insert(row) {
        return client.from('plays').insert(row).select().single().then(function (res) {
          if (res.error) throw res.error;
          return toRecord(res.data);
        });
      }
      return insert(play).catch(function (err) {
        // DB에 scores · minutes 칸을 아직 안 만들었으면(schema.sql 다시 실행 전) 그 둘만 빼고 저장
        if (!/scores|minutes/.test((err && err.message) || '')) throw err;
        var rest = Object.assign({}, play);
        delete rest.scores;
        delete rest.minutes;
        return insert(rest);
      });
    },
    deletePlay: function (id) {
      if (!live) return Promise.reject(new Error('지금은 데모 모드예요.'));
      return client.from('plays').delete().eq('id', id).then(function (res) {
        if (res.error) throw res.error;
      });
    }
  };
})();
