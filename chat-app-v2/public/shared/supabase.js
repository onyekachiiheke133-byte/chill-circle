import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

export const SUPABASE_URL = 'https://ukuyzqbeestcvlxfrlgs.supabase.co'
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrdXl6cWJlZXN0Y3ZseGZybGdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4NTczNjgsImV4cCI6MjEwNDQzMzM2OH0.bziUlXiXQimPvImX_z-5pANilnmqeG6xqvQJeM_ZZu4'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)