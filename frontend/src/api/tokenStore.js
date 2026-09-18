// Access token lives in memory for speed, backed by localStorage so a
// page refresh doesn't immediately look logged-out (the real
// protection here is that the token is short-lived - see Q17/Q18 in
// the project notes on why the ACCESS token is fine in localStorage
// while the REFRESH token never is).
const STORAGE_KEY = 'gurukul_access_token';

let accessToken = localStorage.getItem(STORAGE_KEY) || null;

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token) {
  accessToken = token;
  if (token) {
    localStorage.setItem(STORAGE_KEY, token);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function clearAccessToken() {
  setAccessToken(null);
}
