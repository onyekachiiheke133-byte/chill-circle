import { supabase } from '../../shared/supabase.js'
import { showToast } from './ui.js'

let channel = null
let typingChannel = null
let typingTimeout = null

export function setChannel(ch) { channel = ch }
export function getChannel() { return channel }
export function setTypingChannel(ch) { typingChannel = ch }

export async function loadMessages(roomId) {
  const messagesEl = document.getElementById('messages')
  if (!messagesEl) return // ADDED
  messagesEl.innerHTML = '' // ADDED
  const { data } = await supabase
   .from('messages')
   .select('*')
   .eq('room_id', roomId)
   .order('created_at')
  if (!data) return

  const ids = [...new Set(data.map(m => m.user_id))]
  const { data: profs } = await supabase
   .from('profiles')
   .select('id,username')
   .in('id', ids)

  data.forEach(m => {
    const p = profs?.find(x => x.id === m.user_id)
    const div = document.createElement('div')
    div.className = 'message'
    div.innerHTML = `<b style="cursor:pointer" onclick="window.showUserProfileHandler('${m.user_id}')">${p?.username || 'Anon'}</b>: ${m.content}`
    messagesEl.appendChild(div)
  })
  messagesEl.scrollTop = messagesEl.scrollHeight
}

export function setupTyping(roomId) {
  if (typingChannel) supabase.removeChannel(typingChannel)
  typingChannel = supabase
   .channel(`typing-${roomId}`)
   .on('broadcast', { event: 'typing' }, p => {
      if (p.payload.user_id === window.currentUser.id) return
      const ind = document.getElementById('typingIndicator')
      if (ind) {
        ind.textContent = `${p.payload.username} is typing...`
        clearTimeout(ind._t)
        ind._t = setTimeout(() => (ind.textContent = ''), 2000)
      }
    })
   .subscribe()
}

export async function sendTyping() {
  if (!window.currentRoomId ||!typingChannel) return
  const { data: prof } = await supabase
   .from('profiles')
   .select('username')
   .eq('id', window.currentUser.id)
   .single()
  typingChannel.send({
    type: 'broadcast',
    event: 'typing',
    payload: { user_id: window.currentUser.id, username: prof?.username || 'Someone' }
  })
}

export function subscribe(roomId) {
  const messagesEl = document.getElementById('messages')
  setupTyping(roomId)
  if (channel) supabase.removeChannel(channel)
  channel = supabase
   .channel(`room-${roomId}`)
   .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
      async p => {
        const { data: prof } = await supabase
         .from('profiles')
         .select('username')
         .eq('id', p.new.user_id)
         .single()
        const d = document.createElement('div')
        d.className = 'message'
        d.innerHTML = `<b style="cursor:pointer" onclick="window.showUserProfileHandler('${p.new.user_id}')">${prof?.username || 'New'}</b>: ${p.new.content}`
        messagesEl.appendChild(d)
        messagesEl.scrollTop = messagesEl.scrollHeight
        const ti = document.getElementById('typingIndicator')
        if (ti) ti.textContent = ''
      }
    )
   .subscribe()
}

export function setupSend() {
  const sendBtn = document.getElementById('sendBtn')
  const messageInput = document.getElementById('messageInput')
  if (!sendBtn ||!messageInput) return

  sendBtn.onclick = send
  messageInput.onkeypress = e => {
    if (e.key === 'Enter') send()
  }
  messageInput.oninput = () => {
    if (typingTimeout) clearTimeout(typingTimeout)
    sendTyping()
    typingTimeout = setTimeout(() => {}, 1000)
  }
}

export async function send() {
  const messageInput = document.getElementById('messageInput')
  const c = messageInput.value.trim()
  if (!c ||!window.currentRoomId) return

  const { error } = await supabase
   .from('messages')
   .insert({ room_id: window.currentRoomId, user_id: window.currentUser.id, content: c })
   .select()
   .single()
  messageInput.value = ''
  if (error) return

  try {
    const mentions = [...c.matchAll(/@([a-z0-9_]{2,20})/gi)].map(m => m[1].toLowerCase())
    if (mentions.length > 0) {
      const { data: profiles } = await supabase
       .from('profiles')
       .select('id,username')
       .in('username', mentions)

      let matched = profiles || []
      if (matched.length === 0) {
        const { data: all } = await supabase.from('profiles').select('id,username').limit(200)
        matched = (all || []).filter(p => mentions.includes(p.username.toLowerCase()))
      }

      const uniq = [...new Map(matched.map(p => [p.id, p])).values()].filter(
        p => p.id!== window.currentUser.id
      )
      if (uniq.length > 0) {
        const { data: me } = await supabase
         .from('profiles')
         .select('username')
         .eq('id', window.currentUser.id)
         .single()
        const notifs = uniq.map(p => ({
          user_id: p.id,
          type: 'mention',
          status: 'pending',
          content: `${me?.username || 'Someone'} mentioned you in ${window.currentRoom?.name || 'a room'}: ${c.slice(0, 60)}`,
          room_id: window.currentRoomId,
          from_user: window.currentUser.id
        }))
        await supabase.from('notifications').insert(notifs)
      }
    }
  } catch (e) {}
}

export async function loadMessagesFromRoom(roomId) {
  window.currentRoomId = roomId // ADDED
  await loadMessages(roomId)
  await subscribe(roomId)
}