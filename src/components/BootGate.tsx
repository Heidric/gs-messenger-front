import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "../store/auth";
import { useApp } from "../store/app";
import { start as wsStart, stop as wsStop } from "../lib/ws";
import { useChat } from "../store/chat";
import { useContacts } from "../store/contacts";

export default function BootGate() {
    const { accessToken } = useAuth();
    const { boot, booting, booted, bootError, resetBoot } = useApp();

    useEffect(() => {
        if (!accessToken) {
            wsStop();
            resetBoot();
            return;
        }
        wsStart();
        void boot();
        void useContacts.getState().bootstrap();
        return () => wsStop();
    }, [accessToken, boot, resetBoot]);

    useEffect(() => {
        if (accessToken) {
            useChat.getState().bindRealtime();
        }
    }, [accessToken]);

    return (
        <>
            <Outlet />
            {accessToken && !booted && (
                <div
                    style={{
                        position: "fixed",
                        top: 12,
                        right: 12,
                        zIndex: 9999,
                        fontFamily: "ui-sans-serif",
                        background: "#fff",
                        border: "1px solid #eee",
                        boxShadow: "0 6px 20px rgba(0,0,0,.08)",
                        borderRadius: 10,
                        padding: "10px 12px",
                    }}
                >
                    {booting && <span>Синхронизируем данные…</span>}
                    {bootError && !booting && (
                        <span style={{ color: "#b00" }}>Ошибка синхронизации. Проверьте токен/сеть.</span>
                    )}
                </div>
            )}
        </>
    );
}
