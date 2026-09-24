import { supabase } from '../../shared/supabase.js'
import { showToast, showConfirm } from './ui.js'

let onlineUsers = new Map()
let presenceChannel = null

export function getOnlineUsers() { return onlineUsers }
export function setOnlineUsers(users) { onlineUsers = users }

export function setupOnlinePresence(currentUser) {
  if(presenceChannel) supabase.removeChannel(presenceChannel)
  presenceChannel = supabase.channel('online-presence')
  presenceChannel.on('presence', {event:'sync'}, async () => {
    const state = presenceChannel.presenceState()
    onlineUsers.clear()
    for(const key in state){
      state[key].forEach(p => onlineUsers.set(p.user_id, p))
    }
    if(document.getElementById('onlineList')) showOnline()
  })
 .on('presence', {event:'join'}, ({newPresences}) => {
    newPresences.forEach(p => onlineUsers.set(p.user_id, p))
    if(document.getElementById('onlineList')) showOnline()
  })
 .on('presence', {event:'leave'}, ({leftPresences}) => {
    leftPresences.forEach(p => onlineUsers.delete(p.user_id))
    if(document.getElementById('onlineList')) showOnline()
  })
 .subscribe(async (status) => {
    if(status === 'SUBSCRIBED'){
      const {data:prof} = await supabase.from('profiles').select('username,avatar_url').eq('id', currentUser.id).single()
      await presenceChannel.track({user_id: currentUser.id, username: prof?.username || currentUser.email, avatar_url: prof?.avatar_url, online_at: new Date().toISOString()})
    }
  })
}

export async function showOnline() {
  const rightContent = document.getElementById('right-content')
  const rightSidebar = document.getElementById('rightSidebar')
  rightSidebar.classList.remove('hidden')
  rightContent.innerHTML = `
    <div class="rs-header"><h3>Online <span style="opacity:.6;font-size:12px">[${onlineUsers.size}]</span></h3><button class="rs-close" onclick="document.getElementById('rightSidebar').classList.add('hidden')">✕</button></div>
    <div id="onlineList" style="padding:0;"></div>
    <div id="userMenu" style="display:none; position:fixed; background:#1e1e1e; border:1px solid #333; border-radius:10px; min-width:185px; z-index:9999; overflow:hidden; box-shadow:0 8px 25px rgba(0,0,0,.6);"></div>
  `
  const list = document.getElementById('onlineList')
  const menu = document.getElementById('userMenu')

  menu.innerHTML = `
    <div class="um-item" data-action="friend">Add Friend</div>
    <div class="um-item" data-action="message">Message</div>
    <div class="um-item" data-action="profile">Profile</div>
    <div class="um-item" data-action="block">Block User</div>
    <div class="um-item" data-action="ignore">Ignore User</div>
    <div class="um-item" data-action="report">Report</div>
  `

  if(!document.getElementById('online-style')){
    const style = document.createElement('style')
    style.id = 'online-style'
    style.innerHTML = `
     .online-row{display:flex; align-items:center; gap:10px; padding:10px 12px; cursor:pointer; border-bottom:1px solid #1a1a1a;}
     .online-row:hover{background:#161616;}
     .av-wrap{position:relative; width:42px; height:42px; flex-shrink:0;}
     .av-wrap img{width:42px; height:42px; border-radius:6px; object-fit:cover;}
     .av-wrap.dot{position:absolute; top:-3px; left:-3px; width:12px; height:12px; background:#3fba26; border:2px solid #0f0f0f; border-radius:50%;}
     .online-info{flex:1; min-width:0;}
     .online-name{font-size:13px; font-weight:700; color:#ff2a2a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
     .online-name.yellow{color:#f1c950;}
     .online-name.me{color:#fff;}
     .online-rank{font-size:11px; opacity:.5; margin-top:1px;}
     .online-dots{opacity:.4; padding:6px; font-size:18px;}
     .online-row:hover .online-dots{opacity:1;}
     .um-item{padding:11px 16px; font-size:13px; cursor:pointer; color:#ddd; border-bottom:1px solid #252525; text-align:center;}
     .um-item:hover{background:#2a2a2a; color:#fff;}
    `
    document.head.appendChild(style)
  }

  if(onlineUsers.size === 0){
    list.innerHTML = `<div style="opacity:.5; text-align:center; margin-top:30px;">No one's online</div>`
    return
  }

  const shuffled = Array.from(onlineUsers.entries()).sort(() => Math.random() - 0.5)
  let activeUser = null

  for(const [id, u] of shuffled){
    const isMe = id === window.currentUser.id
    const row = document.createElement('div')
    row.className = 'online-row'
    row.innerHTML = `
      <div class="av-wrap"><img src="${u.avatar_url || '../shared/default-avatar.png'}"><div class="dot"></div></div>
      <div class="online-info">
        <div class="online-name yellow">${u.username}</div>
        <div class="online-rank">Registered</div>
      </div>
      <div class="online-dots">⋮</div>
    `
    const openMenu = (e) => {
      e.stopPropagation()
      activeUser = {id,...u, isMe}
      if(isMe) return window.showUserProfileHandler(id)
      menu.style.display = 'block'
      const rect = row.getBoundingClientRect()
      menu.style.left = (rect.right - 195) + 'px'
      menu.style.top = (rect.top + 10) + 'px'
    }
    row.onclick = openMenu
    list.appendChild(row)
  }

  menu.onclick = async (e) => {
    const action = e.target.dataset.action
    if(!action || !activeUser || activeUser.isMe) return
    menu.style.display = 'none'
    const { sendFriendRequest } = await import('./friends.js')
    const { blockUser } = await import('./blocked.js')
    
    if(action === 'profile') window.showUserProfileHandler(activeUser.id)
    if(action === 'message'){ showToast(`Chat with ${activeUser.username}`); window.showUserProfileHandler(activeUser.id) }
    if(action === 'friend'){ await sendFriendRequest(activeUser.id, window.currentUser) }
    if(action === 'block'){ const ok = await showConfirm(`Block ${activeUser.username}?`); if(ok){ await supabase.from('blocked_users').insert({user_id: window.currentUser.id, blocked_id: activeUser.id}); showToast('Blocked'); showOnline() } }
    if(action === 'ignore') showToast('Ignored')
    if(action === 'report') showToast('Reported')
  }
  document.addEventListener('click', () => { if(menu) menu.style.display='none' }, {once:true})
}
