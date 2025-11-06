import { useEffect, useRef } from "react";
import { useVoice } from "../store/voice";
import { Card, Button } from "../ui/components";

export default function CallTray() {
    const { active, connecting, remote, muted, error, end, toggleMute } = useVoice();

    const remoteRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        if (remote && remoteRef.current) {
            remoteRef.current.srcObject = remote;
            remoteRef.current.play().catch(() => {});
        }
    }, [remote]);

    if (!active && !connecting) return null;

    return (
        <div style={{ position: "fixed", right: 16, bottom: 16, zIndex: 1000, minWidth: 280, maxWidth: 360 }}>
            <Card title={connecting ? "Подключение…" : "Голосовой звонок"}>
                <div style={{ display: "grid", gap: 8 }}>
                    <audio ref={remoteRef} autoPlay playsInline />
                    <div style={{ display:"flex", gap:8 }}>
                        <Button kind={muted ? "danger" : "primary"} onClick={toggleMute}>
                            {muted ? "Микрофон выкл." : "Микрофон вкл."}
                        </Button>
                        <Button kind="danger" onClick={end}>Завершить</Button>
                    </div>
                    {error && <div style={{ color: "salmon", fontSize: 12 }}>{error}</div>}
                </div>
            </Card>
        </div>
    );
}
