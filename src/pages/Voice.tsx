import { useEffect, useRef, useState } from "react";

const WS_URL = import.meta.env.VITE_WS_URL || (location.origin.replace(/^http/, "ws"));

type Signal =
    | { type: "joined" }
    | { type: "answer"; sdp: string }
    | { type: "candidate"; candidate: RTCIceCandidateInit }
    | { type: "error"; detail: string }
    | { type: "bye" };

export default function Voice() {
    const [status, setStatus] = useState("disconnected");
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => () => leave(), []);

    function join(room = "global") {
        if (wsRef.current) return;
        const ws = new WebSocket(`${WS_URL}/voice`);
        wsRef.current = ws;

        ws.onopen = () => {
            setStatus("ws-open");
            ws.send(JSON.stringify({ type: "join", room, peerId: crypto.randomUUID() }));
        };

        ws.onmessage = async (ev) => {
            const msg = JSON.parse(ev.data) as Signal;
            if (msg.type === "joined") {
                const pc = new RTCPeerConnection();
                pcRef.current = pc;

                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                stream.getTracks().forEach(t => pc.addTrack(t, stream));

                pc.onicecandidate = (e) => {
                    if (e.candidate) {
                        ws.send(JSON.stringify({ type: "candidate", candidate: e.candidate.toJSON() }));
                    }
                };

                pc.ontrack = (e) => {
                    const audio = document.getElementById("remote") as HTMLAudioElement;
                    audio.srcObject = e.streams[0];
                    audio.play().catch(() => {});
                };

                const offer = await pc.createOffer({ offerToReceiveAudio: true });
                await pc.setLocalDescription(offer);
                ws.send(JSON.stringify({ type: "offer", sdp: offer.sdp }));
                setStatus("sent-offer");
            } else if (msg.type === "answer") {
                await pcRef.current?.setRemoteDescription({ type: "answer", sdp: msg.sdp });
                setStatus("connected");
            } else if (msg.type === "candidate") {
                if (msg.candidate) {
                    try { await pcRef.current?.addIceCandidate(msg.candidate); } catch {}
                }
            } else if (msg.type === "error") {
                setStatus("error: " + msg.detail);
            } else if (msg.type === "bye") {
                setStatus("bye");
            }
        };

        ws.onclose = () => {
            setStatus("ws-closed");
            wsRef.current = null;
            pcRef.current?.close();
            pcRef.current = null;
        };
    }

    function leave() {
        wsRef.current?.send(JSON.stringify({ type: "leave" }));
        wsRef.current?.close();
        wsRef.current = null;
        pcRef.current?.close();
        pcRef.current = null;
        setStatus("disconnected");
    }

    return (
        <div style={{ padding: 24, fontFamily: "ui-sans-serif" }}>
            <h2>Голосовой канал</h2>
            <p>Статус: {status}</p>
            <button onClick={() => join()}>Join</button>{" "}
            <button onClick={leave}>Leave</button>
            <audio id="remote" autoPlay />
        </div>
    );
}
