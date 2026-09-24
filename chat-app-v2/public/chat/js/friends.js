import { supabase } from '../../shared/supabase.js'
import { showToast } from './ui.js'

let friendsCache = { friends: [], sent: [], received: [] }
export function getFriendsCache() { return friendsCache }
export function setFriendsCache(val) { friendsCache = val }

export function setupFriendsRealtime(currentUser) {
  supabase.channel('friends-live')
  .on('postgres_changes', {event:'*', schema:'public', table:'friend_requests', filter:`to_id=eq.${currentUser.id}`}, async()=>{
    await loadFriendsData(currentUser)
    if(document.getElementById('friendsTabs')) showFriends(document.querySelector('.fTab.active')?.dataset.tab || 'received')
  })
  .on('postgres_changes', {event:'*', schema:'public', table:'friend_requests', filter:`from_id=eq.${currentUser.id}`}, () => loadFriendsData(currentUser))
  .subscribe()
}

export async function loadFriendsData(currentUser) {
  try{
    const { data: friends, error: fErr } = await supabase.from('friends').select('friend_id').eq('user_id', currentUser.id)
    if(fErr) console.log('friends err', fErr)
    let friendIds = friends?.map(f=>f.friend_id) || []
    let friendProfs = []
    if(friendIds.length){
      const {data} = await supabase.from('profiles').select('id,username,avatar_url').in('id', friendIds)
      friendProfs = data || []
    }
    const {data: sentRaw, error: sErr} = await supabase.from('friend_requests').select('to_id').eq('from_id', currentUser.id).eq('status','pending')
    if(sErr) console.log('sent err', sErr)
    const {data: receivedRaw, error: rErr} = await supabase.from('friend_requests').select('id,from_id').eq('to_id', currentUser.id).eq('status','pending')
    if(rErr) console.log('received err', rErr)

    let sent = []
    if(sentRaw?.length){
      const ids = sentRaw.map(r=>r.to_id)
      const {data: profs} = await supabase.from('profiles').select('id,username,avatar_url').in('id', ids)
      sent = sentRaw.map(r=>({ to_id: r.to_id, profiles: profs?.find(p=>p.id===r.to_id) }))
    }
    let received = []
    if(receivedRaw?.length){
      const ids = receivedRaw.map(r=>r.from_id)
      const {data: profs} = await supabase.from('profiles').select('id,username,avatar_url').in('id', ids)
      received = receivedRaw.map(r=>({ id: r.id, from_id: r.from_id, profiles: profs?.find(p=>p.id===r.from_id) }))
    }

    friendsCache = { friends: friendProfs, sent, received }
    updateFriendsDot()
  }catch(e){ console.log(e) }
}

export function updateFriendsDot(){
  const nav = document.querySelector('.nav-item[data-view="friends"]')
  if(!nav) return
  let dot = nav.querySelector('#friendsDot')
  if(!dot){
    dot = document.createElement('span'); dot.id='friendsDot'
    dot.style.cssText='background:#ff2a6d;color:#fff;padding:2px 7px;border-radius:12px;font-size:10px;margin-left:8px;display:none;font-weight:bold'
    nav.style.display='flex'; nav.style.justifyContent='space-between'; nav.style.alignItems='center'
    nav.appendChild(dot)
  }
  const count = friendsCache.received.length
  if(count>0){ dot.textContent=count; dot.style.display='inline-flex' } else { dot.style.display='none' }
}

export async function sendFriendRequest(toId, currentUser){
  if(toId===currentUser.id) return showToast('That is you')
  if(friendsCache.friends.some(f=>f.id===toId)) return showToast('Already friends')
  if(friendsCache.sent.some(s=>s.to_id===toId)) return showToast('Already sent')
  const {error} = await supabase.from('friend_requests').insert({from_id:currentUser.id, to_id:toId, status:'pending'})
  if(error){ console.log(error); return showToast('Already sent or blocked') }
  showToast('Request sent!'); await loadFriendsData(currentUser)
}

export function showFriends(tab='friends', currentUser=null){
  const rightContent = document.getElementById('right-content')
  const rightSidebar = document.getElementById('rightSidebar')
  rightSidebar.classList.remove('hidden')
  rightContent.innerHTML = `
    <div class="rs-header"><h3>FRIENDS</h3><button class="rs-close" onclick="document.getElementById('rightSidebar').classList.add('hidden')">✕</button></div>
    <div id="friendsTabs" style="display:flex;gap:6px;padding:10px;border-bottom:1px solid #1a1a1a">
      <button class="fTab ${tab==='friends'?'active':''}" data-tab="friends" style="flex:1;padding:8px;background:${tab==='friends'?'#ff2a6d':'#1e1e1e'};border:none;border-radius:6px;color:#fff;cursor:pointer;font-size:12px">Friends [${friendsCache.friends.length}]</button>
      <button class="fTab ${tab==='sent'?'active':''}" data-tab="sent" style="flex:1;padding:8px;background:${tab==='sent'?'#ff2a6d':'#1e1e1e'};border:none;border-radius:6px;color:#fff;cursor:pointer;font-size:12px">Sent</button>
      <button class="fTab ${tab==='received'?'active':''}" data-tab="received" style="flex:1;padding:8px;background:${tab==='received'?'#ff2a6d':'#1e1e1e'};border:none;border-radius:6px;color:#fff;cursor:pointer;font-size:12px">Received ${friendsCache.received.length?`(${friendsCache.received.length})`:''}</button>
    </div>
    <div id="friendsContent" style="padding:10px;display:flex;flex-direction:column;gap:8px"></div>
  `
  document.querySelectorAll('.fTab').forEach(b=>{ b.onclick=()=> showFriends(b.dataset.tab) })
  const c = document.getElementById('friendsContent')
  if(tab==='friends'){
    if(!friendsCache.friends.length) c.innerHTML=`<div style="opacity:.5;text-align:center;margin-top:30px">No friends yet</div>`
    else c.innerHTML = friendsCache.friends.map(f=>`<div style="display:flex;align-items:center;gap:10px;background:#111;padding:8px;border-radius:8px"><img src="${f.avatar_url||'../shared/default-avatar.png'}" style="width:36px;height:36px;border-radius:50%"><span style="flex:1;color:#fff;font-size:13px">${f.username}</span><button onclick="window.showUserProfileHandler('${f.id}')" style="padding:5px 10px;background:#222;border:none;border-radius:6px;color:#fff;cursor:pointer">Profile</button><button onclick="window.removeFriendHandler('${f.id}')" style="padding:5px 10px;background:#ff2a6d;border:none;border-radius:6px;color:#fff;cursor:pointer">Remove</button></div>`).join('')
  }
  if(tab==='sent'){
    if(!friendsCache.sent.length) c.innerHTML=`<div style="opacity:.5;text-align:center;margin-top:30px">No sent requests</div>`
    else c.innerHTML = friendsCache.sent.map(s=>`<div style="display:flex;align-items:center;gap:10px;background:#111;padding:8px;border-radius:8px"><img src="${s.profiles?.avatar_url||'../shared/default-avatar.png'}" style="width:36px;height:36px;border-radius:50%"><span style="flex:1;color:#fff;font-size:13px">${s.profiles?.username}</span><button onclick="window.cancelRequestHandler('${s.to_id}')" style="padding:5px 10px;background:#333;border:none;border-radius:6px;color:#fff;cursor:pointer">Cancel</button></div>`).join('')
  }
  if(tab==='received'){
    if(!friendsCache.received.length) c.innerHTML=`<div style="opacity:.5;text-align:center;margin-top:30px">No requests</div>`
    else c.innerHTML = friendsCache.received.map(r=>`<div style="display:flex;align-items:center;gap:10px;background:#111;padding:8px;border-radius:8px"><img src="${r.profiles?.avatar_url||'../shared/default-avatar.png'}" style="width:36px;height:36px;border-radius:50%"><span style="flex:1;color:#fff;font-size:13px">${r.profiles?.username}</span><button onclick="window.handleFriendReqHandler('${r.id}','${r.from_id}',true)" style="padding:5px 10px;background:#23a559;border:none;border-radius:6px;color:#fff;cursor:pointer">Accept</button><button onclick="window.handleFriendReqHandler('${r.id}','${r.from_id}',false)" style="padding:5px 10px;background:#222;border:none;border-radius:6px;color:#fff;cursor:pointer">Decline</button></div>`).join('')
  }
}

export async function handleFriendReq(reqId, fromId, accept, currentUser){
  if(accept){ await supabase.from('friends').insert([{user_id:currentUser.id,friend_id:fromId},{user_id:fromId,friend_id:currentUser.id}]) }
  await supabase.from('friend_requests').delete().eq('id', reqId)
  await loadFriendsData(currentUser)
  showFriends(accept?'friends':'received')
  showToast(accept?'Friend added':'Declined')
}

export async function cancelRequest(toId, currentUser){
  await supabase.from('friend_requests').delete().eq('from_id',currentUser.id).eq('to_id',toId)
  await loadFriendsData(currentUser)
  showFriends('sent')
}

export async function removeFriend(friendId, currentUser){
  const { showConfirm } = await import('./ui.js')
  const ok = await showConfirm('Remove friend?')
  if(!ok) return
  await supabase.from('friends').delete().or(`and(user_id.eq.${currentUser.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${currentUser.id})`)
  await loadFriendsData(currentUser)
  showFriends('friends')
}

// Global handlers for inline onclick
window.handleFriendReqHandler = (reqId, fromId, accept) => {
  handleFriendReq(reqId, fromId, accept, window.currentUser)
}
window.cancelRequestHandler = (toId) => {
  cancelRequest(toId, window.currentUser)
}
window.removeFriendHandler = (friendId) => {
  removeFriend(friendId, window.currentUser)
}
