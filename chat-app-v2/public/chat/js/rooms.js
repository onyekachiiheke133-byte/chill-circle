import { supabase } from '../../shared/supabase.js'
import { showToast, showConfirm } from './ui.js'

let currentRoomId = null
let currentRoom = null
let isSiteOwner = false
let pendingRoomAvatarFile = null
let pendingRoomBannerFile = null
let pendingRoomAvatarRemove = false
let pendingRoomBannerRemove = false

export function setCurrentRoom(room) { currentRoom = room }
export function getCurrentRoom() { return currentRoom }
export function setCurrentRoomId(id) { currentRoomId = id }
export function getCurrentRoomId() { return currentRoomId }
export function setIsSiteOwner(val) { isSiteOwner = val }
export function getIsSiteOwner() { return isSiteOwner }

export async function checkIfOwner(currentUser) {
  const { data } = await supabase
  .from('room_members')
  .select('role')
  .eq('user_id', currentUser.id)
  .eq('role', 'Owner')
  .limit(1)
  isSiteOwner = data && data.length > 0
  const createRoomBtn = document.getElementById('createRoomBtn')
  if (createRoomBtn) createRoomBtn.style.display = isSiteOwner? 'flex' : 'none'
}

export async function ensureMainRoom(currentUser) {
  let { data: main } = await supabase.from('rooms').select('*').eq('name', 'main').maybeSingle()
  if (!main) {
    const { data, error } = await supabase
    .from('rooms')
    .insert({ name: 'main', owner_id: currentUser.id, created_by: currentUser.id })
    .select()
    .single()
    if (error) {
      console.error('ensureMainRoom create error', error)
      return
    }
    main = data
  }
  const { data: mem } = await supabase
  .from('room_members')
  .select('id')
  .eq('room_id', main.id)
  .eq('user_id', currentUser.id)
  .maybeSingle()

  if (!mem) {
    const { data: owners } = await supabase
    .from('room_members')
    .select('user_id')
    .eq('role', 'Owner')
    .limit(1)
    const role =!owners || owners.length === 0? 'Owner' : 'User'
    const { error } = await supabase
    .from('room_members')
    .upsert({ room_id: main.id, user_id: currentUser.id, role }, { onConflict: 'room_id,user_id' })
    if (error) console.error('auto join main failed', error)
    else console.log('auto joined main as', role)
  }
}

export function setupRoomsToggle() {
  const roomsToggle = document.getElementById('roomsToggle')
  const roomsList = document.getElementById('rooms-list')
  const createRoomBtn = document.getElementById('createRoomBtn')
  if (!roomsToggle) return
  roomsToggle.onclick = e => {
    if (e.target.id === 'createRoomBtn') return
    roomsList.classList.toggle('closed')
  }
}

export function setupCreateRoom() {
  const createRoomBtn = document.getElementById('createRoomBtn')
  if (!createRoomBtn) return
  createRoomBtn.onclick = e => {
    e.stopPropagation()
    if (!isSiteOwner) return
    showCreateGroupForm()
  }
}

// --- MODIFIED ONLY THIS FUNCTION ---
export async function loadRooms(currentUser) {
  const { data: rooms } = await supabase.from('rooms').select('*').order('created_at')
  const { data: my } = await supabase
   .from('room_members')
   .select('room_id')
   .eq('user_id', currentUser.id)
  const myIds = new Set((my || []).map(m => m.room_id))
  const roomsList = document.getElementById('rooms-list')
  if(!roomsList) return
  roomsList.innerHTML = ''

  // remove dm-header / dm-list if it exists from before
  document.getElementById('dm-header')?.remove()
  document.getElementById('dm-list')?.remove()

  const sorted = [...(rooms || [])].sort(
    (a, b) => (myIds.has(b.id)? 1 : 0) - (myIds.has(a.id)? 1 : 0)
  )

  sorted.forEach(r => {
    if(r.is_dm) return // <-- HIDE DMs from rooms list
    const div = document.createElement('div')
    div.className = 'room-item with-icon'
    div.dataset.id = r.id
    div.innerHTML = `<img src="${r.icon_url || '../shared/default-avatar.png'}" class="room-list-icon"><span>${r.name}</span>`
    div.onclick = e => handleRoomClick(r, e.currentTarget, myIds.has(r.id))
    roomsList.appendChild(div)
  })
}

export function showCreateGroupForm() {
  const rightContent = document.getElementById('right-content')
  const rightSidebar = document.getElementById('rightSidebar')
  rightSidebar.classList.remove('hidden')
  rightContent.innerHTML = `
  <div class="rs-header"><h3>Create Group</h3><button class="rs-close" onclick="document.getElementById('rightSidebar').classList.add('hidden')">✕</button></div>
  <div class="cg-form">
    <label>Chat Room Name <span style="color:red">*</span></label>
    <input id="cg-name" placeholder="Chat Room Name">
    <label>Description</label>
    <div class="cg-toolbar"><b>B</b><i>I</i><u>U</u> ≡ ≣</div>
    <textarea id="cg-desc" rows="5"></textarea>
    <label>Group Icon</label>
    <div class="cg-file"><input type="file" id="cg-icon" accept="image/*" hidden><button id="cg-file-btn">Choose a file</button><span id="cg-file-name"></span></div>
    <label>Password Protect</label>
    <select id="cg-pass"><option value="">---</option><option value="Yes">Yes</option><option value="No">No</option></select>
    <div id="cg-pass-wrap" style="display:none; margin-top:8px;">
      <input id="cg-pass-input" type="text" placeholder="Enter room password" style="width:100%; padding:10px; background:#151515; border:1px solid #222; border-radius:6px; color:#fff;">
    </div>
    <label>Approve users manually</label><select id="cg-approve"><option value="">---</option><option value="Yes">Yes</option><option value="No">No</option></select>
    <label>Paid VIP Room</label><select id="cg-vip"><option>---</option><option>Yes</option><option>No</option></select>
    <label>Video Chat</label><select id="cg-video"><option>---</option><option>Enabled</option><option>Disabled</option></select>
    <label>Audio Chat</label><select id="cg-audio"><option>---</option><option>Enabled</option><option>Disabled</option></select>
    <label>Broadcast Camera</label><select id="cg-bc"><option>---</option><option>Enabled</option><option>Disabled</option></select>
    <div class="cg-actions"><button id="cg-cancel">Cancel</button><button id="cg-create">Create</button></div>
  </div>`

  document.getElementById('cg-file-btn').onclick = () => document.getElementById('cg-icon').click()
  document.getElementById('cg-icon').onchange = e =>
    (document.getElementById('cg-file-name').textContent = e.target.files[0]?.name || '')
  document.getElementById('cg-pass').onchange = e => {
    document.getElementById('cg-pass-wrap').style.display = e.target.value === 'Yes'? 'block' : 'none'
  }
  document.getElementById('cg-cancel').onclick = () => rightSidebar.classList.add('hidden')
  document.getElementById('cg-create').onclick = () => handleCreateRoom(window.currentUser)
}

export async function handleCreateRoom(currentUser) {
  const nameRaw = document.getElementById('cg-name').value.trim()
  if (!nameRaw) return showToast('Name required')
  const name = nameRaw.toLowerCase().replace(/[^a-z0-9-]/g, '-')
  const btn = document.getElementById('cg-create')
  btn.textContent = 'Creating...'
  btn.disabled = true

  let iconUrl = null
  const file = document.getElementById('cg-icon').files[0]
  if (file) {
    const fName = `room-${Date.now()}-${file.name}`
    const { error } = await supabase.storage.from('room-icons').upload(fName, file)
    if (!error) {
      const { data } = supabase.storage.from('room-icons').getPublicUrl(fName)
      iconUrl = data.publicUrl
    }
  }

  const isPassProtected = document.getElementById('cg-pass').value === 'Yes'
  const passwordVal = isPassProtected? document.getElementById('cg-pass-input').value.trim() || null : null
  const isManualApprove = document.getElementById('cg-approve').value === 'Yes'
  const allowJoin =!isManualApprove

  const payload = {
    name,
    owner_id: currentUser.id,
    created_by: currentUser.id,
    description: document.getElementById('cg-desc').value,
    icon_url: iconUrl,
    avatar_url: iconUrl,
    allow_new_join: allowJoin,
    password: passwordVal
  }

  let { data: room, error } = await supabase
  .from('rooms')
  .insert(payload)
  .select()
  .single()

  if (error) {
    const { data: r2, error: e2 } = await supabase
    .from('rooms')
    .insert({
        name,
        owner_id: currentUser.id,
        created_by: currentUser.id,
        description: payload.description,
        icon_url: iconUrl,
        allow_new_join: allowJoin
      })
    .select()
    .single()
    if (e2) {
      showToast(e2.message)
      btn.disabled = false
      btn.textContent = 'Create'
      return
    }
    if (passwordVal && r2) {
      await supabase.from('rooms').update({ password: passwordVal }).eq('id', r2.id)
    }
    room = r2
  }

  await supabase
  .from('room_members')
  .upsert({ room_id: room.id, user_id: currentUser.id, role: 'Owner' }, { onConflict: 'room_id,user_id' })

  const rightSidebar = document.getElementById('rightSidebar')
  rightSidebar.classList.add('hidden')
  showToast('Room created')
  await loadRooms(currentUser)
  const el = [...document.querySelectorAll('.room-item')].find(x => x.dataset.id === room.id)
  if (el) joinRoom(room.id, room.name, el)
}

export function showJoinPopup(room, el) {
  document.getElementById('joinModal')?.remove()
  const isLocked = room.allow_new_join === false &&!room.password
  const isPass =!!room.password
  const modal = document.createElement('div')
  modal.id = 'joinModal'
  modal.innerHTML = `
    <div class="join-box">
      <img src="${room.icon_url || room.avatar_url || '../shared/default-avatar.png'}">
      <h3>${room.name}</h3>
      ${isLocked? `<p class="oops">Oops, this room can't be joined</p><p style="opacity:.6; font-size:12px;">Owner locked this room. You can request to join.</p>` : ''}
      ${isPass? `<p>This room requires password</p><input id="joinPassInput" type="password" placeholder="Enter password"><button class="btn-link" id="joinLinkBtn">Join via link (bypass password)</button>` : ''}
      ${!isLocked &&!isPass? `<p>Do you want to join this room?</p>` : ''}
      <div class="join-actions" style="margin-top:12px;">
        <button class="btn-cancel" id="joinCancel">Cancel</button>
        ${isLocked? `<button class="btn-yes" id="reqJoin">Request to join</button>` : `<button class="btn-yes" id="joinYes">Yes, Join</button>`}
      </div>
    </div>`

  document.body.appendChild(modal)
  modal.onclick = e => {
    if (e.target.id === 'joinModal') modal.remove()
  }

  document.getElementById('joinCancel').onclick = () => modal.remove()

  if (isLocked) {
    document.getElementById('reqJoin').onclick = async () => {
      const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', window.currentUser.id)
      .single()
      await supabase
      .from('room_join_requests')
      .insert({ room_id: room.id, user_id: window.currentUser.id })
      try {
        await supabase.from('notifications').insert({
          user_id: room.owner_id,
          type: 'join_request',
          status: 'pending',
          content: `${profile?.username || window.currentUser.email} wants to join ${room.name}`,
          room_id: room.id,
          from_user: window.currentUser.id
        })
      } catch (e) {}
      showToast('Request sent to owner')
      modal.remove()
    }
  } else {
    document.getElementById('joinYes').onclick = async () => {
      if (isPass) {
        const input = document.getElementById('joinPassInput').value
        if (input!== room.password) return showToast('Wrong password')
      }
      modal.remove()
      await supabase
      .from('room_members')
      .insert({ room_id: room.id, user_id: window.currentUser.id, role: 'User' })
      await loadRooms(window.currentUser)
      const newEl = [...document.querySelectorAll('.room-item')].find(x => x.dataset.id === room.id)
      joinRoom(room.id, room.name, newEl)
    }
    if (isPass) {
      document.getElementById('joinLinkBtn').onclick = async () => {
        modal.remove()
        await supabase
        .from('room_members')
        .insert({ room_id: room.id, user_id: window.currentUser.id, role: 'User' })
        await loadRooms(window.currentUser)
        const newEl = [...document.querySelectorAll('.room-item')].find(x => x.dataset.id === room.id)
        joinRoom(room.id, room.name, newEl)
      }
    }
  }
}

// --- MODIFIED ONLY JOINROOM TO ACCEPT roomObj ---
export async function joinRoom(id, name, el, extra=null, headerIcon=null, headerName=null) {
  let roomObj = null
  let messagesEl = null
  // detect if 4th param is room object (from DM) or messagesEl
  if(extra && typeof extra === 'object' &&!extra.tagName && (extra.id || extra.is_dm!== undefined || extra.name)){
    roomObj = extra
  } else {
    messagesEl = extra
  }

  currentRoomId = id
  window.currentRoomId = id
  const { data: full } = await supabase.from('rooms').select('*').eq('id', id).single()
  currentRoom = roomObj || full || { id, name }
  window.currentRoom = roomObj || full || { id, name }

  const hIcon = headerIcon || document.getElementById('header-icon')
  const hName = headerName || document.getElementById('header-name')
  const msgEl = messagesEl || document.getElementById('messages')
  const msgInput = document.getElementById('messageInput')
  const sendBtn = document.getElementById('sendBtn')

  if (hIcon) {
    hIcon.style.display = 'block'
    hIcon.src = currentRoom.icon_url || currentRoom.avatar_url || '../shared/default-avatar.png'
  }
  if (hName) {
    hName.textContent = currentRoom.name || currentRoom.main
  }

  if (msgInput) msgInput.disabled = false
  if (sendBtn) sendBtn.disabled = false

  document.querySelectorAll('.room-item').forEach(x => x.classList.remove('active'))
  if (el) el.classList.add('active')

  if (msgEl) msgEl.innerHTML = ''

  const { loadMessages, subscribe } = await import('./messages.js')
  await loadMessages(id)
  await subscribe(id)
}

export async function showRoomProfile(room, currentUser=null) {
  const rightContent = document.getElementById('right-content')
  const rightSidebar = document.getElementById('rightSidebar')
  rightSidebar.classList.remove('hidden')

  const { count } = await supabase
  .from('room_members')
  .select('*', { count: 'exact', head: true })
  .eq('room_id', room.id)
  const { data: members } = await supabase
  .from('room_members')
  .select('user_id')
  .eq('room_id', room.id)
  .limit(6)

  let avatars = ''
  if (members) {
    const ids = members.map(m => m.user_id)
    const { data: profs } = await supabase.from('profiles').select('avatar_url').in('id', ids)
    avatars = (profs || [])
    .map(p => `<img src="${p.avatar_url || '../shared/default-avatar.png'}" class="rp-avatar">`)
    .join('')
  }

  const isOwner = room.owner_id === (currentUser || window.currentUser).id || isSiteOwner
  const isCreator = room.created_by === (currentUser || window.currentUser).id || room.owner_id === (currentUser || window.currentUser).id
  const canEdit = isOwner || isCreator

  rightContent.innerHTML = `
  <div class="rp-banner" style="${room.banner_url? `background:url(${room.banner_url}) center/cover; height:140px;` : ''}">
    <div class="rp-banner-top"><button class="icon-btn" onclick="window.showMembersSidebarHandler('${room.id}')">👥</button><button class="icon-btn" onclick="document.getElementById('rightSidebar').classList.add('hidden')">✕</button></div>
    <div class="rp-big-icon" style="width:72px; height:72px; border-radius:12px; overflow:hidden; background:#222;">${room.icon_url || room.avatar_url? `<img src="${room.icon_url || room.avatar_url}" style="width:100%;height:100%;object-fit:cover;">` : '💬'}</div>
  </div>
  <div class="rp-body">
    <h2 class="rp-name"><span class="rp-small-icon" style="width:22px;height:22px;border-radius:4px;overflow:hidden;display:inline-block;vertical-align:middle;">${room.icon_url || room.avatar_url? `<img src="${room.icon_url || room.avatar_url}" style="width:100%;height:100%;object-fit:cover;">` : '💬'}</span> ${room.name || room.main}</h2>
    <p class="rp-desc">${room.description || room.about || 'Chat instantly with people from the UK, USA, and around the world.'}</p>
    <div class="rp-actions">
      ${canEdit? `<button class="pill" id="editRoomBtn" style="background:#ff2a6d;color:#fff;">Edit Room</button>` : ''}
      <button class="pill gray" id="leaveBtn">Leave Group</button>
      <div class="dropdown-wrap"><button class="pill gray" id="optionsBtn">Options ▾</button>
        <div class="dropdown" id="optionsDropdown">
          <div class="dd-item">Chat Now</div>
          <div class="dd-item">Invite Users</div>
          <div class="dd-item">Add Members</div>
          ${isSiteOwner? `<div class="dd-item danger" id="clearChatBtn">Clear Chat</div>` : ''}
          <div class="dd-item">Report</div>
        </div>
      </div>
    </div>
    <div class="rp-section clickable" id="membersPreview">
      <div class="rp-section-title">Members [${count || 0}] <button class="search-btn">Search</button></div>
      <div class="rp-avatars">${avatars || ''}</div>
    </div>
    <div class="rp-section"><div class="rp-section-title">Share This Group</div>
      <div class="share-grid">
        <span class="sh bsky">🦋</span><span class="sh fb">f</span><span class="sh in">in</span><span class="sh pin">P</span><span class="sh reddit">R</span><span class="sh tg">✈</span><span class="sh th">◎</span><span class="sh tum">t</span><span class="sh x">𝕏</span><span class="sh vk">VK</span><span class="sh wa">W</span>
      </div>
    </div>
  </div>`

  document.getElementById('editRoomBtn')?.addEventListener('click', () => editRoom(room))
  document.getElementById('optionsBtn').onclick = () =>
    document.getElementById('optionsDropdown').classList.toggle('show')

  document.getElementById('leaveBtn').onclick = async () => {
    const ok = await showConfirm('Leave group? It will stay in list')
    if (ok) {
      await supabase.from('room_members').delete().eq('room_id', room.id).eq('user_id', (currentUser || window.currentUser).id)
      await loadRooms(currentUser || window.currentUser)
      rightSidebar.classList.add('hidden')
      if (currentRoomId === room.id) {
        currentRoomId = null
        const msgEl = document.getElementById('messages')
        if (msgEl) msgEl.innerHTML = '<div style="opacity:0.5;text-align:center;margin-top:40px;">Select a room</div>'
      }
    }
  }

  document.getElementById('clearChatBtn')?.addEventListener('click', async () => {
    const ok = await showConfirm('Clear all messages?')
    if (!ok) return
    await supabase.from('messages').delete().eq('room_id', room.id)
    const msgEl = document.getElementById('messages')
    if (msgEl) msgEl.innerHTML = ''
  })

  document.getElementById('membersPreview').onclick = () => window.showMembersSidebarHandler(room.id)
}

export function editRoom(room) {
  const rightContent = document.getElementById('right-content')
  pendingRoomAvatarFile = null
  pendingRoomBannerFile = null
  pendingRoomAvatarRemove = false
  pendingRoomBannerRemove = false

  rightContent.innerHTML = `
    <div style="background:#0a0a0a; height:100%; overflow-y:auto; color:#fff; font-family:sans-serif; padding-bottom:30px;">
      <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; border-bottom:1px solid #1a1a1a;">
        <span style="color:#ff2a6d; font-weight:bold; font-size:14px;">Edit Room</span>
        <button onclick="window.showRoomProfileHandler(window.currentRoom)" style="background:none; border:none; color:#fff; font-size:18px; cursor:pointer;">✕</button>
      </div>
      <div style="padding:16px; display:flex; flex-direction:column; gap:16px;">
        <div>
          <div style="font-size:11px; opacity:0.6; margin-bottom:6px;">Room Name (locked) = ${room.name}</div>
          <div style="width:100%; padding:10px 12px; background:#0f0f0f; border:1px solid #1a1a1a; border-radius:6px; color:#777; font-size:13px;">${room.name || room.main || ''}</div>
        </div>
        <div>
          <div style="font-size:11px; opacity:0.7; margin-bottom:8px;">Room Icon - square</div>
          <div style="text-align:center;">
            <img id="editRoomAvatarPreview" src="${room.avatar_url || room.icon_url || '../shared/default-avatar.png'}" style="width:80px; height:80px; border-radius:12px; object-fit:cover; background:#222; border:1px solid #222;">
          </div>
          <div style="display:flex; gap:8px; margin-top:10px;">
            <input type="file" id="roomAvatarInput" accept="image/*" hidden>
            <button id="chooseRoomAvatarBtn" style="flex:1; padding:8px; background:#222; border:none; border-radius:6px; color:#fff; font-size:12px; cursor:pointer;">Choose a file</button>
            <button id="removeRoomAvatar" style="flex:1; padding:8px; background:#222; border:none; border-radius:6px; color:#fff; font-size:12px; cursor:pointer;">Remove</button>
          </div>
        </div>
        <div>
          <div style="font-size:11px; opacity:0.7; margin:14px 0 8px;">Banner Image - wider</div>
          <img id="editRoomBannerPreview" src="${room.banner_url || ''}" style="width:100%; height:110px; object-fit:cover; border-radius:8px; background:#151515; display:${room.banner_url? 'block' : 'none'}; margin-bottom:8px;">
          <div style="display:flex; gap:8px;">
            <input type="file" id="roomBannerInput" accept="image/*" hidden>
            <button id="chooseRoomBannerBtn" style="flex:1; padding:8px; background:#222; border:none; border-radius:6px; color:#fff; font-size:12px; cursor:pointer;">Choose a file</button>
            <button id="removeRoomBanner" style="flex:1; padding:8px; background:#222; border:none; border-radius:6px; color:#fff; font-size:12px; cursor:pointer;">Remove</button>
          </div>
        </div>
        <div>
          <div style="font-size:11px;">Description / About</div>
          <textarea id="editRoomDesc" rows="4" style="width:100%; margin-top:6px; padding:10px 12px; background:#151515; border:1px solid #222; border-radius:6px; color:#fff; font-size:13px; resize:none;">${room.description || room.about || ''}</textarea>
        </div>
        <div style="background:#151515; border:1px solid #222; border-radius:8px; padding:12px;">
          <div style="font-size:11px; opacity:0.7; margin-bottom:8px;">Password Protection</div>
          <div style="display:flex; gap:6px;">
            <input id="editRoomPassword" type="text" value="${room.password || ''}" placeholder="No password - set one" style="flex:1; padding:9px; background:#0f0f0f; border:1px solid #222; border-radius:6px; color:#fff; font-size:13px;">
            <button id="savePassBtn" style="padding:9px 12px; background:#ff2a6d; border:none; border-radius:6px; color:#fff; font-size:12px; cursor:pointer;">Save</button>
            <button id="removePassBtn" style="padding:9px 12px; background:#222; border:none; border-radius:6px; color:#fff; font-size:12px; cursor:pointer;">Remove</button>
          </div>
          <div style="font-size:10px; opacity:0.5; margin-top:6px;">Leave empty to remove, type to change/set</div>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; background:#151515; border:1px solid #222; border-radius:6px; padding:10px 12px;">
          <span style="font-size:13px;">Allow new members to join</span>
          <input type="checkbox" id="allowJoinToggle" ${room.allow_new_join!== false? 'checked' : ''} style="width:18px; height:18px; accent-color:#ff2a6d;">
        </div>
        <button id="saveRoomBtn" style="width:100%; padding:12px; background:#ff2a6d; border:none; border-radius:8px; color:#fff; font-weight:bold; font-size:13px; cursor:pointer;">Update Room</button>
        <button onclick="window.showRoomProfileHandler(window.currentRoom)" style="width:100%; padding:10px; background:#1e1e1e; border:none; border-radius:8px; color:#fff; font-size:12px; cursor:pointer;">Cancel</button>
        <div style="border-top:1px solid #1a1a1a; margin-top:10px; padding-top:14px;">
          <button onclick="window.showMembersSidebarHandler('${room.id}')" style="width:100%; padding:10px; background:#222; border:none; border-radius:8px; color:#fff; font-size:12px; margin-bottom:8px; cursor:pointer;">View Members</button>
          <button id="leaveRoomBtn2" style="width:100%; padding:10px; background:#222; border:none; border-radius:8px; color:#ff4d4d; font-size:12px; cursor:pointer;">Leave Room</button>
        </div>
      </div>
    </div>
  `

  document.getElementById('chooseRoomAvatarBtn').onclick = () =>
    document.getElementById('roomAvatarInput').click()
  document.getElementById('roomAvatarInput').onchange = e => {
    const f = e.target.files[0]
    if (!f) return
    pendingRoomAvatarFile = f
    pendingRoomAvatarRemove = false
    document.getElementById('editRoomAvatarPreview').src = URL.createObjectURL(f)
  }
  document.getElementById('removeRoomAvatar').onclick = () => {
    pendingRoomAvatarFile = null
    pendingRoomAvatarRemove = true
    document.getElementById('editRoomAvatarPreview').src = '../shared/default-avatar.png'
  }

  document.getElementById('chooseRoomBannerBtn').onclick = () =>
    document.getElementById('roomBannerInput').click()
  document.getElementById('roomBannerInput').onchange = e => {
    const f = e.target.files[0]
    if (!f) return
    pendingRoomBannerFile = f
    pendingRoomBannerRemove = false
    const p = document.getElementById('editRoomBannerPreview')
    p.src = URL.createObjectURL(f)
    p.style.display = 'block'
  }
  document.getElementById('removeRoomBanner').onclick = () => {
    pendingRoomBannerFile = null
    pendingRoomBannerRemove = true
    const p = document.getElementById('editRoomBannerPreview')
    p.src = ''
    p.style.display = 'none'
  }

  document.getElementById('savePassBtn').onclick = async () => {
    const pw = document.getElementById('editRoomPassword').value.trim() || null
    await supabase.from('rooms').update({ password: pw }).eq('id', room.id)
    showToast(pw? 'Password set' : 'Password removed')
    room.password = pw
    currentRoom.password = pw
  }

  document.getElementById('removePassBtn').onclick = async () => {
    await supabase.from('rooms').update({ password: null }).eq('id', room.id)
    document.getElementById('editRoomPassword').value = ''
    room.password = null
    currentRoom.password = null
    showToast('Password removed')
  }

  document.getElementById('leaveRoomBtn2').onclick = async () => {
    const ok = await showConfirm('Leave group? It will stay in list')
    if (ok) {
      await supabase.from('room_members').delete().eq('room_id', room.id).eq('user_id', window.currentUser.id)
      await loadRooms(window.currentUser)
      rightSidebar.classList.add('hidden')
      if (currentRoomId === room.id) {
        currentRoomId = null
        const msgEl = document.getElementById('messages')
        if (msgEl) msgEl.innerHTML = '<div style="opacity:0.5;text-align:center;margin-top:40px;">Select a room</div>'
      }
    }
  }

  document.getElementById('saveRoomBtn').onclick = async () => {
    const btn = document.getElementById('saveRoomBtn')
    btn.textContent = 'Updating...'
    btn.disabled = true

    let updates = {}
    const descVal = document.getElementById('editRoomDesc').value
    updates.description = descVal
    updates.about = descVal

    const pwVal = document.getElementById('editRoomPassword').value.trim()
    updates.password = pwVal || null

    if (pendingRoomAvatarFile) {
      const name = `room-${room.id}-avatar-${Date.now()}.${pendingRoomAvatarFile.name.split('.').pop()}`
      const { error } = await supabase
      .storage.from('room-icons')
      .upload(name, pendingRoomAvatarFile, { upsert: true })
      if (!error) {
        const { data } = supabase.storage.from('room-icons').getPublicUrl(name)
        updates.icon_url = data.publicUrl
        updates.avatar_url = data.publicUrl
      }
    } else if (pendingRoomAvatarRemove) {
      updates.icon_url = null
      updates.avatar_url = null
    }

    if (pendingRoomBannerFile) {
      const name = `room-${room.id}-banner-${Date.now()}.${pendingRoomBannerFile.name.split('.').pop()}`
      const { error } = await supabase.storage.from('banners').upload(name, pendingRoomBannerFile)
      if (!error) {
        const { data } = supabase.storage.from('banners').getPublicUrl(name)
        updates.banner_url = data.publicUrl
      }
    } else if (pendingRoomBannerRemove) {
      updates.banner_url = null
    }

    let withJoin = {...updates, allow_new_join: document.getElementById('allowJoinToggle').checked }
    let { data, error } = await supabase
    .from('rooms')
    .update(withJoin)
    .eq('id', room.id)
    .select()
    .single()

    if (error && error.message.includes('allow_new_join')) {
      const res2 = await supabase.from('rooms').update(updates).eq('id', room.id).select().single()
      data = res2.data
      error = res2.error
    }

    if (error) {
      btn.textContent = 'Update Room'
      btn.disabled = false
      return showToast(error.message)
    }

    try {
      const { data: mems } = await supabase
      .from('room_members')
      .select('user_id')
      .eq('room_id', room.id)
      const notifs = (mems || [])
      .filter(m => m.user_id!== window.currentUser.id)
      .map(m => ({
          user_id: m.user_id,
          type: 'room_update',
          status: 'pending',
          content: `Room ${data.name} was updated - [View]`,
          room_id: room.id,
          from_user: window.currentUser.id
        }))
      if (notifs.length > 0) await supabase.from('notifications').insert(notifs)
    } catch (e) {}

    currentRoom = data
    showRoomProfile(data)
    await loadRooms(window.currentUser)
  }
}

window.showRoomProfileHandler = (room) => {
  if (typeof room === 'string') {
    supabase.from('rooms').select('*').eq('id', room).single().then(({ data }) => {
      if (data) showRoomProfile(data)
    })
  } else {
    showRoomProfile(room)
  }
}
window.showMembersSidebarHandler = (roomId) => {
  const { showMembersSidebar } = window
  if (showMembersSidebar) showMembersSidebar(roomId)
}