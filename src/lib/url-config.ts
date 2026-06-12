/**
 * Centralized URL configuration.
 * Always use getAppUrl() instead of window.location.origin or Vercel preview branch URLs.
 */
export function getAppUrl(): string {
  // Use explicit environment variables if available
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (process.env.APP_URL) {
    return process.env.APP_URL;
  }
  
  // Hard fallback to the production URL as requested by the user
  return "https://takea-bite.vercel.app";
}
