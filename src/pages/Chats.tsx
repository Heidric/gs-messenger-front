import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useChat } from "../store/chat";
import { useUsers } from "../store/users";
import { displayName } from "../lib/user";
import { getSubject } from "../lib/jwt";
import { useAuth } from "../store/auth";
import {Avatar, Card} from "../ui/components";
import { Chats as ChatsAPI, type Message } from "../lib/api";
import { fmtWhen } from "../lib/format";

const CONCURRENCY_LIMIT = 4;

export default function ChatsPage() {
    const chats = useChat((s) => s.chats);
    const messages = useChat((s) => s.messages);
    const meId = getSubject(useAuth.getState().accessToken) ?? "me";
    const bootstrap = useChat((s) => s.bootstrap);

    const usersById = useUsers((s) => s.byId);
    const ensureUsers = useUsers((s) => s.ensure);

    const [lastByChat, setLastByChat] = useState<Record<string, Message | null>>({});
    const [loadingLast, setLoadingLast] = useState<Record<string, boolean>>({});

    useEffect(() => { void bootstrap(); }, [bootstrap]);

    const pendingChatIds = useMemo(() => {
        const list = Object.values(chats || {});
        return list
            .filter((c) => {
                const storeArr = messages[c.id];
                if (storeArr && storeArr.length > 0) return false;
                if (c.id in lastByChat) return false;
                if (loadingLast[c.id]) return false;
                return true;
            })
            .map((c) => c.id);
    }, [chats, messages, lastByChat, loadingLast]);

    async function fetchLatest(chatId: string): Promise<Message | null> {
        try {
            return await ChatsAPI.latest(chatId);
        } catch {
            return null;
        }
    }

    useEffect(() => {
        if (pendingChatIds.length === 0) return;

        const inFlight = Object.keys(loadingLast).length;
        const freeSlots = Math.max(0, CONCURRENCY_LIMIT - inFlight);
        if (freeSlots <= 0) return;

        const toStart = pendingChatIds.slice(0, freeSlots);

        toStart.forEach((chatId) => {
            setLoadingLast((s) => ({ ...s, [chatId]: true }));

            void fetchLatest(chatId)
                .then((m) => {
                    setLastByChat((s) => ({ ...s, [chatId]: m }));
                })
                .finally(() => {
                    setLoadingLast((s) => {
                        const n = { ...s };
                        delete n[chatId];
                        return n;
                    });
                });
        });
    }, [pendingChatIds, loadingLast]);

    useEffect(() => {
        const list = Object.values(chats || {});
        const peerIds = list.map((c) => (c.user1Id === meId ? c.user2Id : c.user1Id));

        const lastSendersInStore = list
            .map((c) => {
                const arr = messages[c.id];
                return arr && arr.length ? arr[arr.length - 1].senderId : undefined;
            })
            .filter(Boolean) as string[];

        const lastSendersFetched = Object.values(lastByChat)
            .map((m) => m?.senderId)
            .filter(Boolean) as string[];

        const need = [...new Set([...peerIds, ...lastSendersInStore, ...lastSendersFetched])];
        if (need.length) void ensureUsers(need);
    }, [chats, messages, lastByChat, meId, ensureUsers]);

    const items = useMemo(() => Object.values(chats || {}), [chats]);

    return (
        <div style={{ display: "grid", gap: 12 }}>
            {items.map((c) => {
                const peerId = c.user1Id === meId ? c.user2Id : c.user1Id;
                const peer = usersById[peerId];

                const arr = messages[c.id];
                const last = arr && arr.length ? arr[arr.length - 1] : lastByChat[c.id];

                const isLoading = !!loadingLast[c.id];
                const authorUser = last ? usersById[last.senderId] : undefined;
                const author = last ? (last.senderId === meId ? "Вы" : displayName(authorUser, last.senderId)) : "";
                const time = last?.createdAt ? fmtWhen(last.createdAt) : "";

                const rawText = last?.text ?? "";
                const hasText = rawText.trim().length > 0;
                const text = hasText ? collapseSpaces(rawText) : "";

                return (
                    <Card key={c.id}>
                        <Link
                            to={`/chats/${c.id}`}
                            style={{
                                display: "grid",
                                gridTemplateColumns: "auto 1fr",
                                alignItems: "center",
                                gap: 12,
                                textDecoration: "none",
                                color: "inherit",
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10,
                                    minWidth: 0,
                                }}
                            >
                                <Avatar size={36} name={peerId} src={peer?.avatar} />
                                <span
                                    style={{
                                        fontWeight: 700,
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                    }}
                                    title={displayName(peer, peerId)}
                                >
                            {displayName(peer, peerId)}
                          </span>
                            </div>

                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "baseline",
                                    justifyContent: "flex-end",
                                    gap: 8,
                                    minWidth: 0,
                                    opacity: 0.9,
                                    fontSize: 13,
                                }}
                            >
                          <span style={{ whiteSpace: "nowrap", opacity: 0.75 }}>
                            {author && time ? `${author} · ${time}` : author || time}
                          </span>
                                {isLoading ? (
                                    <span style={{ whiteSpace: "nowrap", opacity: 0.6 }}>Загрузка…</span>
                                ) : hasText ? (
                                    <span
                                        style={{
                                            whiteSpace: "nowrap",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            opacity: 0.85,
                                            maxWidth: "46vw",
                                        }}
                                        title={text}
                                    >
                                      - {text}
                                    </span>
                                ) : (
                                    <span style={{ whiteSpace: "nowrap", opacity: 0.6 }}>Нет сообщений</span>
                                )}
                            </div>
                        </Link>
                    </Card>
                );
            })}
        </div>
    );
}

function collapseSpaces(s: string) {
    return s.replace(/\s+/g, " ").trim();
}
