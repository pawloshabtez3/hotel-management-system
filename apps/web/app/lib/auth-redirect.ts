const AUTH_REDIRECT_KEY = "auth:redirect";

export function setAuthRedirect(path: string) {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.setItem(AUTH_REDIRECT_KEY, path);
}

export function consumeAuthRedirect(defaultPath = "/bookings/new") {
  if (typeof window === "undefined") {
    return defaultPath;
  }

  const stored = sessionStorage.getItem(AUTH_REDIRECT_KEY);
  if (stored) {
    sessionStorage.removeItem(AUTH_REDIRECT_KEY);
    return stored;
  }

  return defaultPath;
}
