import { Sun, Moon } from "lucide-react";
import { type ThemeToggleProps } from "../types/types";
import "../css/ThemeToggle.css";


const ThemeToggle = ({ theme, toggleTheme }: ThemeToggleProps) => {
    return (
        <label className="theme-switch">
            <input
                type="checkbox"
                id="theme-toggle"
                checked={theme === "dark"}
                onChange={toggleTheme}
            />
            <span className="slider">
                <Moon className="icon moon-icon" size={16} />
                <Sun className="icon sun-icon" size={16} />
                <span className="thumb"></span>
            </span>
        </label>
    );
};

export default ThemeToggle;
