import { supabase } from '../../shared/supabase.js'
import { showToast, showConfirm } from './ui.js'

let blockedCache = []
export function getBlockedCache() { return blockedCache }
export function setBlockedCache(val) { blockedCache = val }

export async function loadBlockedData(currentUser) {
  console.log("loading blocked...")
  const {data, error} = await supabase.from('blocked_users').select('blocked_id').eq('user_id', currentUser.id)
  console.log("blocked raw:", data, error)
  if(error){ showToast(error.message); return }
  let ids = data?.map(d=>d.blocked_id)||[]
  if(!ids.length){ blockedCache=[]; return }
  const {data: profs} = await supabase.from('profiles').select('id,username,avatar_url').in('id', ids)
  blockedCache = profs || []
  console.log("blockedCache:", blockedCache)
}

export async function blockUser(userId, currentUser) {
  const ok = await showConfirm('Block this user?')
  if(!ok) return
  console.log("blocking", userId)
  const {error} = await supabase.from('blocked_users').insert({user_id:currentUser.id, blocked_id:userId})
  if(error){ 
    console.log("block error:", error)
    return showToast("Block failed: " + error.message) 
  }
  await supabase.from('friends').delete().or(`and(user_id.eq.${currentUser.id},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${currentUser.id})`)
  await supabase.from('friend_requests').delete().or(`and(from_id.eq.${currentUser.id},to_id.eq.${userId}),and(from_id.eq.${userId},to_id.eq.${currentUser.id})`)
  await loadBlockedData(currentUser)
  showToast('User blocked')
  showBlocked()
}

export function showBlocked() {
  const rightContent = document.getElementById('right-content')
  const rightSidebar = document.getElementById('rightSidebar')
  rightSidebar.classList.remove('hidden')
  rightContent.innerHTML = `
    <div class="rs-header"><h3>BLOCKED</h3><button class="rs-close" onclick="document.getElementById('rightSidebar').classList.add('hidden')">✕</button></div>
    <div style="padding:10px;display:flex;flex-direction:column;gap:8px">
      ${!blockedCache.length? `<div style="opacity:.5;text-align:center;margin-top:30px">No blocked users</div>` :
      blockedCache.map(u=>`<div style="display:flex;align-items:center;gap:10px;background:#111;padding:8px;border-radius:8px"><img src="${u.avatar_url||'../shared/default-avatar.png'}" style="width:36px;height:36px;border-radius:50%"><span style="flex:1;color:#fff;font-size:13px">${u.username}</span><button onclick="window.unblockUserHandler('${u.id}')" style="padding:5px 10px;background:#222;border:none;border-radius:6px;color:#fff;cursor:pointer">Unblock</button></div>`).join('')}
    </div>`
}

export async function unblockUser(userId, currentUser) {
  await supabase.from('blocked_users').delete().eq('user_id', currentUser.id).eq('blocked_id', userId)
  await loadBlockedData(currentUser)
  showBlocked()
}

window.unblockUserHandler = (userId) => {
  const { supabase: sb } = window.ccState || {}
  if (!sb) return
  supabase.from('blocked_users').delete().eq('blocked_id', userId).then(() => {
    loadBlockedData(window.currentUser)
    showBlocked()
  })
}
