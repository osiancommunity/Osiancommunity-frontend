;(function(){
  var w = window;
  var host = location.hostname || '';
  var isLocal = (host === 'localhost' || host === '127.0.0.1');
  var base = isLocal ? 'http://localhost:5000/api' : 'https://osiancommunity-backend.vercel.app/api';
  w.API_BASE = base;

  function getToken(){ try { return localStorage.getItem('token') || ''; } catch(_) { return ''; } }
  w.getToken = getToken;

  async function apiFetch(path, opts){
    var rel = path.startsWith('/') ? path : ('/'+path);
    var prim = w.API_BASE + rel;
    var fall = 'https://osiancommunity-backend.vercel.app/api' + rel;
    var o = Object.assign({ credentials: 'omit' }, opts||{});
    o.headers = Object.assign({}, o.headers||{});
    if (!('Content-Type' in o.headers) && o.body) o.headers['Content-Type'] = 'application/json';
    var t = getToken();
    if (t && !('Authorization' in o.headers)) o.headers['Authorization'] = 'Bearer ' + t;

    async function handleResponse(res){
      var ct = (res.headers.get('content-type')||'');
      var isJson = ct.includes('application/json');
      var body = null;
      try { body = isJson ? await res.json() : await res.text(); } catch(_) {}
      if (res.ok) return body;
      if (res.status === 401){
        try { localStorage.removeItem('token'); localStorage.removeItem('user'); } catch(_){ }
        if (!location.pathname.endsWith('login.html')) location.href = 'login.html';
        throw new Error((body && body.message) ? body.message : 'Unauthorized');
      }
      if (res.status === 403){
        throw new Error((body && body.message) ? body.message : 'Forbidden');
      }
      if (res.status >= 500){
        throw new Error((body && body.message) ? body.message : ('Server error '+res.status));
      }
      throw new Error((body && body.message) ? body.message : ('HTTP '+res.status));
    }

    async function tryOne(url){
      var res = await fetch(url, o);
      return handleResponse(res);
    }

    try {
      return await tryOne(prim);
    } catch (e) {
      if (isLocal) {
        return await tryOne(fall);
      }
      throw e;
    }
  }
  w.apiFetch = apiFetch;

  function applyTheme(theme){
    var th = (theme === 'dark') ? 'dark' : 'light';
    document.body.setAttribute('data-theme', th);
    var tag = document.getElementById('theme-vars');
    if (tag) tag.remove();
    if (th === 'dark'){
      var css = [
        'body[data-theme="dark"]{',
        '  --bg:#0b1220;',
        '  --card:#121a2f;',
        '  --text:#e5e7eb;',
        '  --muted:#9ca3af;',
        '  --primary:#4c8dff;',
        '  --accent:#6a5cd8;',
        '  --shadow:0 12px 32px rgba(0,0,0,.35);',
        '}',
        'body[data-theme="dark"]{ background:#0b1220 !important; color:#e5e7eb; }'
      ].join('\n');
      var styleEl = document.createElement('style');
      styleEl.id = 'theme-vars';
      styleEl.textContent = css;
      document.head.appendChild(styleEl);
    }
    try { localStorage.setItem('theme', th); } catch(_) {}
  }
  w.applyTheme = applyTheme;
  w.setTheme = function(theme){ applyTheme(theme); };

  function setImg(id, src){ var el = document.getElementById(id); if (el && src) el.src = src; }
  function setImgByClass(cls, src){ var els = document.getElementsByClassName(cls); for (var i=0;i<els.length;i++){ var e=els[i]; if (e && src) e.src = src; } }

  async function initAvatars(){
    var avatar = null;
    try {
      var stored = JSON.parse(localStorage.getItem('osianUserData')||'{}');
      avatar = stored.avatar || null;
    } catch(_) {}
    if (!avatar){
      try {
        var user = JSON.parse(localStorage.getItem('user')||'{}');
        avatar = user.avatar || null;
      } catch(_) {}
    }
    avatar = avatar || 'https://i.ibb.co/jP9JWBBy/diljj.png';
    setImg('topAvatar', avatar);
    setImg('heroAvatar', avatar);
    setImg('userAvatar', avatar);
    setImg('headerAvatar', avatar);
    setImg('avatar', avatar);
    setImgByClass('user-avatar', avatar);

    try {
      var data = await apiFetch('/users/profile');
      if (data && data.user){
        var u=data.user||{}; var p=u.profile||{}; var fresh = p.avatar || u.avatar || null;
        if (fresh){
          setImg('topAvatar', fresh);
          setImg('heroAvatar', fresh);
          setImg('userAvatar', fresh);
          setImg('headerAvatar', fresh);
          setImg('avatar', fresh);
          setImgByClass('user-avatar', fresh);
          try {
            var raw = localStorage.getItem('osianUserData');
            var obj = raw ? JSON.parse(raw) : {};
            obj.avatar = fresh;
            localStorage.setItem('osianUserData', JSON.stringify(obj));
          } catch(_) {}
        }
      }
    } catch (_) {}
  }
  w.initAvatars = initAvatars;

  function init(){
    var saved = null; try { saved = localStorage.getItem('theme'); } catch(_) {}
    applyTheme(saved || 'light');
    initAvatars();
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
