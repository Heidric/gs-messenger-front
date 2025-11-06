import { useAuth } from "../store/auth";
import type { Message } from "./api";

const DEBUG_VOICE = true;

type IncomingPayloadMap = {
    ping: undefined;
    "message.new": Message;

    "voice.offer": { from: string; sdp: string; roomId?: string };
    "voice.answer": { from: string; sdp: string; roomId?: string };
    "voice.ice": { from: string; candidate: string; roomId?: string };
    "voice.end": { from: string; roomId?: string };
    "voice.decline": { from: string; roomId?: string };
};

type OutgoingPayloadMap = {
    ping: {} | undefined;
    join: { presence?: "online" | "away" } | undefined;

    "voice.join": { roomId: string };
    "voice.offer": { to: string; sdp: string; roomId: string };
    "voice.answer": { to: string; sdp: string; roomId: string };
    "voice.ice": { to: string; candidate: string; roomId: string };
    "voice.decline": { to: string; roomId: string };
    "voice.end": { to: string; roomId: string };
};

type IncomingType = keyof IncomingPayloadMap;
type OutgoingType = keyof OutgoingPayloadMap;

type ServerEvent =
    | { type: "ping" }
    | { type: "message.new"; data: Message }
    | { type: "voice.offer"; data: IncomingPayloadMap["voice.offer"] }
    | { type: "voice.answer"; data: IncomingPayloadMap["voice.answer"] }
    | { type: "voice.ice"; data: IncomingPayloadMap["voice.ice"] }
    | { type: "voice.end"; data: IncomingPayloadMap["voice.end"] }
    | { type: "voice.decline"; data: IncomingPayloadMap["voice.decline"] };

type Handler<T extends IncomingType> = (payload: IncomingPayloadMap[T]) => void;

let socket: WebSocket | null = null;
let manualClose = false;
let reconnectTimer: number | null = null;
let retry = 0;

let pingTimer: number | null = null;
const CLIENT_PING_MS = 20000;

const listeners = {
    ping: [],
    "message.new": [],
    "voice.offer": [],
    "voice.answer": [],
    "voice.ice": [],
    "voice.end": [],
    "voice.decline": [],
} as { [K in IncomingType]: Array<(payload: IncomingPayloadMap[K]) => void> };

const WS_PATH = "/api/v1/ws";

function makeWsUrl() {
    const base =
        import.meta.env.DEV
            ? window.location.origin
            : (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
            window.location.origin;

    const url = new URL(WS_PATH, base);
    url.protocol = url.protocol.replace("http", "ws");

    const t = useAuth.getState().accessToken;
    if (t) url.searchParams.set("access", t);
    return url.toString();
}

function scheduleReconnect() {
    if (reconnectTimer != null) window.clearTimeout(reconnectTimer);
    const delay = Math.min(30000, 1000 * Math.pow(2, retry++));
    reconnectTimer = window.setTimeout(connect, delay);
}

function startClientPing() {
    if (pingTimer != null) window.clearInterval(pingTimer);
    pingTimer = window.setInterval(() => {
        send({ type: "ping", data: undefined });
    }, CLIENT_PING_MS);
}

function stopClientPing() {
    if (pingTimer != null) {
        window.clearInterval(pingTimer);
        pingTimer = null;
    }
}

function emit<T extends IncomingType>(type: T, payload: IncomingPayloadMap[T]) {
    const cbs = listeners[type];
    for (const fn of cbs) fn(payload as any);
}

export function on<T extends IncomingType>(type: T, handler: Handler<T>) {
    listeners[type].push(handler as any);
    return () => off(type, handler);
}

export function off<T extends IncomingType>(type: T, handler: Handler<T>) {
    const arr = listeners[type];
    const i = arr.indexOf(handler as any);
    if (i >= 0) arr.splice(i, 1);
}

export function send<E extends OutgoingType>(evt: {
    type: E;
    data: OutgoingPayloadMap[E];
}) {
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    try {
        const payload =
            evt.data === undefined ? { type: evt.type } : { type: evt.type, data: evt.data };
        if (DEBUG_VOICE) console.log("[ws.send]", payload);
        socket.send(JSON.stringify(payload));
        return true;
    } catch {
        return false;
    }
}

export function start() {
    manualClose = false;
    connect();
}

export function stop() {
    manualClose = true;
    stopClientPing();
    if (reconnectTimer != null) window.clearTimeout(reconnectTimer);
    try {
        socket?.close();
    } catch {}
    socket = null;
}

export function isConnected() {
    return !!socket && socket.readyState === WebSocket.OPEN;
}

function connect() {
    if (socket || manualClose) return;

    try {
        socket = new WebSocket(makeWsUrl());
    } catch {
        scheduleReconnect();
        return;
    }

    socket.onopen = () => {
        retry = 0;
        startClientPing();

        send({ type: "join", data: { presence: "online" } });
    };

    socket.onmessage = (ev) => {
        let msg: ServerEvent | null = null;
        try {
            msg = JSON.parse(ev.data);
        } catch {
            return;
        }
        if (!msg || typeof msg !== "object" || !("type" in msg)) return;

        if (DEBUG_VOICE) {
            console.log("[ws.recv]", msg);
            try { const peek = JSON.parse(ev.data); if (peek?.type?.startsWith?.("voice.")) console.log("[ws.recv]", peek); } catch {}
        }

        switch (msg.type) {
            case "ping":
                emit("ping", undefined);
                return;
            case "message.new":
                emit("message.new", msg.data);
                return;
            case "voice.offer":
                emit("voice.offer", msg.data);
                return;
            case "voice.answer":
                emit("voice.answer", msg.data);
                return;
            case "voice.ice":
                emit("voice.ice", msg.data);
                return;
            case "voice.end":
                emit("voice.end", msg.data);
                return;
            case "voice.decline":
                emit("voice.decline", msg.data);
                return;
            default:
                return;
        }
    };

    socket.onclose = () => {
        stopClientPing();
        socket = null;
        if (!manualClose) scheduleReconnect();
    };

    socket.onerror = () => {};
}

useAuth.subscribe((state, prev) => {
    if (state?.accessToken !== prev?.accessToken) {
        try {
            socket?.close();
        } catch {}
        socket = null;
        if (!manualClose) connect();
    }
});
