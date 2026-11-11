// Remembers the last house opened on this device, so the app can go straight back to it.
// localStorage can be unavailable (private mode, blocked storage), so failures are ignored.
const KEY = "lastHouseId";

export function getLastHouseId(): number | null {
    try {
        const value = Number(localStorage.getItem(KEY));
        return Number.isInteger(value) && value > 0 ? value : null;
    } catch {
        return null;
    }
}

export function setLastHouseId(id: number) {
    try {
        localStorage.setItem(KEY, String(id));
    } catch {
        // Not saved; the app just won't remember the house
    }
}
