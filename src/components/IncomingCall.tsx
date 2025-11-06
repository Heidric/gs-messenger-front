import { useEffect, useRef } from "react";
import { useVoice } from "../store/voice";
import { useUsers } from "../store/users";
import { displayName } from "../lib/user";
import { Card, Button, Avatar } from "../ui/components";

export default function IncomingCall() {
    const { ringing, incoming, accept, decline, remote, active, connecting, pc } = useVoice();
    const users = useUsers((s) => s.byId);
    const fromUser = incoming?.fromId ? users[incoming.fromId] : undefined;
    const name = displayName(fromUser, incoming?.fromId || "Пользователь");

    const audioRef = useRef<HTMLAudioElement | null>(null);
    useEffect(() => {
        if (remote && audioRef.current) {
            audioRef.current.srcObject = remote;
            audioRef.current.play().catch(() => {});
        }
    }, [remote]);

    if (!ringing || !incoming || active || connecting || !!pc) return null;

    return (
        <>
            <div
                style={{
                    position: "fixed",
                    top: 12,
                    right: 12,
                    zIndex: 999,
                    maxWidth: 360,
                }}
            >
                <Card>
                    <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 12, alignItems: "center" }}>
                        <Avatar size={40} name={name} src={fromUser?.avatar} />
                        <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {name}
                            </div>
                            <div style={{ opacity: 0.75, fontSize: 13 }}>Входящий звонок…</div>
                        </div>

                        <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, marginTop: 8 }}>
                            <Button kind="primary" onClick={accept} aria-label="Принять звонок" type="button">Принять</Button>
                            <Button kind="danger" onClick={decline} aria-label="Отклонить звонок" type="button">Отклонить</Button>
                        </div>
                    </div>
                </Card>
            </div>

            <audio ref={audioRef} autoPlay playsInline />
        </>
    );
}
