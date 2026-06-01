export function getSiteOrigin() {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  return (
    import.meta.env.VITE_FRONTEND_URL ||
    import.meta.env.VITE_PUBLIC_URL ||
    import.meta.env.VITE_APP_URL ||
    "https://liquira.app"
  );
}

export function getAuthCallbackUrl(redirect?: string) {
  const origin = getSiteOrigin();
  const url = new URL("/auth/callback", origin);
  if (redirect) {
    url.searchParams.set("redirect", redirect);
  }
  return url.toString();
}

export function getAccountRedirectUrl() {
  return new URL("/account", getSiteOrigin()).toString();
}
