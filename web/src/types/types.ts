export interface NavbarItem {
    name: string;
    link: string;
}

export type Theme = "light" | "dark";

export interface ThemeToggleProps {
    theme: Theme;
    toggleTheme: () => void;
}
