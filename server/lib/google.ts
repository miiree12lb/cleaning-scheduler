export type GoogleProfile = {
    googleId: string;
    email: string;
    name: string;
};

// Read the part of a JWT (like Google's ID token) that holds the data
function decodeJwtPayload(token: string): Record<string, unknown> {
    const part = token.split(".")[1] ?? "";
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=");
    const bytes = Uint8Array.from(atob(base64), (ch) => ch.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
}

// Exchange the code from the callback for the user's Google profile
export async function exchangeCode(
    code: string,
    redirectUri: string,
    clientId: string,
    clientSecret: string,
): Promise<GoogleProfile | null> {
    const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: "authorization_code",
        }),
    });
    if (!res.ok) return null;

    const tokens: { id_token?: string } = await res.json();
    if (!tokens.id_token) return null;

    const claims = decodeJwtPayload(tokens.id_token);

    // Check the token is really for this app, from Google, still valid, with a verified email
    const issuerOk = claims.iss === "https://accounts.google.com" || claims.iss === "accounts.google.com";
    const audienceOk = claims.aud === clientId;
    const notExpired = typeof claims.exp === "number" && claims.exp * 1000 > Date.now();
    const emailOk = typeof claims.email === "string" && claims.email_verified === true;

    if (!issuerOk || !audienceOk || !notExpired || !emailOk || typeof claims.sub !== "string") {
        return null;
    }

    return {
        googleId: claims.sub,
        email: claims.email as string,
        name: typeof claims.name === "string" && claims.name.trim() ? claims.name : (claims.email as string),
    };
}
