import axios from 'axios';
import { getAccessToken, setAccessToken, clearAccessToken } from './tokenStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// The main instance every page/component uses. `withCredentials: true`
// is what makes the browser attach the httpOnly refresh-token cookie
// and the deviceId cookie on requests to our API's origin.
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// A separate, "plain" axios call for hitting /auth/refresh. If we used
// `api` itself for this, a failed refresh would trigger the response
// interceptor again and loop.
const refreshClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// --- Request interceptor: attach the access token to every call ---
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If several requests 401 at the same moment (e.g. a dashboard firing
// three calls at once right as the token expires), we only want ONE
// network call to /auth/refresh. Everyone else waits on this shared
// promise instead of racing to refresh independently.
let refreshInFlight = null;

function subscribeToRefresh() {
  if (!refreshInFlight) {
    refreshInFlight = refreshClient
      .post('/auth/refresh')
      .then((res) => {
        setAccessToken(res.data.accessToken);
        return res.data.accessToken;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

// Called from AuthContext on logout / hard refresh failure so the rest
// of the app can react (e.g. redirect to /login) without this module
// needing to know about React Router.
let onSessionExpired = () => {};
export function setSessionExpiredHandler(fn) {
  onSessionExpired = fn;
}

// --- Response interceptor: catch 401s and retry exactly once ---
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const isAuthEndpoint = originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/register') ||
      originalRequest?.url?.includes('/auth/refresh');

    // Only attempt a refresh-and-retry for a genuine "token expired"
    // 401 on a normal request, and only once per request - the
    // `_retry` flag is what stops this from looping forever if the
    // retried request also comes back 401 (e.g. refresh itself is
    // invalid): in that case we give up and log the user out instead
    // of refreshing again.
    if (status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;
      try {
        const newAccessToken = await subscribeToRefresh();
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        clearAccessToken();
        onSessionExpired();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
