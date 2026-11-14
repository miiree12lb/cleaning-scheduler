// Where to go after logging in, only if it's a path inside this app: "/join/abc".
// Not "//evil.com" or "/\evil.com", which browsers treat as another website.
// Used by the server (Google login) and the Login page (password login).
export function safeReturnTo(value: string | null | undefined): string | null {
    if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
    if (/[\\\s]/.test(value)) return null; // no backslashes, spaces or line breaks
    return value;
}
