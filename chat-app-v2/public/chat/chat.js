import { supabase } from '../shared/supabase.js'

import * as UI from './js/ui.js'
import * as Notifications from './js/notifications.js'
import * as Friends from './js/friends.js'
import * as Blocked from './js/blocked.js'
import * as Rooms from './js/rooms.js'
import * as Messages from './js/messages.js'
import * as Presence from './js/presence.js'
import * as Profile from './js/profile.js'
import * as DM from './js/dm.js'

// Global state
window.currentUser = null
window.currentRoomId = null
window.supabaseClient = supabase
window.supabase = supabase

// DOM elements
const messagesEl = document.getElementById('messages')
const messageInput = document.getElementById('messageInput')
const sendBtn = document.getElementById('sendBtn')
const headerTitle = document.getElementById('header-title')
const headerIcon = document.getElementById('header-icon')
const headerName = document.getElementById('header-name')
const rightSidebar = document.getElementById('rightSidebar')
const rightContent = document.getElementById('right-content')
const roomsList = document.getElementById('rooms-list')
const notifBtn = document.getElementById('notifBtn')

// Initialize on page load
document.addEventListener('DOMContentLoaded', init)

async function init() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return (window.location.href = '../auth/sign.html')

  window.currentUser = user

  await ensureProfile()
  await Rooms.ensureMainRoom(user)
  await Rooms.checkIfOwner(user)
  await Rooms.loadRooms(user)
  await Notifications.updateNotifCount(user)

  Notifications.setupRealtime(user)
  Presence.setupOnlinePresence(user)
  setupHeader()
  Rooms.setupRoomsToggle()
  Rooms.setupCreateRoom()
  Messages.setupSend()
  setupMembersToggle()
  setupLeftNav()

  await Friends.loadFriendsData(user)
  Friends.setupFriendsRealtime(user)
  await Blocked.loadBlockedData(user)

  rightSidebar.classList.add('hidden')

  // auto join main so currentRoomId is never null
  const { data: mainRoom } = await supabase.from('rooms').select('*').eq('name', 'main').maybeSingle()
  if (mainRoom) {
    const el = document.querySelector(`.room-item[data-id="${mainRoom.id}"]`)
    Rooms.joinRoom(mainRoom.id, mainRoom.name, el, mainRoom)
  }
}

async function ensureProfile() {
  const { data } = await supabase
   .from('profiles')
   .select('id')
   .eq('id', window.currentUser.id)
   .maybeSingle()
  if (!data)
    await supabase
     .from('profiles')
     .insert({ id: window.currentUser.id, username: window.currentUser.email.split('@')[0] })
}

function setupHeader() {
  if (!headerTitle) return
  headerTitle.style.cursor = 'pointer'
  headerTitle.onclick = () => {
    const current = Rooms.getCurrentRoom()
    if (current) Rooms.showRoomProfile(current)
  }
  if (notifBtn) {
    notifBtn.addEventListener('click', () => Notifications.showNotifications())
  }
}

function setupMembersToggle() {
  const btn = document.getElementById('membersToggleBtn')
  if (!btn) return
  btn.onclick = () => {
    if (rightSidebar.classList.contains('hidden')) {
      showMembersSidebar(window.currentRoomId)
    } else {
      rightSidebar.classList.add('hidden')
    }
  }
}

async function showMembersSidebar(roomId) {
  if (!roomId) roomId = window.currentRoomId
  if (!roomId) {
    rightSidebar.classList.remove('hidden')
    rightContent.innerHTML = `<div class="rs-header"><h3>Members</h3></div><div style="padding:20px;opacity:.6;">Select a room first</div>`
    return
  }
  rightSidebar.classList.remove('hidden')
  rightContent.innerHTML = `
    <div class="rs-header"><h3>Members</h3><div><button class="search-btn" id="backToProfile">Back</button> <button class="rs-close" onclick="document.getElementById('rightSidebar').classList.add('hidden')">✕</button></div></div>
    <div class="members-toolbar">
      <input id="memberSearch" placeholder="Search members..." style="width:100%; padding:8px; background:#111; border:1px solid #333; border-radius:6px; color:#fff;">
    </div>
    <div id="membersList" class="members-full-list">Loading...</div>
  `

  document.getElementById('backToProfile').onclick = () => {
    const current = Rooms.getCurrentRoom()
    if (current) Rooms.showRoomProfile(current)
  }

  const { data: mems, count } = await supabase
   .from('room_members')
   .select('user_id,role', { count: 'exact' })
   .eq('room_id', roomId)
   .limit(200)

  if (!mems || mems.length === 0) {
    document.getElementById('membersList').innerHTML = 'No members'
    return
  }

  const ids = mems.map(m => m.user_id)

  const { data: profs } = await supabase
   .from('profiles')
   .select('id,username,avatar_url')
   .in('id', ids)

  const container = document.getElementById('membersList')
  container.innerHTML = ''

  const header = document.createElement('div')
  header.className = 'members-count-header'
  header.innerHTML = `<span>Members [${count || mems.length}]</span>`
  container.appendChild(header)

  const list = document.createElement('div')
  list.id = 'membersListInner'
  const order = { Owner: 0, Admin: 1, Mod: 2, User: 3 }

  ;(profs || [])
   .map(p => ({...p, role: mems.find(m => m.user_id === p.id)?.role || 'User' }))
   .sort((a, b) => (order[a.role] || 3) - (order[b.role] || 3))
   .forEach(p => {
      const d = document.createElement('div')
      d.className = 'member-row'
      const isOwner = p.role === 'Owner'
      d.innerHTML = `
      <img src="${p.avatar_url || '../shared/default-avatar.png'}" class="member-row-avatar">
      <div class="member-row-info">
        <div class="member-row-name" style="${isOwner? 'color:#ffcc00;font-weight:bold' : ''}">${p.username}</div>
        <div class="member-row-role">${p.role}</div>
      </div>
      <div class="member-row-dot ${isOwner? 'owner' : ''}"></div>
    `
      d.dataset.username = p.username.toLowerCase()
      d.onclick = () => Profile.showUserProfile(p.id)
      list.appendChild(d)
    })

  container.appendChild(list)

  document.getElementById('memberSearch').oninput = e => {
    const q = e.target.value.toLowerCase()
    list.querySelectorAll('.member-row').forEach(row => {
      row.style.display = row.dataset.username.includes(q)? 'flex' : 'none'
    })
  }
}

function setupLeftNav() {
  const allNav = document.querySelectorAll('.nav-item[data-view], #profileBtn, [data-view="profile"]')
  allNav.forEach(item => {
    item.addEventListener('click', async () => {
      const view = item.dataset.view || (item.id === 'profileBtn'? 'profile' : '')
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'))
      if (item.classList.contains('nav-item')) item.classList.add('active')
      rightSidebar.classList.remove('hidden')

      if (view === 'profile') return Profile.showUserProfile(window.currentUser.id)
      if (view === 'notifications') return Notifications.showNotifications()
      if (view === 'messages') return showMessagesSidebar()
      if (view === 'friends') return Friends.showFriends('friends')
      if (view === 'online') return Presence.showOnline()
      if (view === 'blocked') return Blocked.showBlocked()
    })
  })
}

async function showMessagesSidebar(){
  const rightContent = document.getElementById('right-content')
  rightContent.innerHTML = `
    <div class="rs-header"><h3>Messages</h3><button class="rs-close" onclick="document.getElementById('rightSidebar').classList.add('hidden')">✕</button></div>
    <div id="dmMessagesList" style="padding:10px;">Loading...</div>
  `
  const { data: myMembers } = await supabase.from('room_members').select('room_id').eq('user_id', window.currentUser.id)
  const ids = (myMembers||[]).map(m=>m.room_id)
  const { data: dmRooms } = await supabase.from('rooms').select('*').in('id', ids.length?ids:['00000000-0000-0000-0000-000000000000']).eq('is_dm', true).order('created_at',{ascending:false})

  const container = document.getElementById('dmMessagesList')
  if(!dmRooms || dmRooms.length===0){
    container.innerHTML = `<div style="opacity:.5;padding:20px;text-align:center;">No DMs yet<br><small>Message someone from their profile</small></div>`
    return
  }
  container.innerHTML = ''
  for(const room of dmRooms){
    const otherId = room.dm_user1 === window.currentUser.id ? room.dm_user2 : room.dm_user1
    const { data: prof } = await supabase.from('profiles').select('username,avatar_url').eq('id', otherId).maybeSingle()
    const { data: last } = await supabase.from('messages').select('content').eq('room_id', room.id).order('created_at',{ascending:false}).limit(1).maybeSingle()
    const div = document.createElement('div')
    div.className = 'member-row'
    div.style.cssText = 'display:flex;gap:10px;padding:10px;border-radius:8px;cursor:pointer;align-items:center;'
    div.innerHTML = `<img src="${prof?.avatar_url || '../shared/default-avatar.png'}" style="width:36px;height:36px;border-radius:50%;"><div style="flex:1;overflow:hidden;"><div style="font-weight:bold;font-size:13px;">${prof?.username || room.name}</div><div style="font-size:12px;opacity:.5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${last?.content || 'No messages yet'}</div></div>`
    div.onclick = () => {
      Rooms.joinRoom(room.id, room.name, null, room)
      rightSidebar.classList.add('hidden')
    }
    container.appendChild(div)
  }
}
window.showMessagesSidebar = showMessagesSidebar

// Export for global access
window.showMembersSidebar = showMembersSidebar
window.Rooms = Rooms
window.Messages = Messages
window.Profile = Profile
window.Friends = Friends
window.Notifications = Notifications
window.Presence = Presence
window.Blocked = Blocked
window.UI = UI
window.DM = DM