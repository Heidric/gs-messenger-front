import React, { useEffect, useRef, useState, useCallback } from "react";
import { useVoice } from "../store/voice";
import { Card, Button } from "../ui/components";

export default function ActiveCall() {
    const {
        active, connecting, hasVideo, local, remote,
        toggleMute, toggleCam, end, muted, camOff
    } = useVoice();

    const containerRef = useRef<HTMLDivElement | null>(null);
    const localRef = useRef<HTMLVideoElement | null>(null);
    const remoteRef = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
        if (localRef.current && local) {
            localRef.current.srcObject = local;
            localRef.current.muted = true;
            localRef.current.playsInline = true;
            localRef.current.play().catch(() => {});
        }
    }, [local]);

    useEffect(() => {
        if (remoteRef.current && remote) {
            remoteRef.current.srcObject = remote;
            remoteRef.current.playsInline = true;
            remoteRef.current.play().catch(() => {});
        }
    }, [remote]);

    const [isFS, setFS] = useState(true);

    const toggleFS = useCallback(() => {
        setFS((prev) => !prev);
    }, []);

    type Pos = { x: number; y: number };
    const MARGIN = 16;
    const BASE_W = hasVideo ? 420 : 340;
    const BASE_H = hasVideo ? 340 : 160;
    const [pos, setPos] = useState<Pos>(() => ({
        x: Math.max(MARGIN, window.innerWidth - BASE_W - MARGIN),
        y: Math.max(MARGIN, window.innerHeight - BASE_H - MARGIN),
    }));
    const [drag, setDrag] = useState<{ dx: number; dy: number; w: number; h: number } | null>(null);
    const [wasDragged, setWasDragged] = useState(false);

    function clamp(x: number, y: number, w: number, h: number): Pos {
        const maxX = Math.max(0, window.innerWidth - w - MARGIN);
        const maxY = Math.max(0, window.innerHeight - h - MARGIN);
        return { x: Math.min(Math.max(MARGIN, x), maxX), y: Math.min(Math.max(MARGIN, y), maxY) };
    }

    const onHandlePointerDown = (e: React.PointerEvent) => {
        if (isFS) return;
        const target = e.target as HTMLElement;
        if (target.closest("button,a,[data-noclick]")) return;

        const el = containerRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
        setDrag({ dx: e.clientX - r.left, dy: e.clientY - r.top, w: r.width, h: r.height });
    };
    const onHandlePointerMove = (e: React.PointerEvent) => {
        if (!drag || isFS) return;
        setPos(clamp(e.clientX - drag.dx, e.clientY - drag.dy, drag.w, drag.h));
        setWasDragged(true);
    };
    const onHandlePointerUp = (e: React.PointerEvent) => {
        if (!drag) return;
        (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
        setDrag(null);
    };

    useEffect(() => {
        const fix = () => {
            const r = containerRef.current?.getBoundingClientRect();
            const w = r?.width ?? BASE_W;
            const h = r?.height ?? BASE_H;
            setPos(p => clamp(p.x, p.y, w, h));
        };
        window.addEventListener("resize", fix);
        return () => window.removeEventListener("resize", fix);
    }, [BASE_W, BASE_H]);

    const title = hasVideo ? "Видеозвонок" : "Голосовой звонок";

    const videoHeight = isFS ? "calc(100vh - 160px)" : 240;

    const floatingStyle: React.CSSProperties = isFS
        ? {
            position: "fixed",
            inset: 0,
            zIndex: 999,
        }
        : {
            position: "fixed",
            left: wasDragged ? pos.x : undefined,
            top: wasDragged ? pos.y : undefined,
            right: wasDragged ? undefined : MARGIN,
            bottom: wasDragged ? undefined : MARGIN,
            zIndex: 999,
            width: hasVideo ? 420 : 340,
            maxWidth: "calc(100vw - 24px)",
        };

    if (!active && !connecting) return null;

    return (
        <div ref={containerRef} style={floatingStyle}>
            <Card
                style={{
                    pointerEvents: "auto",
                    width: "100%",
                    height: isFS ? "100vh" : "auto",
                    maxWidth: isFS ? "100%" : 960,
                    borderRadius: isFS ? 0 : 12,
                    boxShadow: isFS ? "none" : undefined,
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                <div style={{ display: "grid", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 2px 2px" }}>
                        <div
                            data-drag-handle
                            role="button"
                            aria-label="Перетащить окно"
                            onPointerDown={onHandlePointerDown}
                            onPointerMove={onHandlePointerMove}
                            onPointerUp={onHandlePointerUp}
                            style={{ cursor: isFS ? "default" : "move", userSelect: "none", fontWeight: 700 }}
                        >
                            {title}
                        </div>

                        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                            <Button kind="ghost" onClick={toggleFS} aria-label="Во весь экран" type="button">
                                {isFS ? "⤡" : "⤢"}
                            </Button>
                            <Button kind="danger" onClick={end} aria-label="Завершить звонок" type="button">
                                Завершить
                            </Button>
                        </div>
                    </div>

                    {connecting && (
                        <div style={{
                            marginTop: 2,
                            padding: "6px 10px",
                            borderRadius: 8,
                            background: "rgba(20,24,45,.6)",
                            border: "1px solid var(--border, #293155)",
                            fontSize: 13,
                            width: "fit-content"
                        }}>
                            Подключение…
                        </div>
                    )}

                    {hasVideo ? (
                        <div
                            style={{
                                position: "relative",
                                borderRadius: isFS ? 0 : 12,
                                overflow: "hidden",
                                background: "#000",
                                height: videoHeight,
                            }}
                        >
                            <video
                                ref={remoteRef}
                                onDoubleClick={toggleFS}
                                style={{
                                    display: "block",
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                }}
                            />
                            <video
                                ref={localRef}
                                onDoubleClick={toggleFS}
                                style={{
                                    position: "absolute",
                                    bottom: 8,
                                    right: 8,
                                    width: isFS ? 180 : 120,
                                    height: isFS ? 120 : 80,
                                    borderRadius: 8,
                                    objectFit: "cover",
                                    opacity: camOff ? 0.3 : 1,
                                    outline: "1px solid rgba(255,255,255,.2)",
                                    background: "#000",
                                }}
                            />
                        </div>
                    ) : (
                        <div style={{ fontSize: 13, opacity: 0.8 }}>Соединение установлено</div>
                    )}

                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <Button kind="ghost" onClick={toggleCam} aria-label="Вкл/выкл камеру" type="button">
                            {camOff ? "Камера выкл" : "Камера вкл"}
                        </Button>
                        <Button kind="ghost" onClick={toggleMute} aria-label="Вкл/выкл микрофон" type="button">
                            {muted ? "Микрофон выкл" : "Микрофон вкл"}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
