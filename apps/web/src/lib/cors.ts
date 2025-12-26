/**
 * CORS Configuration
 * Restricts API access to known extension origins in production
 */

// Chrome extension IDs that are allowed to make API requests
// Add your production extension ID here after publishing to Chrome Web Store
export const EXTENSION_ORIGINS = [
  'chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', // Placeholder - replace with real ID
] as const;

// Web app origins for development/testing
const WEB_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://socialrecall.now',
] as const;

/**
 * Get CORS headers based on environment
 * In development: allows all origins for easy testing
 * In production: restricts to known extension and web origins
 */
export function getCorsHeaders(): Record<string, string> {
  const isDev = process.env.NODE_ENV === 'development';

  // In development, allow all origins
  if (isDev) {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
    };
  }

  // In production, restrict to known origins
  // Note: For multiple origins, you'd need to check request origin and return matching one
  // For now, we use the extension origin as primary
  return {
    'Access-Control-Allow-Origin': EXTENSION_ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
  };
}

/**
 * Validate if an origin is allowed
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;

  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) return true;

  const allAllowedOrigins = [...EXTENSION_ORIGINS, ...WEB_ORIGINS];
  return allAllowedOrigins.includes(origin as typeof allAllowedOrigins[number]);
}

/**
 * Get CORS headers for a specific request origin
 * Returns appropriate headers if origin is allowed, or empty headers if not
 */
export function getCorsHeadersForOrigin(origin: string | null): Record<string, string> {
  if (!isOriginAllowed(origin)) {
    return {};
  }

  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
    'Access-Control-Allow-Credentials': 'true',
  };
}
