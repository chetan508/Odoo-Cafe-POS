export const APP_NAME = "Cafe Odoo";
export const AUTH_TOKEN_KEY = "cafe_odoo_token";
export const LEGACY_AUTH_TOKEN_KEYS: string[] = ["cafe_pos_token", "cafeflow_token"];
export const DEFAULT_UPI_VPA = "cafeodoo@ybl";

export function getAuthToken() {
  const currentToken = localStorage.getItem(AUTH_TOKEN_KEY);
  if (currentToken) return currentToken;

  for (const legacyKey of LEGACY_AUTH_TOKEN_KEYS) {
    const legacyToken = localStorage.getItem(legacyKey);
    if (legacyToken) {
      localStorage.setItem(AUTH_TOKEN_KEY, legacyToken);
      localStorage.removeItem(legacyKey);
      return legacyToken;
    }
  }

  return null;
}

export function setAuthToken(token: string) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  LEGACY_AUTH_TOKEN_KEYS.forEach((legacyKey) => localStorage.removeItem(legacyKey));
}

export function clearAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  LEGACY_AUTH_TOKEN_KEYS.forEach((legacyKey) => localStorage.removeItem(legacyKey));
}
