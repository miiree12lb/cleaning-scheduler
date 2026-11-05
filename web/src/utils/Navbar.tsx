import { NavLink } from "react-router";

import ThemeToggle from "./ThemeToggle";
import { type NavbarItem, type ThemeToggleProps } from "../types/types";
import { useAuth } from "../auth/AuthContext";

import "../css/navbar.css";

export default function Navbar({ theme, toggleTheme }: ThemeToggleProps) {
    const items: NavbarItem[] = [
        { name: "This week", link: "/" },
        { name: "Calendar", link: "/calendar" },
        { name: "Dishwasher", link: "/dishwasher" },
        { name: "House Rules", link: "/rules" },
    ];

    const auth = useAuth();

    return (
        <nav>
            <div id="user-name">{auth.status === "authenticated" ? auth.user.name : ""}</div>
            <div id="nav-items">
                {items.map((item) => (
                    <NavLink key={item.link} to={item.link}>
                        <span>{item.name}</span>
                    </NavLink>
                ))}
            </div>

            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
        </nav>
    );
}
