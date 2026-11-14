/// <reference path="../../worker-configuration.d.ts" />
import { exports } from "cloudflare:workers";

type Options = { method?: string; body?: unknown; session?: string };

// Each helper call gets its own IP, so the rate limiters (10 per minute per IP) never get in the way
let ipCounter = 0;
const nextIp = () =>
    `10.0.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`;

// Calls the Worker like a browser would
export async function api(
    path: string,
    { method = "GET", body, session }: Options = {},
) {
    const headers = new Headers({ "cf-connecting-ip": nextIp() });
    if (body !== undefined) headers.set("Content-Type", "application/json");
    if (session) headers.set("Cookie", `session=${session}`);
    return exports.default.fetch(
        new Request(`http://localhost${path}`, {
            method,
            headers,
            body: body === undefined ? undefined : JSON.stringify(body),
        }),
    );
}

// The session token from a response's Set-Cookie header
export function sessionFrom(res: Response): string {
    const match = res.headers.get("Set-Cookie")?.match(/session=([^;]+)/);
    if (!match) throw new Error("No session cookie in the response");
    return match[1];
}

let userCounter = 0;

// A new user with email and password, logged in. Returns their session and id.
export async function signUp(name = "Test") {
    const email = `user${++userCounter}-${Date.now()}@test.local`;
    const res = await api("/api/auth/register", {
        method: "POST",
        body: {
            name,
            email,
            password: "long enough password",
            ageConfirmed: true,
        },
    });
    if (res.status !== 201)
        throw new Error(`Sign-up failed: ${res.status} ${await res.text()}`);
    const user = (await res.json()) as { id: number };
    return { id: user.id, email, session: sessionFrom(res) };
}

// A new house, with this user as its admin
export async function createHouse(session: string, name = "Test house") {
    const res = await api("/api/houses", {
        method: "POST",
        body: { name },
        session,
    });
    if (res.status !== 201)
        throw new Error(
            `Creating the house failed: ${res.status} ${await res.text()}`,
        );
    return (await res.json()) as { id: number };
}

// Adds a user to a house through its invite link
export async function joinHouse(
    adminSession: string,
    houseId: number,
    memberSession: string,
) {
    const invite = await api(`/api/houses/${houseId}/invite`, {
        session: adminSession,
    });
    const { code } = (await invite.json()) as { code: string };
    const res = await api(`/api/join/${code}`, {
        method: "POST",
        session: memberSession,
    });
    if (!res.ok)
        throw new Error(`Joining failed: ${res.status} ${await res.text()}`);
}

// A new task in a house (as admin). Returns its id.
export async function createTask(
    adminSession: string,
    houseId: number,
    name: string,
) {
    const res = await api(`/api/houses/${houseId}/tasks`, {
        method: "POST",
        body: { name },
        session: adminSession,
    });
    if (res.status !== 201)
        throw new Error(
            `Creating the task failed: ${res.status} ${await res.text()}`,
        );
    return ((await res.json()) as { id: number }).id;
}
