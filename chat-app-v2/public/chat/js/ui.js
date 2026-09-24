import { supabase } from '../../shared/supabase.js'

export function playNotifSound() {
  const a = document.getElementById('notifSound')
  if (a) {
    a.currentTime = 0
    a.play().catch(() => {})
  }
  const b1 = document.getElementById('notifCount')
  const b2 = document.getElementById('notifCountTop')
  b1?.classList.add('pop')
  b2?.classList.add('pop')
  setTimeout(() => {
    b1?.classList.remove('pop')
    b2?.classList.remove('pop')
  }, 300)
}

export function showToast(msg) {
  let t = document.getElementById('app-toast')
  if (!t) {
    t = document.createElement('div')
    t.id = 'app-toast'
    t.style.cssText = 'position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:#1e1e1e;color:#fff;padding:12px 22px;border-radius:10px;z-index:99999;border:1px solid #333;box-shadow:0 8px 24px rgba(0,0,0,.6);font-size:13px;transition:all.3s'
    document.body.appendChild(t)
  }
  t.textContent = msg
  t.style.opacity = '1'
  t.style.display = 'block'
  setTimeout(() => {
    t.style.opacity = '0'
    setTimeout(() => (t.style.display = 'none'), 300)
  }, 2500)
}

export function showConfirm(text) {
  return new Promise(res => {
    const m = document.createElement('div')
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:99998;display:flex;align-items:center;justify-content:center;'
    m.innerHTML = `<div style="background:#1a1a1a;border:1px solid #333;padding:20px;border-radius:12px;width:320px;color:#fff;text-align:center;"><p style="margin-bottom:16px;font-size:13px;">${text}</p><div style="display:flex;gap:10px;justify-content:center;"><button id="c-no" style="padding:8px 16px;background:#222;border:none;border-radius:8px;color:#fff;cursor:pointer;">Cancel</button><button id="c-yes" style="padding:8px 16px;background:#ff2a6d;border:none;border-radius:8px;color:#fff;cursor:pointer;">Yes</button></div></div>`
    document.body.appendChild(m)
    m.querySelector('#c-no').onclick = () => {
      m.remove()
      res(false)
    }
    m.querySelector('#c-yes').onclick = () => {
      m.remove()
      res(true)
    }
  })
}

export function showSimple(title, text) {
  const rightContent = document.getElementById('right-content')
  const rightSidebar = document.getElementById('rightSidebar')
  rightSidebar.classList.remove('hidden')
  rightContent.innerHTML = `
    <div class="rs-header"><h3>${title}</h3><button class="rs-close" onclick="document.getElementById('rightSidebar').classList.add('hidden')">✕</button></div>
    <div style="padding:20px;opacity:0.6;text-align:center;margin-top:40px">${text}</div>
  `
}
