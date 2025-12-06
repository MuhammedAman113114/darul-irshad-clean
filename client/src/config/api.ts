// API Configuration
// This file determines which API URL to use based on environment

export const API_URL = import.meta.env.VITE_API_URL || '';

// If VITE_API_URL is set, use it (for production with separate API)
// Otherwise, use relative URLs (for local development or same-domain deployment)

export function getApiUrl(endpoint: string): string {
  if (API_URL) {
    // External API (e.g., Render.com)
    return `${API_URL}${endpoint}`;
  }
  // Same domain (local dev or Vercel with API)
  return endpoint;
}

// Helper for fetch with credentials
export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const url = getApiUrl(endpoint);
  
  return fetch(url, {
    ...options,
    credentials: 'include', // Always include credentials for sessions
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}
