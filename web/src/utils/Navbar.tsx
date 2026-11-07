import { Link, NavLink } from "react-router";
import {
    CalendarDays,
    LogOut,
    ScrollText,
    Settings as SettingsIcon,
    UtensilsCrossed,
    type LucideIcon,
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "../auth/AuthContext";
import type { Theme } from "../types/types";
import { CircleUser } from "lucide-react";
import "../css/navbar.css";

type NavItem = {
    name: string; // full name, for the desktop links
    short: string; // short name, for the phone tab bar
    link: string;
    icon: LucideIcon;
    end?: boolean;
};

const ITEMS: NavItem[] = [
    { name: "Calendar", short: "Calendar", link: ".", icon: CalendarDays },
    { name: "Dishwasher", short: "Dishes", link: "dishwasher", icon: UtensilsCrossed },
    { name: "House Rules", short: "Rules", link: "rules", icon: ScrollText },
];

type Props = {
    theme: Theme;
    toggleTheme: () => void;
    houseName: string;
};

export default function Navbar({ theme, toggleTheme, houseName }: Props) {
    const { auth, logout } = useAuth();
    const userName = auth.status === "authenticated" ? auth.user.name : "";

    return (
        <>
            <header className="topbar">
                <Link to="/" className="topbar-house" title="Switch house">
                    {houseName}
                </Link>

                <nav className="topbar-links" aria-label="Main">
                    {ITEMS.map((item) => (
                        <NavLink key={item.link} to={item.link} end={item.end}>
                            {item.name}
                        </NavLink>
                    ))}
                </nav>

                <div className="topbar-actions">
                    <Link to="/account" className="topbar-user" title="Your account">
                        <CircleUser size={18} aria-hidden="true" />
                        <span className="topbar-user-name">{userName}</span>
                    </Link>
                    <NavLink to="settings" className="icon-link" aria-label="House settings" title="House settings">
                        <SettingsIcon size={18} aria-hidden="true" />
                    </NavLink>
                    <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
                    <button className="logout-button" onClick={logout} aria-label="Log out" title="Log out">
                        <LogOut size={16} aria-hidden="true" />
                        <span className="logout-label">Log out</span>
                    </button>
                </div>
            </header>

            <nav className="tabbar" aria-label="Main">
                {ITEMS.map((item) => {
                    const Icon = item.icon;
                    return (
                        <NavLink key={item.link} to={item.link} end={item.end} className="tab">
                            <Icon size={22} aria-hidden="true" />
                            <span>{item.short}</span>
                        </NavLink>
                    );
                })}
            </nav>
        </>
    );
}
