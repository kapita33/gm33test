// offline-shim.js v7 — igual v6 + registra chamadas em window.__CALLS__
(function () {
  'use strict';

  window.__CALLS__ = [];   // registro de tudo que o bundle pediu

  var errBox = null;
  function showError(title, detail) {
    try {
      if (!errBox) {
        errBox = document.createElement('div');
        errBox.id = '__erro_visor';
        errBox.style.cssText = 'position:fixed;top:10px;left:10px;right:10px;max-height:70vh;background:#2a0a0a;color:#ffd7d7;font:13px/1.4 Consolas,monospace;padding:12px;border:2px solid #ff4040;border-radius:6px;z-index:2147483647;overflow:auto;white-space:pre-wrap;word-break:break-word;box-shadow:0 4px 20px rgba(0,0,0,.6)';
        document.body.appendChild(errBox);
      }
      errBox.textContent = (errBox.textContent ? errBox.textContent + '\n\n────────\n\n' : '') + '❌ ' + title + '\n\n' + detail;
    } catch (e) {}
  }
  window.addEventListener('error', function (ev) {
    if (!ev || !ev.message) return;
    if (ev.filename && ev.filename.indexOf('offline-shim') !== -1) return;
    showError('Erro em ' + (ev.filename || '?') + ':' + (ev.lineno || '?'),
      ev.message + (ev.error && ev.error.stack ? '\n\n' + ev.error.stack : ''));
  });
  window.addEventListener('unhandledrejection', function (ev) {
    var r = ev.reason;
    showError('Promise rejeitada',
      (r && r.message ? r.message : String(r)) + (r && r.stack ? '\n\n' + r.stack : ''));
  });

  var styleEl = document.createElement('style');
  styleEl.textContent = '#tela-entrada { display:none !important; visibility:hidden !important; pointer-events:none !important; }';
  if (document.head) document.head.appendChild(styleEl);
  else document.addEventListener('DOMContentLoaded', function () { document.head.appendChild(styleEl); });

  var USER = {
    id: 1, _id: 'offline-1',
    nome: 'admin', username: 'admin', login: 'admin', nick: 'admin',
    email: 'admin@admin', role: 'admin', isAdmin: true, admin: true, vip: true,
    nivel: 1, level: 1, xp: 0, exp: 0,
    ouro: 1000, gold: 1000, coins: 1000,
    gemas: 100, gems: 100, diamantes: 100,
    campeao: 'darius', champion: 'darius',
    personagens: [{ id: 1, nome: 'Darius', campeao: 'darius', nivel: 1 }],
    champions: [{ id: 1, nome: 'Darius', campeao: 'darius', nivel: 1 }],
    inventario: [], inventory: [],
    missoes: {}, quests: {}, conquistas: {}, achievements: {},
    rank: { elo: 'Ferro', pontos: 0 }, elo: 'Ferro',
    token: 'offline-token-abc', jwt: 'offline-token-abc'
  };

  [localStorage, sessionStorage].forEach(function (s) {
    try {
      s.setItem('token', 'offline-token-abc');
      s.setItem('jwt', 'offline-token-abc');
      s.setItem('usuario', JSON.stringify(USER));
      s.setItem('user', JSON.stringify(USER));
      s.setItem('eu', JSON.stringify(USER));
      s.setItem('logged_in', '1');
      s.setItem('isLoggedIn', 'true');
      s.setItem('logado', 'true');
      s.setItem('arena_offline_state', JSON.stringify({ eu: USER }));
    } catch (e) {}
  });
  try { document.cookie = 'token=offline-token-abc; path=/'; } catch (e) {}

  window.__JOGO_ESTADO__ = USER;

  function ok(data) {
    var base = Object.assign({}, USER, data || {});
    return Object.assign({}, base, {
      ok: true, success: true, status: 'ok',
      token: 'offline-token-abc', jwt: 'offline-token-abc',
      usuario: base, user: base, eu: base, data: base
    });
  }

  function respond(path, body) {
    var lc = (path || '').toLowerCase();
    if (/save|salvar|persist|estado/.test(lc)) {
      try {
        var p = JSON.parse(body || '{}');
        var st = {};
        try { st = JSON.parse(localStorage.getItem('arena_offline_state') || '{}'); } catch (e) {}
        st.eu = p.eu || p.estado || p.state || st.eu;
        localStorage.setItem('arena_offline_state', JSON.stringify(st));
      } catch (e) {}
      return { ok: true, success: true, saved: true };
    }
    if (/ranking|mercado|guilda|amigos|chat|historico|notificac|evento|missao|loja|temporada|dungeon|arena|pvp|online/.test(lc)) {
      return { ok: true, success: true, data: [], items: [], lista: [], resultados: [], partidas: [], total: 0, online: 0 };
    }
    if (/config|settings|versao|version|terms|termos/.test(lc)) {
      return Object.assign(ok({}), {
        versao: 'local-1.0', versaoJogo: 'local-1.0',
        termos: { versao: '1.0', aceito: true, bloqueado: false },
        manutencao: false
      });
    }
    return ok({});
  }

  var realFetch = window.fetch ? window.fetch.bind(window) : null;
  window.fetch = function (input, init) {
    init = init || {};
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    var path = url;
    try { if (/^https?:/.test(url)) path = new URL(url).pathname; } catch (e) {}
    var method = (init.method || 'GET').toUpperCase();
    if (/\/api\//.test(path) || /\/cdn-cgi\//.test(path) || /^https?:\/\/(?!localhost|127\.0\.0\.1)/.test(url)) {
      var data = respond(path, init.body ? String(init.body) : '');
      // REGISTRA
      try {
        window.__CALLS__.push({ t: Date.now(), method: method, path: path, resp: data, source: 'fetch' });
      } catch (e) {}
      return Promise.resolve(new Response(JSON.stringify(data), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      }));
    }
    if (realFetch) return realFetch(input, init);
    return Promise.resolve(new Response('', { status: 200 }));
  };

  function FakeXHR() {
    this.readyState = 0; this.status = 0;
    this.response = ''; this.responseText = ''; this.responseType = '';
    this._url = ''; this._method = 'GET';
    this.onreadystatechange = this.onload = this.onerror = this.onabort = null;
    this._listeners = {};
  }
  FakeXHR.prototype.open = function (m, u) {
    this._method = (m || 'GET').toUpperCase();
    this._url = u || '';
    this.readyState = 1;
    this._fire('readystatechange');
  };
  FakeXHR.prototype.setRequestHeader = function () {};
  FakeXHR.prototype.getAllResponseHeaders = function () { return 'content-type: application/json\r\n'; };
  FakeXHR.prototype.getResponseHeader = function () { return 'application/json'; };
  FakeXHR.prototype.addEventListener = function (t, f) {
    if (!this._listeners[t]) this._listeners[t] = [];
    this._listeners[t].push(f);
  };
  FakeXHR.prototype.removeEventListener = function () {};
  FakeXHR.prototype._fire = function (t) {
    var ev = { type: t, target: this };
    var h = this['on' + t];
    if (typeof h === 'function') try { h.call(this, ev); } catch (e) {}
    (this._listeners[t] || []).forEach(function (f) { try { f.call(this, ev); } catch (e) {} }, this);
  };
  FakeXHR.prototype.send = function (body) {
    var self = this;
    var path = self._url;
    try { if (/^https?:/.test(path)) path = new URL(path).pathname; } catch (e) {}
    var data = respond(path, body ? String(body) : '');
    try {
      window.__CALLS__.push({ t: Date.now(), method: self._method, path: path, resp: data, source: 'xhr' });
    } catch (e) {}
    var json = JSON.stringify(data);
    setTimeout(function () {
      self.status = 200;
      self.responseText = json;
      self.response = self.responseType === 'json' ? data : json;
      self.readyState = 4;
      self._fire('readystatechange');
      self._fire('load');
    }, 0);
  };
  FakeXHR.prototype.abort = function () {};
  window.XMLHttpRequest = FakeXHR;

  function FakeWS(url) {
    this.url = url; this.readyState = 1;
    this.onopen = this.onmessage = this.onerror = this.onclose = null;
    this._listeners = {};
    var self = this;
    try { window.__CALLS__.push({ t: Date.now(), method: 'WS', path: url, resp: '(aberto)', source: 'ws' }); } catch (e) {}
    setTimeout(function () {
      var ev = { type: 'open', target: self };
      if (self.onopen) try { self.onopen(ev); } catch (e) {}
      (self._listeners['open'] || []).forEach(function (f) { try { f(ev); } catch (e) {} });
    }, 0);
  }
  FakeWS.prototype.send = function (d) {
    try { window.__CALLS__.push({ t: Date.now(), method: 'WS.send', path: this.url, resp: String(d).slice(0, 120), source: 'ws' }); } catch (e) {}
  };
  FakeWS.prototype.close = function () {
    this.readyState = 3;
    var ev = { type: 'close', target: this };
    if (this.onclose) try { this.onclose(ev); } catch (e) {}
  };
  FakeWS.prototype.addEventListener = function (t, f) {
    if (!this._listeners[t]) this._listeners[t] = [];
    this._listeners[t].push(f);
  };
  FakeWS.prototype.removeEventListener = function () {};
  window.WebSocket = FakeWS;
  window.WebSocket.OPEN = 1;
  window.WebSocket.CLOSED = 3;

  function hideLogin() {
    var el = document.getElementById('tela-entrada');
    if (el) {
      el.hidden = true;
      el.setAttribute('hidden', '');
      el.style.setProperty('display', 'none', 'important');
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      hideLogin(); setTimeout(hideLogin, 500); setTimeout(hideLogin, 1500);
    });
  } else {
    hideLogin(); setTimeout(hideLogin, 500); setTimeout(hideLogin, 1500);
  }

  console.log('[offline-shim v7] ativo — chamadas registradas em window.__CALLS__');
})();