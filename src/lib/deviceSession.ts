export function getOrCreateDeviceUID(): string {
  if (typeof window === 'undefined') return '';
  let uid = localStorage.getItem('takebite_uid');
  if (!uid) {
    try {
      uid = crypto.randomUUID();
    } catch (e) {
      uid = 'uid_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
    localStorage.setItem('takebite_uid', uid);
  }
  return uid;
}

export function getOrCreateSessionToken(): string {
  if (typeof window === 'undefined') return '';
  let token = sessionStorage.getItem('takebite_session');
  if (!token) {
    token = Math.random().toString(36).substring(2, 10);
    sessionStorage.setItem('takebite_session', token);
  }
  return token;
}

export function getDeviceUID(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('takebite_uid');
}

export function getSessionTokenFromURL(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('session');
}
