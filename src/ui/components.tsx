import type { PropsWithChildren } from "react";
import "../ui/theme.css";
import React, { forwardRef, useEffect } from "react";

export function PageCenter(props: PropsWithChildren) {
    return <div className="page-center">{props.children}</div>;
}

export function Topbar({ children }: { children?: React.ReactNode }) {
    return (
        <div
            style={{
                position: "sticky",
                top: 0,
                zIndex: 10,
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 16px",
                borderBottom: "1px solid var(--border, #293155)",
                background: "var(--topbar, #0b1026)",
                color: "var(--topbar-fg, #cdd7ff)",
                boxShadow: "0 2px 10px rgba(0,0,0,.25)",
            }}
        >
            {children}
        </div>
    );
}

export function Page({ children }: { children?: React.ReactNode }) {
    return <div style={{ padding: 16, maxWidth: 1024, margin: "0 auto" }}>{children}</div>;
}

export function Row(props: PropsWithChildren) { return <div className="row">{props.children}</div>; }
export function Col(props: PropsWithChildren) { return <div className="col">{props.children}</div>; }

export type TextInputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function TextInput(props: TextInputProps) {
    return (
        <input
            {...props}
            style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid var(--border, #293155)",
                background: "transparent",
                color: "inherit",
                ...(props.style || {}),
            }}
        />
    );
}

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
    title?: string;
    subtitle?: string;
};

export function Card({
     title,
     subtitle,
     children,
     className,
     style,
     ...rest
 }: CardProps) {
    const clickable =
        typeof (rest as React.HTMLAttributes<HTMLDivElement>).onClick === "function" ||
        rest.role === "button";

    return (
        <div
            {...rest}
            className={className}
            style={{
                border: "1px solid var(--border, #293155)",
                borderRadius: 12,
                padding: 12,
                background: "var(--card, #0d1230)",
                ...(clickable ? { cursor: "pointer" } : null),
                ...style,
            }}
        >
            {(title || subtitle) && (
                <div style={{ marginBottom: 8 }}>
                    {title && <div style={{ fontWeight: 700 }}>{title}</div>}
                    {subtitle && <div style={{ opacity: 0.75 }}>{subtitle}</div>}
                </div>
            )}
            {children}
        </div>
    );
}

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    kind?: "primary" | "ghost" | "danger";
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
    { kind = "primary", style, children, ...rest },
    ref
) {
    const base: React.CSSProperties = {
        borderRadius: 10,
        border: "1px solid var(--border, #293155)",
        padding: "8px 12px",
        background: kind === "ghost" ? "transparent" : kind === "danger" ? "#5b1a26" : "#1b244d",
        color: "inherit",
        cursor: "pointer",
        lineHeight: 1.2,
    };
    return (
        <button ref={ref} style={{ ...base, ...style }} {...rest}>
            {children}
        </button>
    );
});

export function ImageModal({
                               src,
                               alt,
                               onClose,
                           }: {
    src: string;
    alt?: string;
    onClose: () => void;
}) {
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, []);

    return (
        <div
            role="dialog"
            aria-modal="true"
            onClick={onClose}
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,.6)",
                display: "grid",
                placeItems: "center",
                zIndex: 9999,
                padding: 16,
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    position: "relative",
                    background: "transparent",
                    borderRadius: 12,
                    maxWidth: "92vw",
                    maxHeight: "92vh",
                }}
            >
                <button
                    onClick={onClose}
                    aria-label="Закрыть"
                    style={{
                        position: "absolute",
                        top: -8,
                        right: -8,
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        border: "none",
                        cursor: "pointer",
                        background: "#fff",
                        boxShadow: "0 6px 20px rgba(0,0,0,.2)",
                        fontWeight: 700,
                    }}
                    title="Закрыть"
                >
                    ×
                </button>
                <img
                    src={src}
                    alt={alt}
                    style={{
                        display: "block",
                        maxWidth: "92vw",
                        maxHeight: "92vh",
                        borderRadius: 8,
                        objectFit: "contain",
                        background: "#000",
                    }}
                />
            </div>
        </div>
    );
}

export function Avatar({ src, name, size = 32 }: { src?: string; name?: string; size?: number; }) {
    const initials = (name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
    return src ? (
        <img
            src={src}
            alt={name}
            width={size}
            height={size}
            style={{ borderRadius: "50%", objectFit: "cover", flex: "0 0 auto", marginRight: "10px" }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        />
    ) : (
        <div
            style={{
                width: size, height: size, lineHeight: `${size}px`, textAlign: "center", marginRight: "10px",
                borderRadius: "50%", background: "#1e2a55", color: "#cdd7ff", fontWeight: 700, userSelect: "none", flex: "0 0 auto",
            }}
            title={name}
        >
            {initials}
        </div>
    );
}
