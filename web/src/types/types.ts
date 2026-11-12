import type { SessionUser, HouseSummary } from "../../../shared/types";

export type Theme = "light" | "dark";

export interface ThemeToggleProps {
    theme: Theme;
    toggleTheme: () => void;
}

export type AuthState =
    | { status: "loading" }
    | { status: "authenticated"; user: SessionUser }
    | { status: "unauthenticated"; expired?: boolean };

export type AuthContextValue = {
    auth: AuthState;
    logout: () => Promise<void>;
};

export type HouseContext = {
    house: HouseSummary;
    reloadHouse: () => Promise<void>;
};
