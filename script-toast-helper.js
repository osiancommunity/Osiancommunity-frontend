(function(){
  function ensureToastEl(){
    var el = document.getElementById('osian-toast');
    if(!el){
      el = document.createElement('div');
      el.id = 'osian-toast';
      el.className = 'osian-toast';
      document.body.appendChild(el);
    }
    return el;
  }

  function showToast(message, type, opts){
    var el = ensureToastEl();
    el.className = 'osian-toast' + (type ? (' ' + type) : '');
    el.innerHTML = message;
    el.classList.add('show');
    var duration = (opts && opts.duration) || 5000;
    if(duration > 0){
      clearTimeout(el._hideTimer);
      el._hideTimer = setTimeout(function(){
        el.classList.remove('show');
        el.innerHTML = '';
      }, duration);
    }
  }

  function showToastConfirm(message, onConfirm, onCancel, type){
    var el = ensureToastEl();
    el.className = 'osian-toast' + (type ? (' ' + type) : ' warning');
    el.innerHTML = message + ' <span class="actions"><button id="toast-confirm">Confirm</button> <button id="toast-cancel">Cancel</button></span>';
    el.classList.add('show');
    var confirmBtn = document.getElementById('toast-confirm');
    var cancelBtn = document.getElementById('toast-cancel');
    var hide = function(){
      el.classList.remove('show');
      el.innerHTML = '';
    };
    if(confirmBtn) confirmBtn.onclick = function(){
      hide();
      if(typeof onConfirm === 'function') onConfirm();
    };
    if(cancelBtn) cancelBtn.onclick = function(){
      hide();
      if(typeof onCancel === 'function') onCancel();
    };
  }

  window.showToast = window.showToast || showToast;
  window.showToastConfirm = window.showToastConfirm || showToastConfirm;
  document.addEventListener('DOMContentLoaded', function(){
    var btns = document.querySelectorAll('.logout-btn, .logout-direct');
    btns.forEach(function(btn){
      btn.addEventListener('click', function(e){
        e.preventDefault();
        try { localStorage.removeItem('token'); } catch(_){ }
        try { localStorage.removeItem('user'); } catch(_){ }
        window.location.href = 'index.html';
      });
    });
  });
})();
