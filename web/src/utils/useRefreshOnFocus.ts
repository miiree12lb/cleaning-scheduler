import { useEffect } from "react";

export function useRefreshOnFocus(refresh: () => void) {
    useEffect(() => {
        window.addEventListener("focus", refresh);
        return () => window.removeEventListener("focus", refresh);
    }, [refresh]);
}
