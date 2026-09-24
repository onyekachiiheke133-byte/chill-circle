import { supabase } from '../../shared/supabase.js'
import { showToast } from './ui.js'

let lastPendingCount = 0
let allNotifsCache = []

export function setLastPendingCount(count) { lastPendingCount = count }
export function getLastPendingCount() { return lastPendingCount }

export function setupRealtime(currentUser) {
  supabase
    .channel('rooms-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, async () => {
      const { loadRooms } = await import('./rooms.js')
      await loadRooms(currentUser)
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'room_members' }, async () => {
      const { loadRooms } = await import('./rooms.js')
      await loadRooms(currentUser)
    })
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUser?.id}` },
      p => {
        playNotifSound()
        showToast(p.new.content)
        if (document.querySelector('#notifList')) showNotifications()
        updateNotifCount(currentUser)
      }
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUser?.id}` },
      () => {
        if (document.querySelector('#notifList')) showNotifications()
        updateNotifCount(currentUser)
      }
    )
    .subscribe()
}

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

export async function updateNotifCount(currentUser) {
  const badge = document.getElementById('notifCount')
  const badgeTop = document.getElementById('notifCountTop')
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', currentUser.id)
    .eq('status', 'pending')
  if (error) return
  if (count > lastPendingCount && lastPendingCount !== 0) playNotifSound()
  lastPendingCount = count || 0
  const show = count && count > 0
  if (badge) {
    badge.textContent = count
    badge.style.display = show ? 'inline-flex' : 'none'
  }
  if (badgeTop) {
    badgeTop.textContent = count > 9 ? '9+' : count
    badgeTop.style.display = show ? 'flex' : 'none'
  }
}

export async function showNotifications(filter = 'all') {
  const rightContent = document.getElementById('right-content')
  const rightSidebar = document.getElementById('rightSidebar')
  rightSidebar.classList.remove('hidden')
  rightContent.innerHTML = `
    <div class="rs-header"><h3>Notifications</h3><div style="display:flex;gap:6px;align-items:center;"><button class="mark-all" id="markAllBtn">Mark all read</button><button class="rs-close" onclick="document.getElementById('rightSidebar').classList.add('hidden')">✕</button></div></div>
    <div class="notif-filters">
      <button data-f="all" class="${filter === 'all' ? 'active' : ''}">All</button>
      <button data-f="pending" class="${filter === 'pending' ? 'active' : ''}">Pending</button>
      <button data-f="join_request" class="${filter === 'join_request' ? 'active' : ''}">Requests</button>
      <button data-f="accepted" class="${filter === 'accepted' ? 'active' : ''}">Accepted</button>
      <button data-f="declined" class="${filter === 'declined' ? 'active' : ''}">Declined</button>
    </div>
    <div id="notifList" style="padding:12px; display:flex; flex-direction:column; gap:8px;">Loading...</div>
  `
  document.querySelectorAll('.notif-filters button').forEach(b => {
    b.onclick = () => showNotifications(b.dataset.f)
  })
  document.getElementById('markAllBtn').onclick = async () => {
    await supabase
      .from('notifications')
      .update({ status: 'read' })
      .eq('user_id', window.currentUser.id)
      .eq('status', 'pending')
      .neq('type', 'join_request')
    await updateNotifCount(window.currentUser)
    showNotifications(filter)
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  await supabase
    .from('notifications')
    .delete()
    .eq('user_id', window.currentUser.id)
    .eq('status', 'declined')
    .lt('created_at', sevenDaysAgo)
  await supabase
    .from('notifications')
    .delete()
    .eq('user_id', window.currentUser.id)
    .in('status', ['accepted', 'read'])
    .lt('created_at', thirtyDaysAgo)

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', window.currentUser.id)
    .order('created_at', { ascending: false })
    .limit(80)
  const list = document.getElementById('notifList')
  if (error) {
    list.innerHTML = `<div style="color:#ff4d4d">${error.message}</div>`
    return
  }
  if (!data || data.length === 0) {
    list.innerHTML = `<div style="opacity:.5;text-align:center;margin-top:30px;">No notifications</div>`
    await updateNotifCount(window.currentUser)
    return
  }

  const toAutoRead = data
    .filter(n => n.status === 'pending' && n.type !== 'join_request')
    .map(n => n.id)
  if (toAutoRead.length > 0) {
    await supabase.from('notifications').update({ status: 'read' }).in('id', toAutoRead)
    setTimeout(() => updateNotifCount(window.currentUser), 500)
  }

  let filtered = data
  if (filter === 'pending') filtered = data.filter(n => n.status === 'pending')
  if (filter === 'accepted') filtered = data.filter(n => n.status === 'accepted' || n.status === 'read')
  if (filter === 'declined') filtered = data.filter(n => n.status === 'declined')
  if (filter === 'join_request') filtered = data.filter(n => n.type === 'join_request')

  if (filtered.length === 0) {
    list.innerHTML = `<div style="opacity:.5;text-align:center;margin-top:20px;">No ${filter}</div>`
    return
  }

  list.innerHTML = ''
  for (const n of filtered) {
    const isPending = n.status === 'pending'
    const div = document.createElement('div')
    div.className = `notif-item ${isPending ? 'pending' : 'read'}`
    let typeBadge = `<span class="notif-type type-${n.type}">${n.type.replace('_', ' ')}</span>`
    let rightSide = ''

    if (isPending && n.type === 'join_request') {
      rightSide = `<button class="acceptBtn" style="padding:6px 10px;background:#23a559;border:none;border-radius:6px;color:#fff;cursor:pointer;font-size:12px;">Accept</button><button class="declineBtn" style="padding:6px 10px;background:#222;border:none;border-radius:6px;color:#fff;cursor:pointer;font-size:12px;">Decline</button>`
    } else if (n.status === 'accepted') {
      rightSide =
        n.type === 'join_request'
          ? `<span style="color:#23a559;font-size:12px;font-weight:bold;">Accepted ✓</span>`
          : `<span style="color:#23a559;font-size:12px;">Done</span>`
    } else if (n.status === 'declined') {
      rightSide = `<span style="color:#888;font-size:12px;">Declined</span>`
    } else if (n.type === 'join_accepted') {
      rightSide = isPending
        ? `<button class="goBtn btn-open">Open</button>`
        : `<span style="color:#23a559;font-size:12px;">Joined</span>`
    } else if (n.type === 'join_declined') {
      rightSide = isPending
        ? `<button class="dismissBtn" style="padding:6px 10px;background:#222;border:none;border-radius:6px;color:#fff;cursor:pointer;font-size:12px;">Dismiss</button>`
        : `<span style="color:#888;font-size:12px;">Declined</span>`
    } else if (n.type === 'mention') {
      rightSide = `<button class="goBtn btn-open">Open</button>`
    } else if (n.type === 'room_update') {
      rightSide = `<button class="viewBtn btn-view">View</button>`
    } else if (n.status === 'read') {
      rightSide = `<span style="color:#555;font-size:11px;">Read</span>`
    }

    div.innerHTML = `<div style="font-size:13px;flex:1;">${typeBadge} ${n.content}</div><div style="display:flex;gap:6px;">${rightSide}</div>`

    const acceptBtn = div.querySelector('.acceptBtn')
    if (acceptBtn) {
      acceptBtn.onclick = async () => {
        await supabase
          .from('room_members')
          .insert({ room_id: n.room_id, user_id: n.from_user, role: 'User' })
        await supabase
          .from('room_join_requests')
          .delete()
          .eq('room_id', n.room_id)
          .eq('user_id', n.from_user)
        await supabase.from('notifications').update({ status: 'accepted' }).eq('id', n.id)
        const { data: room } = await supabase
          .from('rooms')
          .select('name')
          .eq('id', n.room_id)
          .single()
        await supabase.from('notifications').insert({
          user_id: n.from_user,
          type: 'join_accepted',
          status: 'pending',
          content: `You've been accepted to ${room?.name || 'the room'}`,
          room_id: n.room_id,
          from_user: window.currentUser.id
        })
        showToast('User added')
        showNotifications(filter)
        updateNotifCount(window.currentUser)
        const { loadRooms } = await import('./rooms.js')
        await loadRooms(window.currentUser)
      }
    }

    const declineBtn = div.querySelector('.declineBtn')
    if (declineBtn) {
      declineBtn.onclick = async () => {
        await supabase
          .from('room_join_requests')
          .delete()
          .eq('room_id', n.room_id)
          .eq('user_id', n.from_user)
        await supabase.from('notifications').update({ status: 'declined' }).eq('id', n.id)
        const { data: room } = await supabase
          .from('rooms')
          .select('name')
          .eq('id', n.room_id)
          .single()
        await supabase.from('notifications').insert({
          user_id: n.from_user,
          type: 'join_declined',
          status: 'pending',
          content: `Your request to join ${room?.name || 'the room'} was declined`,
          room_id: n.room_id,
          from_user: window.currentUser.id
        })
        showToast('Declined - user notified')
        showNotifications(filter)
        updateNotifCount(window.currentUser)
      }
    }

    const goBtn = div.querySelector('.goBtn')
    if (goBtn) {
      goBtn.onclick = async () => {
        await supabase.from('notifications').update({ status: 'read' }).eq('id', n.id)
        const { joinRoom } = await import('./rooms.js')
        const el = [...document.querySelectorAll('.room-item')].find(x => x.dataset.id === n.room_id)
        if (el) joinRoom(n.room_id, '', el)
        else {
          const { loadRooms } = await import('./rooms.js')
          await loadRooms(window.currentUser)
          const el2 = [...document.querySelectorAll('.room-item')].find(x => x.dataset.id === n.room_id)
          if (el2) joinRoom(n.room_id, '', el2)
        }
        showNotifications(filter)
        updateNotifCount(window.currentUser)
      }
    }

    const viewBtn = div.querySelector('.viewBtn')
    if (viewBtn) {
      viewBtn.onclick = async () => {
        await supabase.from('notifications').update({ status: 'read' }).eq('id', n.id)
        const { data: room } = await supabase.from('rooms').select('*').eq('id', n.room_id).single()
        if (room) {
          const { showRoomProfile } = await import('./rooms.js')
          showRoomProfile(room)
        }
        updateNotifCount(window.currentUser)
      }
    }

    const dismissBtn = div.querySelector('.dismissBtn')
    if (dismissBtn) {
      dismissBtn.onclick = async () => {
        await supabase.from('notifications').update({ status: 'read' }).eq('id', n.id)
        showNotifications(filter)
        updateNotifCount(window.currentUser)
      }
    }

    list.appendChild(div)
  }
  updateNotifCount(window.currentUser)
}
