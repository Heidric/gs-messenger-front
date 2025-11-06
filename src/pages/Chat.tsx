import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";

import { useChat, EMPTY_ARR } from "../store/chat";
import { useUsers } from "../store/users";
import { useAuth } from "../store/auth";
import { getSubject, getUserIdFromToken } from "../lib/jwt";
import { fmtTime } from "../lib/format";
import { displayName } from "../lib/user";
import { Card, Button, TextInput, ImageModal, Avatar } from "../ui/components";
import { PhoneIcon, VideoIcon } from "../ui/icons";
import { useVoice } from "../store/voice";
import { useContacts } from "../store/contacts";

function generateRoomId(a: string, b: string) {
    return [a, b].sort().join(":");
}

export default function ChatView() {
    const navigate = useNavigate();
    const { chatId } = useParams<{ chatId: string }>();

    const chat = useChat((s) => (chatId ? s.chats[chatId] : undefined));
    const msgs = useChat((s) => (chatId ? s.messages[chatId] ?? EMPTY_ARR : EMPTY_ARR));

    const loadInitial = useChat((s) => s.loadInitial);
    const startPolling = useChat((s) => s.startPolling);
    const stopPolling = useChat((s) => s.stopPolling);
    const send = useChat((s) => s.send);
    const ensureBoot = useChat((s) => s.bootstrap);
    const missing = useChat((s) => (chatId ? s.missing[chatId] : false));

    const ensureUsers = useUsers((s) => s.ensure);
    const getUser = useUsers((s) => s.get);
    const usersById = useUsers((s) => s.byId);

    const meId = getSubject(useAuth.getState().accessToken) ?? "me";
    const myId = getUserIdFromToken(useAuth.getState().accessToken) || "me";

    const { startAudio, startVideo } = useVoice();

    const peerId = useMemo(() => {
        if (!chat) return undefined;
        return chat.user1Id === meId ? chat.user2Id : chat.user1Id;
    }, [chat, meId]);

    const peer = getUser(peerId);
    const title = displayName(peer, peerId || "Чат");

    const add = useContacts(s => s.add);

    const canTalk = useContacts(s => !!(peerId && s.mutual[peerId]));

    const bootContacts = useContacts(s => s.bootstrap);
    useEffect(() => { void bootContacts(); }, [bootContacts]);

    useEffect(() => {
        if (!chatId) navigate("/chats", { replace: true });
    }, [chatId, navigate]);

    useEffect(() => {
        void ensureBoot();
    }, [ensureBoot]);

    const bootedRef = useRef<Record<string, boolean>>({});
    const polledRef = useRef<Record<string, boolean>>({});
    useEffect(() => {
        if (!chatId) return;
        if (!bootedRef.current[chatId]) {
            bootedRef.current[chatId] = true;
            void loadInitial(chatId);
        }
        if (!polledRef.current[chatId]) {
            polledRef.current[chatId] = true;
            startPolling(chatId, 1500);
        }
        return () => {
            if (polledRef.current[chatId]) {
                stopPolling(chatId);
                delete polledRef.current[chatId];
            }
        };
    }, [chatId, loadInitial, startPolling, stopPolling]);

    useEffect(() => {
        if (missing && chatId) {
            stopPolling(chatId);
            navigate("/chats", { replace: true });
        }
    }, [missing, chatId, stopPolling, navigate]);

    const peerIdsKey = useMemo(() => {
        if (!peerId) return "";
        const senders = msgs.map((m) => m.senderId);
        const uniq = Array.from(new Set([peerId, ...senders].filter(Boolean)));
        return uniq.join(",");
    }, [peerId, msgs]);

    const prevKeyRef = useRef<string>("");
    useEffect(() => {
        if (!peerIdsKey || prevKeyRef.current === peerIdsKey) return;
        prevKeyRef.current = peerIdsKey;
        const ids = peerIdsKey.split(",").filter(Boolean);
        if (ids.length) void ensureUsers(ids);
    }, [peerIdsKey, ensureUsers]);

    const listRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = listRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [msgs.length]);

    const [query, setQuery] = useState("");
    const q = query.trim().toLowerCase();
    const filteredMsgs = useMemo(() => {
        if (!q) return msgs;
        return msgs.filter((m) => (m.text || "").toLowerCase().includes(q));
    }, [msgs, q]);

    const [text, setText] = useState("");
    const doSend = async () => {
        if (!chatId || !canTalk) return;
        const t = text.trim();
        if (!t) return;
        setText("");
        await send(chatId, t);
    };

    const [showAvatar, setShowAvatar] = useState(false);

    if (!chatId) return null;
    const roomId = peerId ? generateRoomId(meId, peerId) : "";

    return (
        <div style={{ height: "calc(100dvh - 56px)", display: "grid", gridTemplateRows: "auto auto 1fr auto", gap: 12 }}>
            <Card>
                <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 44, width: "100%" }}>
                    <button
                        onClick={() => peer?.avatar && setShowAvatar(true)}
                        title="Открыть аватар"
                        style={{ all: "unset", cursor: peer?.avatar ? "zoom-in" : "default" }}
                        aria-label="Открыть аватар пользователя"
                    >
                        <Avatar size={36} name={title} src={peer?.avatar} />
                    </button>

                    {peerId ? (
                        <Link to={`/users/${peerId}`} style={{ fontWeight: 700, textDecoration: "none", color: "inherit" }}>
                            {title}
                        </Link>
                    ) : (
                        <div style={{ fontWeight: 700 }}>{title}</div>
                    )}

                    <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, minWidth: 260 }}>
                        <Button
                            aria-label="Аудиозвонок"
                            title={canTalk ? "Аудиозвонок" : "Недоступно: нет взаимного контакта"}
                            onClick={() => { if (peerId && canTalk) void startAudio(peerId, roomId); }}
                            disabled={!canTalk}
                        >
                            <PhoneIcon />
                        </Button>
                        <Button
                            aria-label="Видеозвонок"
                            title={canTalk ? "Видеозвонок" : "Недоступно: нет взаимного контакта"}
                            onClick={() => { if (peerId && canTalk) void startVideo(peerId, roomId); }}
                            disabled={!canTalk}
                        >
                            <VideoIcon />
                        </Button>

                        <TextInput
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Поиск по сообщениям…"
                            aria-label="Поиск по сообщениям"
                        />
                    </div>
                </div>
            </Card>

            {!canTalk && (
                <Card>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ fontWeight: 700 }}>Вы не можете писать этому пользователю</div>
                        <div style={{ marginLeft: "auto", opacity: 0.8, fontSize: 13 }}>Доступно только для взаимных контактов</div>
                        {peerId && (
                            <Button kind="primary" onClick={() => add(peerId)}>Добавить в контакты</Button>
                        )}
                    </div>
                </Card>
            )}

            <Card style={{ padding: 0, display: "grid", gridTemplateRows: "1fr", overflow: "hidden" }}>
                <div ref={listRef} style={{ padding: 16, overflowY: "auto", background: "var(--panel, #0f1430)" }}>
                    {!msgs.length && <div style={{ opacity: 0.6 }}>Загружаем историю…</div>}
                    {filteredMsgs.map((m) => {
                        const mine = m.senderId === myId || m.senderId === "me";
                        const authorUser = usersById[m.senderId];
                        const author = mine ? "Вы" : displayName(authorUser, m.senderId);
                        const time = fmtTime(m.createdAt);
                        return (
                            <div key={m.uuid || m.id} style={{ display: "flex", margin: "8px 0", justifyContent: mine ? "flex-end" : "flex-start" }}>
                                <div
                                    style={{
                                        maxWidth: "70%",
                                        padding: "8px 12px",
                                        borderRadius: 12,
                                        background: mine ? "#152242" : "#12182f",
                                        border: "1px solid var(--border)",
                                    }}
                                >
                                    <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
                                        <b>{author}</b> · {time}
                                    </div>
                                    <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Card>

            <Composer text={text} setText={setText} onSend={doSend} disabled={!canTalk} />

            {peer?.avatar && showAvatar && (
                <ImageModal
                    src={peer.avatar}
                    alt={displayName(peer, peer.id)}
                    onClose={() => setShowAvatar(false)}
                />
            )}
        </div>
    );
}

type EmojiCategory = { id: string; title: string; list: string[] };

const EMOJI_CATS: EmojiCategory[] = [
    { id: "recent", title: "Недавние", list: [] },
    { id: "smileys", title: "Смайлы", list: ["😀","😁","😂","🤣","😊","😍","😘","😎","🤔","🤨","😅","🙃","🙂","😇","🥳","🤩","😢","😭","😤","😡","🤯","😴","🤗","🤝"] },
    { id: "gestures", title: "Жесты", list: ["👍","👎","🙏","👏","🙌","👌","✌️","👀","🤌","🤙","🫶","💪","🫡","🖖","🤟","✊","👋"] },
    { id: "objects", title: "Объекты", list: ["🔥","✨","💯","🎉","📌","📎","📦","🛠️","🧩","🧰","🧨","🎁","🎯","🧭","⏰","📅","✏️","🖊️"] },
    { id: "food", title: "Еда", list: ["🍀","🍕","🍰","☕","🍺","🍎","🍫","🍩","🍪","🌮","🍔","🍣","🥐","🥗","🍵","🍷"] },
    { id: "symbols", title: "Символы", list: ["⚡","🌟","🌈","❤️","🧡","💛","💚","💙","💜","🖤","🤍","✨","⭐","✅","❌","❗","❓"] },
];

const RECENT_KEY = "emoji_recent_v1";
const RECENT_LIMIT = 24;

function loadRecent(): string[] {
    try {
        const raw = localStorage.getItem(RECENT_KEY);
        if (!raw) return [];
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
    } catch {
        return [];
    }
}
function saveRecent(list: string[]) {
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_LIMIT))); } catch {}
}

function Composer({
                      text,
                      setText,
                      onSend,
                      disabled,
                  }: {
    text: string;
    setText: (v: string) => void;
    onSend: () => void;
    disabled?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState<string>("recent");
    const [recent, setRecent] = useState<string[]>(() => loadRecent());
    const popRef = useRef<HTMLDivElement | null>(null);
    const btnRef = useRef<HTMLButtonElement | null>(null);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
        const onClick = (e: MouseEvent) => {
            const t = e.target as Node;
            if (popRef.current && !popRef.current.contains(t) && btnRef.current && !btnRef.current.contains(t)) setOpen(false);
        };
        window.addEventListener("keydown", onKey);
        window.addEventListener("mousedown", onClick);
        return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("mousedown", onClick); };
    }, [open]);

    const addEmoji = (emoji: string) => {
        setText(text + emoji);
        setRecent((prev) => {
            const next = [emoji, ...prev.filter((e) => e !== emoji)].slice(0, RECENT_LIMIT);
            saveRecent(next);
            return next;
        });
    };

    useEffect(() => { if (tab === "recent" && recent.length === 0) setTab("smileys"); }, [tab, recent.length]);

    const categories: EmojiCategory[] = useMemo(
        () => EMOJI_CATS.map((c) => (c.id === "recent" ? { ...c, list: recent } : c)),
        [recent]
    );

    return (
        <Card>
            <div className="row" style={{ alignItems: "center", gap: 8 }}>
                <TextInput
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => { if (!disabled && e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
                    placeholder={disabled ? "Недоступно: нет взаимного контакта" : "Напишите сообщение…"}
                    disabled={disabled}
                />
                <div style={{ position: "relative" }}>
                    <Button
                        ref={btnRef as any}
                        aria-label="Эмодзи"
                        onClick={() => !disabled && setOpen((v) => !v)}
                        title={disabled ? "Недоступно" : "Эмодзи"}
                        disabled={disabled}
                    >
                        😊
                    </Button>

                    {open && !disabled && (
                        <div
                            ref={popRef}
                            style={{
                                position: "absolute",
                                bottom: "110%",
                                right: 0,
                                background: "#0f1430",
                                border: "1px solid var(--border, #293155)",
                                borderRadius: 12,
                                boxShadow: "0 10px 24px rgba(0,0,0,.35)",
                                width: 320,
                                maxHeight: 340,
                                boxSizing: "border-box",
                                display: "grid",
                                gridTemplateRows: "auto 1fr",
                                overflow: "hidden",
                                zIndex: 50,
                            }}
                        >
                            <div style={{ display: "flex", gap: 4, padding: 8, borderBottom: "1px solid var(--border, #293155)" }}>
                                {categories.map((c) => (
                                    <button
                                        key={c.id}
                                        onClick={() => setTab(c.id)}
                                        style={{
                                            padding: "6px 10px",
                                            borderRadius: 8,
                                            border: "1px solid transparent",
                                            background: tab === c.id ? "#1b244d" : "transparent",
                                            cursor: "pointer",
                                            color: "inherit",
                                            fontSize: 13,
                                            whiteSpace: "nowrap",
                                        }}
                                        title={c.title}
                                    >
                                        {c.title}
                                    </button>
                                ))}
                                <div style={{ marginLeft: "auto" }}>
                                    {tab === "recent" && recent.length > 0 && (
                                        <button
                                            onClick={() => { setRecent([]); saveRecent([]); }}
                                            style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border, #293155)", background: "transparent", cursor: "pointer", color: "inherit", fontSize: 12 }}
                                            title="Очистить недавние"
                                        >
                                            Очистить
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div
                                style={{
                                    padding: 8,
                                    overflowY: "auto",
                                    display: "grid",
                                    gridTemplateColumns: "repeat(8, 1fr)",
                                    gap: 4,
                                    boxSizing: "border-box",
                                }}
                            >
                                {categories.find((c) => c.id === tab)!.list.map((e) => (
                                    <button key={e} onClick={() => addEmoji(e)} style={emojiBtn} title={e}>{e}</button>
                                ))}
                                {categories.find((c) => c.id === tab)!.list.length === 0 && (
                                    <div style={{ gridColumn: "1 / -1", opacity: 0.6, padding: 8, fontSize: 13 }}>
                                        Пусто. Выберите другую категорию.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                <Button onClick={onSend} disabled={disabled}>Отправить</Button>
            </div>
        </Card>
    );
}

const emojiBtn: React.CSSProperties = {
    width: 32,
    height: 32,
    lineHeight: "32px",
    textAlign: "center",
    borderRadius: 8,
    border: "1px solid transparent",
    background: "transparent",
    cursor: "pointer",
    fontSize: 18,
};
