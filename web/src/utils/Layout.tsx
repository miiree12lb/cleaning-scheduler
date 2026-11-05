import { Outlet } from "react-router";

import Navbar from "./Navbar";
import { type ThemeToggleProps } from "../types/types";

export default function Layout({ theme, toggleTheme }: ThemeToggleProps) {
    return (
        <>
            <Navbar theme={theme} toggleTheme={toggleTheme} />
            <main>
                <Outlet />
            </main>
        </>
    );
}
