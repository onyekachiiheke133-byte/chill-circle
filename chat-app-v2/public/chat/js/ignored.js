import { supabase } from '../../shared/supabase.js'
import { showToast } from './ui.js'

let ignoredCache = []
export function getIgnoredCache() { return ignoredCache }
export function setIgnoredCache(val) { ignoredCache = val }

export async function loadIgnoredData(currentUser) {
  // Placeholder for ignored users
  // TODO: Implement when needed
  ignoredCache = []
}

export async function ignoreUser(userId, currentUser) {
  showToast('Ignored')
}

export async function unignoreUser(userId, currentUser) {
  showToast('Unignored')
}

export function showIgnored() {
  const rightContent = document.getElementById('right-content')
  const rightSidebar = document.getElementById('rightSidebar')
  rightSidebar.classList.remove('hidden')
  rightContent.innerHTML = `
    <div class="rs-header"><h3>IGNORED</h3><button class="rs-close" onclick="document.getElementById('rightSidebar').classList.add('hidden')">✕</button></div>
    <div style="padding:10px;text-align:center;opacity:0.5;margin-top:30px">No ignored users</div>
  `
}
