import { Outlet, useNavigate, NavLink, Link } from "react-router-dom";
import { Topbar, Page } from "../ui/components";
import { useAuth } from "../store/auth";
import type React from "react";
import VoiceHUD from "../components/VoiceHUD";

export default function AppLayout() {
    const navigate = useNavigate();
    const logout = useAuth((s) => s.logout);

    return (
        <>
            <Topbar>
                <Link
                    to="/chats"
                    style={{
                        textDecoration: "none",
                        color: "inherit",
                        fontWeight: 800,
                        opacity: 0.95,
                        marginRight: 8,
                    }}
                >
                    GSM
                </Link>

                <TopLink to="/users">Пользователи</TopLink>
                <TopLink to="/chats" end>
                    Чаты
                </TopLink>

                <div style={{ marginLeft: "auto" }} />

                <button
                    onClick={(e) => {
                        e.preventDefault();
                        logout();
                        navigate("/login");
                    }}
                    title="Выйти"
                    aria-label="Выйти"
                    style={{
                        borderRadius: 10,
                        border: "1px solid var(--border, #293155)",
                        padding: "8px 12px",
                        background: "transparent",
                        color: "inherit",
                        cursor: "pointer",
                    }}
                >
                    Выйти
                </button>
            </Topbar>

            <Page>
                <Outlet />
            </Page>

            <VoiceHUD />
        </>
    );
}

function TopLink({
     to,
     end,
     children,
 }: {
    to: string;
    end?: boolean;
    children: React.ReactNode;
}) {
    return (
        <NavLink
            to={to}
            end={end}
            style={({ isActive }) => ({
                textDecoration: "none",
                color: "inherit",
                padding: "6px 10px",
                borderRadius: 8,
                border: isActive
                    ? "1px solid var(--border, #293155)"
                    : "1px solid transparent",
                background: isActive ? "#1b244d" : "transparent",
                fontWeight: isActive ? 700 : 500,
                opacity: isActive ? 1 : 0.95,
            })}
        >
            {children}
        </NavLink>
    );
}
