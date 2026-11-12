import { useState, useEffect, type ReactNode } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";

import { type Theme } from "./types/types";

import ErrorBoundary from "./utils/ErrorBoundary";
import RequireAuth from "./auth/RequireAuth";
import Layout from "./utils/Layout";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Calendar from "./pages/house/Calendar";
import Rules from "./pages/house/Rules";
import Home from "./pages/Home";
import CreateHouse from "./pages/CreateHouse";
import Settings from "./pages/house/Settings";
import JoinHouse from "./pages/JoinHouse";
import Account from "./pages/Account";
import Tasks from "./pages/house/Tasks";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";

export default function App() {
    const [theme, setTheme] = useState<Theme>(() => {
        try {
            const saved = localStorage.getItem("theme");
            if (saved === "light" || saved === "dark") return saved;
        } catch {
            // Storage blocked: fall back to the system preference
        }
        return window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
    });

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        try {
            localStorage.setItem("theme", theme);
        } catch {
            // Not saved; the theme still works for this visit
        }
    }, [theme]);

    const toggleTheme = () => {
        setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
    };

    return (
        <BrowserRouter>
            <PageBoundary>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/terms" element={<Terms />} />

                    <Route element={<RequireAuth />}>
                        <Route path="/" element={<Home />} />
                        <Route path="/houses/new" element={<CreateHouse />} />
                        <Route path="/join/:code" element={<JoinHouse />} />
                        <Route path="/account" element={<Account />} />

                        <Route
                            path="/houses/:houseId"
                            element={
                                <Layout
                                    theme={theme}
                                    toggleTheme={toggleTheme}
                                />
                            }
                        >
                            <Route index element={<Calendar />} />
                            <Route path="calendar" element={<Calendar />} />
                            <Route path="tasks" element={<Tasks />} />
                            <Route path="rules" element={<Rules />} />
                            <Route path="settings" element={<Settings />} />
                            <Route path="*" element={<NotFound />} />
                        </Route>
                    </Route>

                    <Route path="*" element={<NotFound />} />
                </Routes>
            </PageBoundary>
        </BrowserRouter>
    );
}

// Resets the boundary on every page change, so a crash on one page
// doesn't keep showing the error after navigating somewhere else
function PageBoundary({ children }: { children: ReactNode }) {
    const location = useLocation();
    return (
        <ErrorBoundary resetKey={location.pathname}>{children}</ErrorBoundary>
    );
}
