import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const SUPABASE_URL = 'https://ukuyzqbeestcvlxfrlgs.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrdXl6cWJlZXN0Y3ZseGZybGdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4NTczNjgsImV4cCI6MjEwNDQzMzM2OH0.bziUlXiXQimPvImX_z-5pANilnmqeG6xqvQJeM_ZZu4'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
const errorMsg = document.getElementById('errorMsg');

// LOGIN
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  errorMsg.textContent = '';
  const { error } = await supabase.auth.signInWithPassword({ 
    email: document.getElementById('loginEmail').value, 
    password: document.getElementById('loginPassword').value 
  });
  if(error) errorMsg.textContent = error.message;
  else window.location.href = '../chat/chat.html';
});

// SIGNUP
document.getElementById('signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  errorMsg.textContent = '';

  const password = document.getElementById('signupPassword').value;
  const confirm = document.getElementById('signupConfirm').value;
  if(password !== confirm) {
    errorMsg.textContent = "Passwords do not match";
    return;
  }

  const age = new Date().getFullYear() - new Date(document.getElementById('signupDob').value).getFullYear();
  if(age < 13) {
    errorMsg.textContent = "You must be 13+ to join";
    return;
  }

  const { data, error } = await supabase.auth.signUp({
    email: document.getElementById('signupEmail').value,
    password,
    options: {
      data: {
        username: document.getElementById('signupUsername').value,
        birth_date: document.getElementById('signupDob').value,
        gender: document.getElementById('signupGender').value,
        country: 'Unknown',
        bio: document.getElementById('signupBio').value || null,
        avatar_url: null
      }
    }
  });

  if (error) errorMsg.textContent = error.message;
  else {
    alert('Account created! Check email to confirm.');
    window.location.href = '../chat/chat.html';
  }
});