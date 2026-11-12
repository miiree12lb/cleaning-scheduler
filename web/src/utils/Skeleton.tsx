import type { CSSProperties, ReactNode } from "react";
import "../css/skeleton.css";

type BlockProps = {
    width?: CSSProperties["width"];
    height?: CSSProperties["height"];
    radius?: CSSProperties["borderRadius"];
};

// One gray placeholder shape
export function SkeletonBlock({
    width = "100%",
    height = 16,
    radius = 8,
}: BlockProps) {
    return (
        <span
            className="skeleton"
            style={{ width, height, borderRadius: radius }}
        />
    );
}

// Wraps a page's placeholder shapes: hidden from screen readers, which hear "Loading…" instead
export function SkeletonPage({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className={className} aria-busy="true">
            <span className="visually-hidden" role="status">
                Loading…
            </span>
            <div aria-hidden="true">{children}</div>
        </div>
    );
}

// A section with a title and a few rows: for lists like Tasks and Rules
export function RowsSkeleton({ rows = 4 }: { rows?: number }) {
    return (
        <SkeletonPage className="settings-section">
            <div className="skeleton-stack">
                <SkeletonBlock width={120} height={20} />
                {Array.from({ length: rows }, (_, i) => (
                    <SkeletonBlock key={i} height={48} radius={10} />
                ))}
            </div>
        </SkeletonPage>
    );
}

// Shown while the app checks the login and loads the house: a bar like the navbar, then some rows
export function AppSkeleton() {
    return (
        <SkeletonPage>
            <div className="skeleton-row skeleton-topbar">
                <SkeletonBlock width={120} height={20} />
                <SkeletonBlock width={32} height={32} radius={999} />
            </div>
            <div className="skeleton-stack skeleton-app-body">
                <SkeletonBlock width={220} height={28} />
                <SkeletonBlock height={60} radius={12} />
                <SkeletonBlock height={60} radius={12} />
                <SkeletonBlock height={60} radius={12} />
            </div>
        </SkeletonPage>
    );
}
