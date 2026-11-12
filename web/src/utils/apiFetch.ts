// fetch() for the app's API. A 401 means the session ended (expired, or logged out elsewhere),
// so it tells the AuthProvider, which sends the user to the login page.
const SESSION_EXPIRED = "session-expired";

export async function apiFetch(
    input: string,
    init?: RequestInit,
): Promise<Response> {
    const res = await fetch(input, init);

    // /api/auth/ answers 401 on purpose (wrong password, not logged in yet): those are handled where they're called
    if (res.status === 401 && !input.startsWith("/api/auth/")) {
        window.dispatchEvent(new Event(SESSION_EXPIRED));
    }
    return res;
}

// Lets the AuthProvider listen; returns a function that stops listening
export function onSessionExpired(handler: () => void): () => void {
    window.addEventListener(SESSION_EXPIRED, handler);
    return () => window.removeEventListener(SESSION_EXPIRED, handler);
}
