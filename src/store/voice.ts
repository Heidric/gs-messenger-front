import { create } from "zustand";
import { send, on } from "../lib/ws";

type VoiceState = {
    active: boolean;
    connecting: boolean;
    peerId?: string;
    roomId?: string;
    pc: RTCPeerConnection | null;
    local: MediaStream | null;
    remote: MediaStream | null;
    muted: boolean;
    camOff: boolean;
    hasVideo: boolean;
    error?: string | null;
    ringing: boolean;
    incoming?: { fromId: string; sdp: string; roomId?: string };

    start: (peerId: string, roomId: string, opts?: { video?: boolean }) => Promise<void>;
    startAudio: (peerId: string, roomId: string) => Promise<void>;
    startVideo: (peerId: string, roomId: string) => Promise<void>;
    accept: () => Promise<void>;
    decline: () => void;
    end: () => void;
    toggleMute: () => void;
    toggleCam: () => void;
};

let inited = false;

function hasVideoInSDP(sdp: string | undefined): boolean {
    return !!sdp && /\nm=video\s/.test(sdp);
}

async function detectDevices(): Promise<{ hasMic: boolean; hasCam: boolean }> {
    try {
        const list = await navigator.mediaDevices.enumerateDevices();
        const hasMic = list.some(d => d.kind === "audioinput");
        const hasCam = list.some(d => d.kind === "videoinput");
        return { hasMic, hasCam };
    } catch {
        return { hasMic: true, hasCam: true };
    }
}

async function ensureMedia(set: (p: Partial<VoiceState>) => void, wantVideo: boolean) {
    const { hasMic, hasCam } = await detectDevices();
    if (!hasMic) throw new Error("Микрофон не найден. Подключите устройство или разрешите доступ.");

    const needVideo = wantVideo && hasCam;

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: needVideo ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" } : false,
        });
        set({ local: stream, camOff: !needVideo });
        return stream;
    } catch (e: any) {
        if (needVideo) {
            try {
                const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
                set({ local: s, camOff: false });
                return s;
            } catch (inner) {
                const a = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                set({ local: a, camOff: true });
                return a;
            }
        }
        throw e;
    }
}

function makePC(
    toUserId: string,
    getRoomId: () => string | undefined,
    set: (p: Partial<VoiceState>) => void
) {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });

    pc.onicecandidate = (e) => {
        if (!e.candidate) return;
        try {
            const json = JSON.stringify((e.candidate as any).toJSON ? (e.candidate as any).toJSON() : e.candidate);
            const rid = getRoomId() || "";
            send({ type: "voice.ice", data: { to: toUserId, candidate: json, roomId: rid } });
        } catch {}
    };

    pc.ontrack = (ev) => {
        const stream = ev.streams?.[0];
        if (stream) {
            set({ remote: stream });
            const hasVid = stream.getVideoTracks().length > 0;
            if (hasVid) set({ hasVideo: true });
        }
    };

    pc.onconnectionstatechange = () => {
        const s = pc.connectionState;
        if (s === "failed" || s === "closed" || s === "disconnected") {
            set({ error: s === "failed" ? "Сбой соединения" : null });
        }
    };

    return pc;
}

export const useVoice = create<VoiceState>((set, get) => {
    if (!inited) {
        on("voice.offer", async ({ from, sdp, roomId }) => {
            const st = get();
            if (st.active && st.peerId === from) return;
            set({
                ringing: true,
                incoming: { fromId: from, sdp, roomId },
                roomId: roomId ?? st.roomId,
            });
        });

        on("voice.answer", async ({ sdp }) => {
            const { pc } = get();
            if (!pc) return;
            await pc.setRemoteDescription({ type: "answer", sdp });
            set({ connecting: false, active: true });
        });

        on("voice.ice", async ({ candidate }) => {
            const { pc } = get();
            if (!pc) return;
            try {
                await pc.addIceCandidate(JSON.parse(candidate));
            } catch {
                try {
                    await pc.addIceCandidate(candidate as any);
                } catch {}
            }
        });

        on("voice.end", () => {
            const { pc, local, remote } = get();
            try { pc?.close(); } catch {}
            local?.getTracks().forEach((t) => t.stop());
            remote?.getTracks().forEach((t) => t.stop());
            set({
                pc: null,
                local: null,
                remote: null,
                active: false,
                connecting: false,
                ringing: false,
                incoming: undefined,
                peerId: undefined,
                roomId: undefined,
                error: null,
                camOff: false,
                hasVideo: false,
                muted: false,
            });
        });

        on("voice.decline", () => {
            set({ ringing: false, incoming: undefined, connecting: false, active: false });
        });

        inited = true;
    }

    return {
        active: false,
        connecting: false,
        pc: null,
        local: null,
        remote: null,
        muted: false,
        camOff: false,
        hasVideo: false,
        error: null,
        ringing: false,
        incoming: undefined,

        start: async (peerId, roomId, opts) => {
            const withVideo = !!opts?.video;
            const st = get();
            if (st.pc) try { st.pc.close(); } catch {}

            let local: MediaStream;
            try {
                local = st.local ?? (await ensureMedia((p) => set(p), withVideo));
            } catch (e: any) {
                set({ error: e?.message || "Не удалось получить доступ к устройствам", active: false, connecting: false });
                return;
            }

            set({ roomId });

            try { send({ type: "voice.join", data: { roomId } }); } catch {}

            const pc = makePC(peerId, () => get().roomId, (p) => set(p));
            set({
                pc, peerId, connecting: true, active: true, error: null, ringing: false, incoming: undefined,
                hasVideo: local.getVideoTracks().length > 0, camOff: local.getVideoTracks().length === 0
            });

            local.getTracks().forEach((t) => pc.addTrack(t, local));

            try {
                const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: withVideo });
                await pc.setLocalDescription(offer);
                send({ type: "voice.offer", data: { to: peerId, sdp: offer.sdp!, roomId } });
            } catch (e) {
                try { send({ type: "voice.end", data: { to: peerId, roomId } }); } catch {}
                try { pc.close(); } catch {}
                get().local?.getTracks().forEach((t) => t.stop());
                get().remote?.getTracks().forEach((t) => t.stop());
                set({
                    pc: null, local: null, remote: null, active: false, connecting: false, ringing: false,
                    incoming: undefined, peerId: undefined, roomId: undefined, error: "Не удалось создать оффер",
                    hasVideo: false, camOff: false, muted: false,
                });
            }
        },

        startAudio: async (peerId, roomId) => get().start(peerId, roomId, { video: false }),
        startVideo: async (peerId, roomId) => get().start(peerId, roomId, { video: true }),

        accept: async () => {
            const st = get();
            const inc = st.incoming;
            if (!inc) return;

            const wantVideo = hasVideoInSDP(inc.sdp);
            const rid = st.roomId || "";

            if (rid) try { send({ type: "voice.join", data: { roomId: rid } }); } catch {}

            let local: MediaStream;
            try {
                local = st.local ?? (await ensureMedia((p) => set(p), wantVideo));
            } catch (e: any) {
                try { send({ type: "voice.decline", data: { to: inc.fromId, roomId: rid } }); } catch {}
                set({ error: e?.message || "Не удалось получить доступ к устройствам", ringing: false, incoming: undefined, connecting: false });
                return;
            }

            const pc = makePC(inc.fromId, () => get().roomId, (p) => set(p));
            set({
                pc, connecting: true, error: null,
                hasVideo: local.getVideoTracks().length > 0, camOff: local.getVideoTracks().length === 0
            });

            local.getTracks().forEach((t) => pc.addTrack(t, local));

            try {
                await pc.setRemoteDescription({ type: "offer", sdp: inc.sdp });
                const ans = await pc.createAnswer();
                await pc.setLocalDescription(ans);
                send({ type: "voice.answer", data: { to: inc.fromId, sdp: ans.sdp!, roomId: rid } });
                set({ connecting: false, active: true, ringing: false, incoming: undefined, peerId: inc.fromId });
            } catch (e) {
                try { send({ type: "voice.end", data: { to: inc.fromId, roomId: rid } }); } catch {}
                try { pc.close(); } catch {}
                get().local?.getTracks().forEach((t) => t.stop());
                get().remote?.getTracks().forEach((t) => t.stop());
                set({
                    pc: null, local: null, remote: null,
                    active: false, connecting: false, ringing: false, incoming: undefined,
                    peerId: undefined, roomId: undefined, error: "Не удалось ответить на звонок",
                    hasVideo: false, camOff: false, muted: false,
                });
            }
        },

        decline: () => {
            const st = get();
            if (st.incoming?.fromId) {
                try { send({ type: "voice.decline", data: { to: st.incoming.fromId, roomId: st.roomId || "" } }); } catch {}
            }
            set({ ringing: false, incoming: undefined, connecting: false });
        },

        end: () => {
            const { pc, local, remote, peerId, roomId } = get();
            try { peerId && send({ type: "voice.end", data: { to: peerId, roomId: roomId || "" } }); } catch {}
            try { pc?.close(); } catch {}
            local?.getTracks().forEach((t) => t.stop());
            remote?.getTracks().forEach((t) => t.stop());
            set({
                pc: null, local: null, remote: null,
                active: false, connecting: false, ringing: false,
                incoming: undefined, peerId: undefined, roomId: undefined, error: null,
                hasVideo: false, camOff: false, muted: false,
            });
        },

        toggleMute: () => {
            const { local, muted } = get();
            const next = !muted;
            local?.getAudioTracks().forEach((t) => (t.enabled = !next));
            set({ muted: next });
        },

        toggleCam: () => {
            const { local, camOff } = get();
            const next = !camOff;
            local?.getVideoTracks().forEach((t) => (t.enabled = !next));
            set({ camOff: next });
        },
    };
});
