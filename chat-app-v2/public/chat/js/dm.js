import { supabase } from '../../shared/supabase.js'
import * as Rooms from './rooms.js'

export async function getOrCreateDM(otherId){
  try {
    const me = window.currentUser?.id
    if(!me || me===otherId) return

    const u1 = me < otherId ? me : otherId
    const u2 = me < otherId ? otherId : me

    const { data: existing } = await supabase
      .from('rooms')
      .select('*')
      .eq('is_dm', true)
      .eq('dm_user1', u1)
      .eq('dm_user2', u2)
      .maybeSingle()

    if(existing){
      await Rooms.loadRooms(window.currentUser)
      const el = document.querySelector(`.room-item[data-id="${existing.id}"]`)
      return Rooms.joinRoom(existing.id, existing.name, el, existing)
    }

    const { data: other } = await supabase.from('profiles').select('username').eq('id', otherId).maybeSingle()
    const { data: my } = await supabase.from('profiles').select('username').eq('id', me).maybeSingle()

    // ONLY insert columns that exist in your schema
    const { data: room, error } = await supabase.from('rooms').insert({
      name: `${my?.username || 'You'} & ${other?.username || 'User'}`,
      is_dm: true,
      dm_user1: u1,
      dm_user2: u2
    }).select().single()

    if(error) throw error

    await supabase.from('room_members').insert([
      { room_id: room.id, user_id: me, role: 'User' },
      { room_id: room.id, user_id: otherId, role: 'User' }
    ])

    await Rooms.loadRooms(window.currentUser)
    const el = document.querySelector(`.room-item[data-id="${room.id}"]`)
    Rooms.joinRoom(room.id, room.name, el, room)

  } catch(e){
    console.error('DM failed:', e)
    alert('DM failed: ' + e.message)
  }
}