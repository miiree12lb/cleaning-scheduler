import { useEffect, useState } from "react";

// true only after `active` has been true for `delay` ms.
// Fast loads finish before that, so they never flash a skeleton.
export function useDelayedFlag(active: boolean, delay = 300): boolean {
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (!active) {
            setShow(false);
            return;
        }
        const timer = setTimeout(() => setShow(true), delay);
        return () => clearTimeout(timer);
    }, [active, delay]);

    return active && show;
}
