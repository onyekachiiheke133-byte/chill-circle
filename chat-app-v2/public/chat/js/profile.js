import { supabase } from '../../shared/supabase.js'
import { showToast } from './ui.js'

let pendingAvatarFile = null
let pendingBannerFile = null
let pendingAvatarRemove = false
let pendingBannerRemove = false

export function getAge(d) {
  if (!d) return ''
  const t = new Date()
  const b = new Date(d)
  let a = t.getFullYear() - b.getFullYear()
  const m = t.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--
  return a
}

export async function showUserProfile(userId) {
  const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single()
  if (!profile) return

  const isMe = userId === window.currentUser.id
  const age = getAge(profile.birth_date)
  const joinDate = new Date(profile.created_at).toLocaleDateString()
  const rightContent = document.getElementById('right-content')
  const rightSidebar = document.getElementById('rightSidebar')
  rightSidebar.classList.remove('hidden')

  rightContent.innerHTML = `<div style="background:#0a0a0a; height:100%; overflow-y:auto; color:#fff; font-family:sans-serif;">
      <div style="height:110px; background:#111; background-image:url('${profile.banner_url || ''}'); background-size:cover; background-position:center; position:relative;">
        <button onclick="document.getElementById('rightSidebar').classList.add('hidden')" style="position:absolute; top:10px; right:10px; background:rgba(0,0,0,0.5); border:none; color:#fff; width:28px; height:28px; border-radius:50%; font-size:14px; cursor:pointer;">✕</button>
      </div>
      <div style="text-align:center; margin-top:-36px; position:relative; padding:0 16px;">
        <div style="position:relative; display:inline-block;">
          <img src="${profile.avatar_url || '../shared/default-avatar.png'}" style="width:80px; height:80px; border-radius:50%; background:#222; object-fit:cover; border:3px solid #0a0a0a;">
          <span style="position:absolute; bottom:4px; right:4px; width:12px; height:12px; background:#23a559; border-radius:50%; border:2px solid #0a0a0a;"></span>
        </div>
        <div style="margin-top:14px; font-weight:bold; font-size:16px;">${profile.username} ${age? `[${age} yrs]` : ''}</div>
        <div style="font-size:11px; opacity:0.4; margin-top:4px;">#</div>
        <div style="font-size:13px; opacity:0.9; margin-top:6px; padding:0 20px;">${profile.bio || 'GOAT'}</div>
        <div style="display:flex; gap:10px; justify-content:center; margin-top:18px;">
          ${isMe
          ? `<button id="editUserBtn" style="padding:8px 18px; background:#1e1e1e; border:none; border-radius:8px; color:#fff; font-size:12px; cursor:pointer;">Edit Profile</button>`
            : `<button id="messageBtn" style="padding:8px 18px; background:#ff2a6d; border:none; border-radius:8px; color:#fff; font-size:12px; cursor:pointer;">Message</button>
               <div style="position:relative">
                 <button id="optionsBtn" style="padding:8px 18px; background:#1e1e1e; border:none; border-radius:8px; color:#fff; font-size:12px; cursor:pointer;">Options ▼</button>
                 <div id="optionsMenu" style="display:none;position:absolute;top:36px;right:0;background:#1a1a1a;border:1px solid #333;border-radius:8px;padding:6px;z-index:10;width:160px">
                   <button id="optAddFriend" style="width:100%;padding:8px;background:transparent;border:none;color:#fff;text-align:left;cursor:pointer;font-size:12px">Add Friend</button>
                   <button id="optIgnore" style="width:100%;padding:8px;background:transparent;border:none;color:#fff;text-align:left;cursor:pointer;font-size:12px">Ignore User</button>
                   <button id="optBlock" style="width:100%;padding:8px;background:transparent;border:none;color:#ff4d4d;text-align:left;cursor:pointer;font-size:12px">Block User</button>
                   <button id="optReport" style="width:100%;padding:8px;background:transparent;border:none;color:#fff;text-align:left;cursor:pointer;font-size:12px">Report</button>
                 </div>
               </div>`
          }
        </div>
      </div>
      <div style="height:1px; background:#151515; margin:24px 16px;"></div>
      <div style="padding:0 20px;">
        <div style="display:flex; justify-content:space-between; padding:12px 0; font-size:13px;">
          <span style="opacity:0.5;">Last seen:</span><span style="font-weight:600;">Online now</span>
        </div>
        <div style="display:flex; justify-content:space-between; padding:12px 0; font-size:13px;">
          <span style="opacity:0.5;">Member since:</span><span style="font-weight:600;">${joinDate}</span>
        </div>
      </div>
      <div style="height:1px; background:#151515; margin:12px 16px;"></div>
      <div style="padding:8px 20px;">
        <div style="color:#ff2a6d; font-size:11px; font-weight:bold; letter-spacing:0.5px; margin:12px 0 8px;">PROFILE DETAILS</div>
        <div style="display:flex; justify-content:space-between; padding:12px 0; font-size:13px; border-bottom:1px solid #151515;"><span style="opacity:0.5;">Birth Date</span><span>${profile.birth_date || '2000-01-01'}</span></div>
        <div style="display:flex; justify-content:space-between; padding:12px 0; font-size:13px; border-bottom:1px solid #151515;"><span style="opacity:0.5;">Gender</span><span>${profile.gender || 'male'}</span></div>
        <div style="display:flex; justify-content:space-between; padding:12px 0; font-size:13px; border-bottom:1px solid #151515;"><span style="opacity:0.5;">Country</span><span>${profile.country || 'my mama'}</span></div>
        <div style="display:flex; justify-content:space-between; padding:12px 0; font-size:13px;"><span style="opacity:0.5;">Joined</span><span>${joinDate}</span></div>
      </div>
      ${isMe? `<div style="padding:24px 20px 50px;">
        <button id="logoutBtn" style="width:100%; padding:13px; background:#ff2a6d; border:none; border-radius:10px; color:#fff; font-weight:bold; font-size:13px; cursor:pointer;">Logout</button>
      </div>` : `<div style="padding:24px 20px 50px;"></div>`}
    </div>
  `

  if(isMe){
    const eBtn = document.getElementById('editUserBtn')
    if(eBtn) eBtn.onclick = () => editUserProfile(profile)
    document.getElementById('logoutBtn').onclick = async () => {
      await supabase.auth.signOut()
      window.location.href = '../auth/sign.html'
    }
  } else {
    // FIXED: now uses real DM
    const msgBtn = document.getElementById('messageBtn')
    if(msgBtn) msgBtn.onclick = async () => {
      const { getOrCreateDM } = await import('./dm.js')
      await getOrCreateDM(userId)
      document.getElementById('rightSidebar').classList.add('hidden')
    }
    const oBtn = document.getElementById('optionsBtn')
    const oMenu = document.getElementById('optionsMenu')
    if(oBtn) oBtn.onclick = ()=> oMenu.style.display = oMenu.style.display==='none'?'block':'none'

    document.getElementById('optAddFriend').onclick = async () => {
      const { sendFriendRequest } = await import('./friends.js')
      await sendFriendRequest(userId, window.currentUser)
      showToast('Request sent')
      oMenu.style.display='none'
    }
    document.getElementById('optBlock').onclick = () => {
      window.blockUserHandler(userId)
      oMenu.style.display='none'
    }
    document.getElementById('optIgnore').onclick = async () => {
      const { ignoreUser } = await import('./ignored.js')
      await ignoreUser(userId)
      showToast('User ignored')
      oMenu.style.display='none'
    }
    document.getElementById('optReport').onclick = () => {
      showToast('Reported')
      oMenu.style.display='none'
    }
  }
}

export function editUserProfile(profile) {
  const rightContent = document.getElementById('right-content')
  const rightSidebar = document.getElementById('rightSidebar')
  pendingAvatarFile = null
  pendingBannerFile = null
  pendingAvatarRemove = false
  pendingBannerRemove = false
  rightSidebar.classList.remove('hidden')
  rightContent.innerHTML = `
    <div style="background:#0a0a0a; height:100%; overflow-y:auto; color:#fff; font-family:sans-serif; padding-bottom:30px;">
      <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; border-bottom:1px solid #1a1a1a;">
        <span style="color:#ff2a6d; font-weight:bold; font-size:14px;">Edit Profile</span>
        <button onclick="document.getElementById('rightSidebar').classList.add('hidden')" style="background:none; border:none; color:#fff; font-size:18px; cursor:pointer;">✕</button>
      </div>
      <div style="padding:16px; display:flex; flex-direction:column; gap:16px;">
        <div style="text-align:center; padding:10px 0;">
          <img id="editAvatarPreview" src="${profile.avatar_url || '../shared/default-avatar.png'}" style="width:80px; height:80px; border-radius:50%; object-fit:cover; background:#222;">
          <div id="avatarStatus" style="font-size:11px; opacity:0.5; margin-top:6px;"></div>
        </div>
        <div>
          <div style="font-size:11px; opacity:0.7; margin-bottom:6px;">New Password</div>
          <input id="editPass" type="password" placeholder="Password" style="width:100%; padding:10px 12px; background:#151515; border:1px solid #222; border-radius:6px; color:#fff; font-size:13px;">
          <div style="font-size:11px; opacity:0.7; margin:12px 0 6px;">Confirm Password</div>
          <input id="editConfirmPass" type="password" placeholder="Confirm Password" style="width:100%; padding:10px 12px; background:#151515; border:1px solid #222; border-radius:6px; color:#fff; font-size:13px;">
        </div>
        <div style="height:1px; background:#1a1a1a;"></div>
        <div>
          <div style="font-size:11px; opacity:0.7; margin-bottom:8px;">Custom Avatar</div>
          <div style="display:flex; gap:8px;">
            <input type="file" id="editAvatarInput" accept="image/*" hidden>
            <button id="chooseAvatarBtn" style="flex:1; padding:8px; background:#222; border:none; border-radius:6px; color:#fff; font-size:12px; cursor:pointer;">Choose a file</button>
            <button id="removeAvatar" style="flex:1; padding:8px; background:#222; border:none; border-radius:6px; color:#fff; font-size:12px; cursor:pointer;">Remove</button>
          </div>
          <div style="font-size:11px; opacity:0.7; margin:14px 0 8px;">Banner Image</div>
          <img id="editBannerPreview" src="${profile.banner_url || ''}" style="width:100%; height:60px; object-fit:cover; border-radius:6px; background:#151515; display:${profile.banner_url? 'block' : 'none'}; margin-bottom:8px;">
          <div style="display:flex; gap:8px;">
            <input type="file" id="userBannerInput" accept="image/*" hidden>
            <button id="chooseBannerBtn" style="flex:1; padding:8px; background:#222; border:none; border-radius:6px; color:#fff; font-size:12px; cursor:pointer;">Choose a file</button>
            <button id="removeBanner" style="flex:1; padding:8px; background:#222; border:none; border-radius:6px; color:#fff; font-size:12px; cursor:pointer;">Remove</button>
          </div>
        </div>
        <div style="height:1px; background:#1a1a1a;"></div>
        <div>
          <div style="font-size:11px;">About Me <span style="color:#ff2a6d;">*</span></div>
          <textarea id="editBio" rows="3" style="width:100%; margin-top:6px; padding:10px 12px; background:#151515; border:1px solid #222; border-radius:6px; color:#fff; font-size:13px; resize:none;">${profile.bio || 'GOAT'}</textarea>
        </div>
        <div style="opacity:0.6;">
          <div style="font-size:11px; margin-top:8px;">Birth Date</div>
          <div style="width:100%; margin-top:6px; padding:10px 12px; background:#0f0f0f; border:1px solid #1a1a1a; border-radius:6px; color:#777; font-size:13px;">${profile.birth_date || '01 / 01 / 2000'} (locked)</div>
          <div style="font-size:11px; margin-top:12px;">Gender</div>
          <div style="width:100%; margin-top:6px; padding:10px 12px; background:#0f0f0f; border:1px solid #1a1a1a; border-radius:6px; color:#777; font-size:13px;">${profile.gender || 'male'} (locked)</div>
          <div style="font-size:11px; margin-top:12px;">Country</div>
          <div style="width:100%; margin-top:6px; padding:10px 12px; background:#0f0f0f; border:1px solid #1a1a1a; border-radius:6px; color:#777; font-size:13px;">${profile.country || 'my mama'} (locked)</div>
        </div>
        <div style="margin-top:10px;">
          <button id="saveUserBtn" style="width:100%; padding:12px; background:#ff2a6d; border:none; border-radius:8px; color:#fff; font-weight:bold; font-size:13px; cursor:pointer;">Update</button>
          <button id="cancelUserBtn" style="width:100%; margin-top:8px; padding:10px; background:#1e1e1e; border:none; border-radius:8px; color:#fff; font-size:12px; cursor:pointer;">Cancel</button>
        </div>
      </div>
    </div>
  `

  document.getElementById('chooseAvatarBtn').onclick = () =>
    document.getElementById('editAvatarInput').click()
  document.getElementById('editAvatarInput').onchange = e => {
    const f = e.target.files[0]
    if (!f) return
    pendingAvatarFile = f
    pendingAvatarRemove = false
    document.getElementById('editAvatarPreview').src = URL.createObjectURL(f)
    document.getElementById('avatarStatus').textContent = 'New avatar ready - press Update'
  }
  document.getElementById('removeAvatar').onclick = () => {
    pendingAvatarFile = null
    pendingAvatarRemove = true
    document.getElementById('editAvatarPreview').src = '../shared/default-avatar.png'
    document.getElementById('avatarStatus').textContent = 'Avatar will be removed on Update'
  }

  document.getElementById('chooseBannerBtn').onclick = () =>
    document.getElementById('userBannerInput').click()
  document.getElementById('userBannerInput').onchange = e => {
    const f = e.target.files[0]
    if (!f) return
    pendingBannerFile = f
    pendingBannerRemove = false
    const prev = document.getElementById('editBannerPreview')
    prev.src = URL.createObjectURL(f)
    prev.style.display = 'block'
  }
  document.getElementById('removeBanner').onclick = () => {
    pendingBannerFile = null
    pendingBannerRemove = true
    const prev = document.getElementById('editBannerPreview')
    prev.src = ''
    prev.style.display = 'none'
  }

  document.getElementById('saveUserBtn').onclick = async () => {
    const btn = document.getElementById('saveUserBtn')
    btn.textContent = 'Updating...'
    btn.disabled = true
    const bio = document.getElementById('editBio').value
    const pass = document.getElementById('editPass').value
    const confirm = document.getElementById('editConfirmPass').value

    if (pass && pass!== confirm) {
      btn.textContent = 'Update'
      btn.disabled = false
      return showToast('Passwords do not match')
    }
    if (pass) {
      const { error } = await supabase.auth.updateUser({ password: pass })
      if (error) {
        btn.textContent = 'Update'
        btn.disabled = false
        return showToast(error.message)
      }
    }

    let updates = { bio }

    if (pendingAvatarFile) {
      const fName = `${window.currentUser.id}-avatar-${Date.now()}.${pendingAvatarFile.name.split('.').pop()}`
      const { error } = await supabase.storage.from('avatars').upload(fName, pendingAvatarFile, { upsert: true })
      if (error) {
        btn.textContent = 'Update'
        btn.disabled = false
        return showToast(error.message)
      }
      const { data } = supabase.storage.from('avatars').getPublicUrl(fName)
      updates.avatar_url = data.publicUrl
    } else if (pendingAvatarRemove) {
      updates.avatar_url = null
    }

    if (pendingBannerFile) {
      const fName = `${window.currentUser.id}-${Date.now()}.${pendingBannerFile.name.split('.').pop()}`
      const { error } = await supabase.storage.from('banners').upload(fName, pendingBannerFile)
      if (error) {
        btn.textContent = 'Update'
        btn.disabled = false
        return showToast(error.message)
      }
      const { data } = supabase.storage.from('banners').getPublicUrl(fName)
      updates.banner_url = data.publicUrl
    } else if (pendingBannerRemove) {
      updates.banner_url = null
    }

    await supabase.from('profiles').update(updates).eq('id', window.currentUser.id)
    showUserProfile(window.currentUser.id)
  }

  document.getElementById('cancelUserBtn').onclick = () => showUserProfile(window.currentUser.id)
}

window.showUserProfileHandler = (userId) => {
  showUserProfile(userId)
}
window.blockUserHandler = async (userId) => {
  const { blockUser } = await import('./blocked.js')
  await blockUser(userId, window.currentUser)
}