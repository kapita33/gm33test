// auto-login.js v2 - preenche, clica, esconde login a forca
(function () {
  function log(m) { console.log('[auto] ' + m); }

  function setVal(el, v) {
    var proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    var d = Object.getOwnPropertyDescriptor(proto, 'value');
    if (d && d.set) d.set.call(el, v); else el.value = v;
    ['input', 'change', 'blur', 'keyup'].forEach(function (ev) {
      el.dispatchEvent(new Event(ev, { bubbles: true }));
    });
  }

  function hideLoginForever() {
    var ids = ['tela-entrada', 'tela-login', 'login', 'entrada', 'modal-login'];
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) { el.style.display = 'none'; el.setAttribute('hidden', ''); }
    });
    // por classe tambem
    document.querySelectorAll('[class*="login"], [class*="entrada"], [class*="auth"]').forEach(function (el) {
      if (el.offsetParent !== null) { el.style.display = 'none'; }
    });
  }

  function tryLogin() {
    var root = document.getElementById('tela-entrada') || document.body;
    var inputs = root.querySelectorAll('input');
    var user = null, pass = null;

    for (var i = 0; i < inputs.length; i++) {
      var inp = inputs[i];
      var t = (inp.type || '').toLowerCase();
      if (t === 'password') { if (!pass) pass = inp; continue; }
      if (t === 'text' || t === 'email' || t === '') { if (!user) user = inp; }
    }

    var did = false;
    if (user) { setVal(user, 'admin'); log('user=admin'); did = true; }
    if (pass) { setVal(pass, 'admin'); log('pass=admin'); did = true; }

    var btns = root.querySelectorAll('button, [role="button"], input[type="submit"], .btn');
    for (var j = 0; j < btns.length; j++) {
      var b = btns[j];
      var txt = (b.textContent || b.value || '').toLowerCase();
      if (/entrar|login|jogar|iniciar|acessar|continuar|come[çc]ar|start|play|confirmar|ok|aceitar|submit/.test(txt) || b.type === 'submit') {
        log('click ' + (txt.trim() || b.className));
        b.click();
        did = true;
        break;
      }
    }
    if (!did) {
      var form = root.querySelector('form');
      if (form) {
        log('submit form');
        if (form.requestSubmit) form.requestSubmit();
        else form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        did = true;
      }
    }
    return did;
  }

  log('iniciado');
  var n = 0;
  var iv = setInterval(function () {
    n++;
    var te = document.getElementById('tela-entrada') || document.getElementById('tela-login');
    var visible = te && te.offsetParent !== null && te.style.display !== 'none';

    if (visible || n === 1) {
      if (tryLogin()) {
        // aguarda 1.5s e forca esconder se ainda estiver visivel
        setTimeout(function () {
          var still = document.getElementById('tela-entrada') || document.getElementById('tela-login');
          if (still && still.offsetParent !== null && still.style.display !== 'none') {
            log('login ainda visivel -> escondendo a forca');
            hideLoginForever();
            // dispara resize para o jogo recalcular canvas
            window.dispatchEvent(new Event('resize'));
          } else {
            log('OK login resolvido');
          }
          clearInterval(iv);
        }, 1500);
      }
    }
    if (n > 40) {
      log('desisti apos 20s');
      hideLoginForever();
      window.dispatchEvent(new Event('resize'));
      clearInterval(iv);
    }
  }, 500);
})();