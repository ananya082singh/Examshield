const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

/**
 * Get JWT token from localStorage
 */
export const getToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('examshield_token');
  }
  return null;
};

/**
 * Get user information from localStorage
 */
export const getUser = () => {
  if (typeof window !== 'undefined') {
    const userStr = localStorage.getItem('examshield_user');
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
      return null;
    }
  }
  return null;
};

/**
 * Set token and user in localStorage
 */
export const setSession = (token: string, user: any) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('examshield_token', token);
    localStorage.setItem('examshield_user', JSON.stringify(user));
  }
};

/**
 * Clear session from localStorage
 */
export const clearSession = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('examshield_token');
    localStorage.removeItem('examshield_user');
  }
};

/**
 * Base fetch wrapper with JWT
 */
const request = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<any> => {
  const token = getToken();
  
  const headers = new Headers(options.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearSession();
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      window.location.href = '/?error=Session expired. Please log in again.';
    }
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
  }

  return response.json();
};

export const api = {
  get: (endpoint: string, options?: RequestInit) =>
    request(endpoint, { method: 'GET', ...options }),
    
  post: (endpoint: string, body: any, options?: RequestInit) =>
    request(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
      ...options,
    }),
    
  put: (endpoint: string, body: any, options?: RequestInit) =>
    request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
      ...options,
    }),
    
  delete: (endpoint: string, options?: RequestInit) =>
    request(endpoint, { method: 'DELETE', ...options }),

  /**
   * Helper to download files (blobs) directly with JWT auth
   */
  download: async (endpoint: string): Promise<Blob> => {
    const token = getToken();
    const headers = new Headers();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'GET',
      headers,
    });

    if (response.status === 401) {
      clearSession();
      if (typeof window !== 'undefined' && window.location.pathname !== '/') {
        window.location.href = '/?error=Session expired. Please log in again.';
      }
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to download file: ${response.status}`);
    }

    return response.blob();
  }
};
