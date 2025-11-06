import { create } from "zustand";
import {Chats, type Chat, type Message} from "../lib/api";
import { useAuth } from "./auth";
import {getSubject, getUserIdFromToken} from "../lib/jwt";
import {useUsers} from "./users";
import * as ws from "../lib/ws";
import { ensurePermission, showNewMessage } from "../lib/notify";

export type ChatVM = Chat & {
    id: string;
    user1Id: string;
    user2Id: string;
    peerId: string;
};

export const EMPTY_ARR: never[] = [];

type ChatState = {
    chats: Record<string, ChatVM>;
    messages: Record<string, Message[]>;
    lastIds: Record<string, number | undefined>;
    polling: Record<string, number | undefined>;
    bootstrap: () => Promise<void>;
    openDM: (peerId: string) => Promise<string>;
    loadInitial: (chatId: string) => Promise<void>;
    fetchNew: (chatId: string) => Promise<void>;
    startPolling: (chatId: string, everyMs: number) => void;
    stopPolling: (chatId: string) => void;
    send: (chatId: string, text: string) => Promise<void>;
    loaded: Record<string, boolean>;
    missing: Record<string, boolean>;
    realtimeBound: boolean;
    bindRealtime: () => void;
    addMessage: (m: Message) => void;
    mergeMessages: (chatId: string, incoming: Message[]) => void;
};

function msgKey(m: Message): string {
    return (m.id && m.id > 0) ? `i:${m.id}` : `u:${m.uuid}`;
}

function normalize(m: Message): Message {
    return { ...m, id: typeof m.id === "string" ? Number(m.id) : m.id };
}

export const useChat = create<ChatState>((set, get) => ({
    chats: {},
    messages: {},
    lastIds: {},
    polling: {},
    loaded: {},
    missing: {},

    mergeMessages: (chatId, incoming) => {
        if (!incoming || incoming.length === 0) return;

        set((s) => {
            const prev = s.messages[chatId] ?? EMPTY_ARR;
            const map = new Map<string, Message>();
            for (const m of prev) map.set(msgKey(m), m);
            for (const raw of incoming) map.set(msgKey(raw), normalize(raw));

            const next = Array.from(map.values()).sort((a, b) => {
                const ai = a.id || 0, bi = b.id || 0;
                if (ai !== bi) return ai - bi;
                const ac = a.createdAt || "", bc = b.createdAt || "";
                return ac.localeCompare(bc);
            });

            const last = next.length ? next[next.length - 1].id : s.lastIds[chatId];

            return {
                ...s,
                messages: { ...s.messages, [chatId]: next },
                lastIds: { ...s.lastIds, [chatId]: last },
            };
        });
    },


    bootstrap: async () => {
        const me = getUserIdFromToken(useAuth.getState().accessToken) || "";
        const { chats } = await Chats.list();

        const mapped: Record<string, ChatVM> = {};
        const idsToPrefetch: string[] = [];
        for (const c of chats) {
            const peerId = c.user1Id === me ? c.user2Id : c.user1Id;
            mapped[c.id] = { ...c, peerId };
            if (c.user1Id) idsToPrefetch.push(c.user1Id);
            if (c.user2Id) idsToPrefetch.push(c.user2Id);
        }
        set({ chats: mapped });

        useUsers.getState().ensureMany(idsToPrefetch).catch(() => {});
    },

    openDM: async (peerId: string): Promise<string> => {
        const access = useAuth.getState().accessToken;
        const me = getUserIdFromToken(access) ?? getSubject(access) ?? "me";

        const { chats } = get();
        const existing = Object.values(chats).find(
            (c) =>
                (c.user1Id === me && c.user2Id === peerId) ||
                (c.user2Id === me && c.user1Id === peerId)
        );
        if (existing) return existing.id;

        const srvChat = await Chats.getDirectChat(peerId);
        const chatId = srvChat.id;

        const vm: ChatVM = {
            ...srvChat,
            peerId: srvChat.user1Id === me ? srvChat.user2Id : srvChat.user1Id,
        };

        set((s) => ({
            ...s,
            chats: { ...s.chats, [chatId]: vm },
        }));

        return chatId;
    },

    loadInitial: async (chatId) => {
        try {
            const { messages } = await Chats.history(chatId, undefined, 50);
            get().mergeMessages(chatId, messages);
            set((s) => ({
                ...s,
                missing: { ...s.missing, [chatId]: false },
            }));
        } catch (e: any) {
            set((s) => ({
                ...s,
                missing: { ...s.missing, [chatId]: true },
            }));
        }
    },
    fetchNew: async (chatId) => {
        if (get().missing[chatId]) return;
        const afterId = get().lastIds[chatId];
        const { messages } = await Chats.history(chatId, afterId, 50);
        if (!messages?.length) return;
        set(s => {
            const prev = s.messages[chatId] ?? [];
            const next = [...prev, ...messages].sort((a,b)=>a.id-b.id);
            if (next.length === prev.length) return s;
            return {
                messages: { ...s.messages, [chatId]: next },
                lastIds:  { ...s.lastIds,  [chatId]: next.at(-1)?.id },
            };
        });
    },

    startPolling: (chatId, ms = 1500) => {
        const cur = get().polling[chatId];
        if (cur) return;

        const timer = window.setInterval(async () => {
            const after = get().lastIds[chatId];
            try {
                const { messages } = await Chats.history(chatId, after, 50);
                if (messages.length) {
                    get().mergeMessages(chatId, messages);
                }
            } catch {}
        }, Math.max(1000, ms));

        set((s) => ({
            ...s,
            polling: { ...s.polling, [chatId]: timer },
        }));
    },

    stopPolling: (chatId) => {
        const id = get().polling[chatId];
        if (id == null) return;
        window.clearInterval(id);
        set(s => {
            const next = { ...s.polling };
            delete next[chatId];
            return { polling: next };
        });
    },

    send: async (chatId, text) => {
        const msg = await Chats.sendText(chatId, text);
        get().mergeMessages(chatId, [msg]);
    },

    realtimeBound: false,
    addMessage: (m) => {
        set((s) => {
            const arr = s.messages[m.chatId] ? [...s.messages[m.chatId]] : [];
            const exists = arr.some(x => (x.id && m.id && x.id === m.id) || (x.uuid && m.uuid && x.uuid === m.uuid));
            if (!exists) arr.push(m);
            return { messages: { ...s.messages, [m.chatId]: arr } };
        });
    },
    bindRealtime: () => {
        const { realtimeBound } = get();
        if (realtimeBound) return;

        ws.on("message.new", (m) => {
            get().addMessage(m);

            void useUsers.getState().ensure([m.senderId]);

            const myId = getUserIdFromToken(useAuth.getState().accessToken) || "me";
            if (m.senderId !== myId && document.hidden) {
                const u = useUsers.getState().byId[m.senderId];
                const title = (u?.name || u?.login || "Новое сообщение");
                const snippet = (m.text || "").slice(0, 140);
                showNewMessage(title, snippet, `/chats/${m.chatId}`);
            }
        });

        set({ realtimeBound: true });
        ws.start();
        void ensurePermission();
    },
}));
