import type { SessionUser } from "../../../shared/types";

export interface NavbarItem {
    name: string;
    link: string;
}

export type Theme = "light" | "dark";

export interface ThemeToggleProps {
    theme: Theme;
    toggleTheme: () => void;
}

export type AuthState =
    | { status: "loading" }
    | { status: "authenticated"; user: SessionUser }
    | { status: "unauthenticated" };
