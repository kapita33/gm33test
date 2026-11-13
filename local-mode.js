// local-mode.js - 100% local. Sem fetch real, sem XHR real, sem WebSocket real.
// Tudo servido do localStorage. Login automatico.
(function () {
  if (window.__LOCAL_MODE__) return;
  window.__LOCAL_MODE__ = true;

  // ============================================================
  // 1) USUARIO PADRAO E ESTADO INICIAL
  // ============================================================
  var USER = {
    id: 'local-1',
    _id: 'local-1',
    nome: 'admin',
    username: 'admin',
    login: 'admin',
    email: 'admin@local',
    role: 'admin',
    isAdmin: true,
    admin: true,
    nivel: 1,
    level: 1,
    xp: 0,
    exp: 0,
    ouro: 1000,
    gold: 1000,
    coins: 1000,
    gemas: 100,
    gems: 100,
    diamantes: 100,
    campeao: 'Campeao53',
    champion: 'Campeao53',
    personagens: [{ id: 1, nome: 'Campeao53', campeao: 'Campeao53', nivel: 1 }],
    champions: [{ id: 1, nome: 'Campeao53', campeao: 'Campeao53', nivel: 1 }],
    inventario: [],
    inventory: [],
    missoes: {},
    quests: {},
    conquistas: {},
    achievements: {},
    rank: { elo: 'Ferro', pontos: 0 },
    elo: 'Ferro',
    createdAt: Date.now(),
    created_at: Date.now(),
    token: 'local-token-abc',
    jwt: 'local-token-abc'
  };

  function loadState() {
    try { return JSON.parse(localStorage.getItem('local_state') || '{}'); }
    catch (e) { return {}; }
  }
  function saveState(s) {
    try { localStorage.setItem('local_state', JSON.stringify(s)); } catch (e) {}
  }
  function ensureState() {
    var s = loadState();
    if (!s.eu) { s.eu = USER; saveState(s); }
    return s;
  }
  ensureState();

  // ============================================================
  // 2) PRE-POPULA localStorage (o jogo procura em varios lugares)
  // ============================================================
  try {
    var KEYS = {
      token: 'local-token-abc',
      jwt: 'local-token-abc',
      auth: 'local-token-abc',
      authToken: 'local-token-abc',
      access_token: 'local-token-abc',
      'auth-token': 'local-token-abc',
      usuario: JSON.stringify(USER),
      user: JSON.stringify(USER),
      eu: JSON.stringify(USER),
      jogador: JSON.stringify(USER),
      player: JSON.stringify(USER),
      session: JSON.stringify({ token: 'local-token-abc', user: USER }),
      sessao: JSON.stringify({ token: 'local-token-abc', usuario: USER }),
      logged_in: '1',
      isLoggedIn: 'true',
      logado: 'true'
    };
    Object.keys(KEYS).forEach(function (k) {
      try { if (!localStorage.getItem(k)) localStorage.setItem(k, KEYS[k]); } catch (e) {}
    });
  } catch (e) {}

  // ============================================================
  // 3) RESPOSTAS PADRAO (permissivas)
  // ============================================================
  function ok(data) {
    // Envelopa o dado em TODOS os formatos que o jogo possa esperar
    var base = (data && typeof data === 'object') ? data : {};
    return Object.assign({}, USER, base, {
      ok: true,
      success: true,
      status: 'ok',
      error: null,
      message: null,
      token: 'local-token-abc',
      jwt: 'local-token-abc',
      access_token: 'local-token-abc',
      usuario: Object.assign({}, USER, base),
      user: Object.assign({}, USER, base),
      eu: Object.assign({}, USER, base),
      jogador: Object.assign({}, USER, base),
      player: Object.assign({}, USER, base),
      data: Object.assign({}, USER, base),
      resultado: Object.assign({}, USER, base)
    });
  }

  // ============================================================
  // 4) RESPOSTA PARA CADA TIPO DE ROTA (mais especifica primeiro)
  // ============================================================
  function respond(path, method, bodyStr) {
    var lc = path.toLowerCase();

    // login/auth/registro/entrar
    if (/login|auth|entrar|registr|cadastr|signin|signup|session|sessao|token/.test(lc)) {
      return ok({});
    }
    // eu/perfil/me/user
    if (/\/eu|\/me\/|perfil|profile|\/user\b|usuario|jogador|player/.test(lc)) {
      var s = ensureState();
      return Object.assign(ok(s.eu || USER), s.eu || USER);
    }
    // salvar estado
    if (/save|salvar|persist|estado|state|progress|progresso/.test(lc)) {
      try {
        var parsed = JSON.parse(bodyStr || '{}');
        var s = loadState();
        if (parsed && parsed.eu) s.eu = parsed.eu;
        else if (parsed && parsed.estado) s.eu = parsed.estado;
        else if (parsed && parsed.state) s.eu = parsed.state;
        else if (parsed && Object.keys(parsed).length) s.eu = Object.assign({}, s.eu, parsed);
        saveState(s);
      } catch (e) {}
      return { ok: true, success: true, saved: true };
    }
    // listas vazias
    if (/ranking|leaderboard|mercado|market|marketplace|guilda|guild|clan|amigos|friends|chat|mensagens|messages|historico|history|notificac|notification/.test(lc)) {
      return { ok: true, success: true, data: [], items: [], lista: [], resultados: [], total: 0 };
    }
    // eventos/missoes/loja
    if (/evento|event|missao|mission|quest|loja|shop|store|temporada|season|battlepass|pass/.test(lc)) {
      return { ok: true, success: true, data: [], items: [], lista: [], resultados: [] };
    }
    // config
    if (/config|settings|versao|version|terms|termos/.test(lc)) {
      return Object.assign(ok({}), {
        versao: 'local-1.0', version: 'local-1.0', versaoJogo: 'local-1.0',
        termos: { versao: '1.0', aceito: true, bloqueado: false },
        manutencao: false, maintenance: false
      });
    }
    // fallback: usuario admin completo
    return ok({});
  }

  // ============================================================
  // 5) MOCK DE FETCH
  // ============================================================
  var realFetch = window.fetch ? window.fetch.bind(window) : null;
  window.fetch = function (input, init) {
    init = init || {};
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    var path = url;
    try { if (/^https?:/.test(url)) path = new URL(url).pathname; } catch (e) {}
    var method = (init.method || (input && input.method) || 'GET').toUpperCase();
    var body = init.body ? String(init.body) : '';

    // Bloqueia TUDO que é externo/API
    var isApi = /\/api\//.test(path) || /\/cdn-cgi\//.test(path) ||
                /^https?:\/\/(?!localhost|127\.0\.0\.1)/.test(url);
    if (isApi) {
      var data = respond(path, method, body);
      return Promise.resolve(new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    // arquivos estaticos: deixa passar pelo servidor real
    if (realFetch) return realFetch(input, init);
    return Promise.resolve(new Response('', { status: 200 }));
  };

  // ============================================================
  // 6) MOCK DE XMLHttpRequest (axios, jQuery, etc usam isso)
  // ============================================================
  var RealXHR = window.XMLHttpRequest;
  function FakeXHR() {
    this.readyState = 0;
    this.status = 0;
    this.statusText = '';
    this.response = '';
    this.responseText = '';
    this.responseType = '';
    this._url = '';
    this._method = 'GET';
    this.onreadystatechange = null;
    this.onload = null;
    this.onerror = null;
    this.ontimeout = null;
    this.onabort = null;
    this._listeners = {};
    this._async = true;
  }
  FakeXHR.prototype.open = function (method, url, async) {
    this._method = (method || 'GET').toUpperCase();
    this._url = url || '';
    this._async = async !== false;
    this.readyState = 1;
    this._fire('readystatechange');
  };
  FakeXHR.prototype.setRequestHeader = function () {};
  FakeXHR.prototype.getAllResponseHeaders = function () { return 'content-type: application/json\r\n'; };
  FakeXHR.prototype.getResponseHeader = function (n) {
    return String(n).toLowerCase() === 'content-type' ? 'application/json' : null;
  };
  FakeXHR.prototype.addEventListener = function (type, fn) {
    if (!this._listeners[type]) this._listeners[type] = [];
    this._listeners[type].push(fn);
  };
  FakeXHR.prototype.removeEventListener = function (type, fn) {
    if (this._listeners[type]) this._listeners[type] = this._listeners[type].filter(function (f) { return f !== fn; });
  };
  FakeXHR.prototype._fire = function (type) {
    var ev = { type: type, target: this };
    var handler = this['on' + type];
    if (typeof handler === 'function') { try { handler.call(this, ev); } catch (e) {} }
    (this._listeners[type] || []).forEach(function (fn) { try { fn.call(this, ev); } catch (e) {} }, this);
  };
  FakeXHR.prototype.send = function (body) {
    var self = this;
    var path = self._url;
    try { if (/^https?:/.test(path)) path = new URL(path).pathname; } catch (e) {}

    var data = respond(path, self._method, body ? String(body) : '');
    var json = JSON.stringify(data);

    setTimeout(function () {
      self.status = 200;
      self.statusText = 'OK';
      self.responseText = json;
      self.response = self.responseType === 'json' ? data : json;
      self.readyState = 4;
      self._fire('readystatechange');
      self._fire('load');
      self._fire('loadend');
    }, 0);
  };
  FakeXHR.prototype.abort = function () { this.readyState = 0; };
  window.XMLHttpRequest = FakeXHR;

  // ============================================================
  // 7) MOCK DE WebSocket
  // ============================================================
  function FakeWS(url) {
    this.url = url;
    this.readyState = 1;
    this.onopen = this.onmessage = this.onerror = this.onclose = null;
    this._listeners = {};
    var self = this;
    setTimeout(function () {
      var ev = { type: 'open', target: self };
      if (self.onopen) try { self.onopen(ev); } catch (e) {}
      (self._listeners['open'] || []).forEach(function (fn) { try { fn(ev); } catch (e) {} });
    }, 0);
  }
  FakeWS.prototype.send = function () {};
  FakeWS.prototype.close = function () {
    this.readyState = 3;
    var ev = { type: 'close', target: this };
    if (this.onclose) try { this.onclose(ev); } catch (e) {}
    (this._listeners['close'] || []).forEach(function (fn) { try { fn(ev); } catch (e) {} });
  };
  FakeWS.prototype.addEventListener = function (t, fn) {
    if (t === 'open') this.onopen = fn;
    else if (t === 'message') this.onmessage = fn;
    else if (t === 'close') this.onclose = fn;
    else if (t === 'error') this.onerror = fn;
    if (!this._listeners[t]) this._listeners[t] = [];
    this._listeners[t].push(fn);
  };
  FakeWS.prototype.removeEventListener = function (t, fn) {
    if (this._listeners[t]) this._listeners[t] = this._listeners[t].filter(function (f) { return f !== fn; });
  };
  window.WebSocket = FakeWS;
  window.WebSocket.OPEN = 1;
  window.WebSocket.CLOSED = 3;

  // ============================================================
  // 8) DIAGNOSTICO LEVE (so avisa, nao trava)
  // ============================================================
  try {
    var _qs = document.querySelector.bind(document);
    document.querySelector = function (s) {
      var r = _qs(s);
      if (r === null) console.warn('[DOM] faltando:', s);
      return r;
    };
  } catch (e) {}

  console.log('[local-mode] ATIVO — fetch, XHR e WebSocket 100% locais. Login: admin/admin');
})();