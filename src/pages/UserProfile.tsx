import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUsers } from "../store/users";
import { useChat } from "../store/chat";
import { useAuth } from "../store/auth";
import { useVoice } from "../store/voice";
import { useContacts } from "../store/contacts";
import { getSubject } from "../lib/jwt";
import { displayName } from "../lib/user";
import { Card, Button, Avatar, ImageModal } from "../ui/components";
import {ChatIcon, PhoneIcon, VideoIcon} from "../ui/icons";


function generateRoomId(a: string, b: string) {
    return [a, b].sort().join(":");
}

export default function UserProfile() {
    const params = useParams<{ id?: string; userId?: string }>();
    let userId = params.id ?? params.userId;

    if (!userId) {
        const last = window.location.pathname.split("/").filter(Boolean).pop();
        if (last && last.length > 10) userId = last;
    }

    const navigate = useNavigate();

    const meId = getSubject(useAuth.getState().accessToken) ?? "me";
    const getUser = useUsers((s) => s.get);
    const fetchUser = useUsers((s) => s.fetch);
    const user = getUser(userId);

    const openDM = useChat((s) => s.openDM);

    const { startAudio, startVideo } = useVoice();

    const { loaded, add, remove, bootstrap } = useContacts();
    useEffect(() => { void bootstrap(); }, [bootstrap]);

    const isMutual = useContacts(s => !!(userId && s.mutual[userId]));
    const isInbound = useContacts(s => !!(userId && s.inbound[userId]));
    const isOutbound = useContacts(s => !!(userId && s.outbound[userId]));

    console.log("isMutual: ", isMutual);
    console.log("isInbound: ", isInbound);
    console.log("isOutbound: ", isOutbound);

    const relation: "unknown" | "mutual" | "inbound" | "outbound" | "none" =
        !loaded ? "unknown"
        : isMutual ? "mutual"
        : isInbound ? "inbound"
        : isOutbound ? "outbound"
        : "none";

    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [showAvatar, setShowAvatar] = useState(false);

    useEffect(() => {
        let alive = true;
        (async () => {
            if (!userId) return;
            if (getUser(userId)) return;
            setLoading(true);
            setErr(null);
            try {
                await fetchUser(userId);
            } catch (e) {
                if (alive) setErr("Не удалось загрузить пользователя");
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, [userId, getUser, fetchUser]);

    const title = useMemo(() => displayName(user, userId || "Пользователь"), [user, userId]);

    const roomId = userId ? generateRoomId(meId, userId) : "";

    const canOpenChatOrCall = isMutual && userId && userId !== meId;

    return (
        <div style={{ display: "grid", gap: 12 }}>
            <Card>
                {!userId ? (
                    <div>Некорректный адрес профиля</div>
                ) : loading ? (
                    <div>Загружаем профиль…</div>
                ) : err ? (
                    <div style={{ color: "crimson" }}>{err}</div>
                ) : !user ? (
                    <div>Пользователь не найден</div>
                ) : (
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "auto 1fr",
                            gap: 16,
                            alignItems: "center",
                        }}
                    >
                        <button
                            onClick={() => user.avatar && setShowAvatar(true)}
                            title="Открыть аватар"
                            style={{ all: "unset", cursor: user.avatar ? "zoom-in" : "default" }}
                            aria-label="Открыть аватар пользователя"
                        >
                            <Avatar size={72} name={title} src={user.avatar} />
                        </button>

                        <div style={{ minWidth: 0 }}>
                            <div
                                style={{
                                    fontWeight: 800,
                                    fontSize: 18,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                }}
                                title={title}
                            >
                                {title}
                            </div>
                            <div style={{ opacity: 0.75, marginTop: 2 }}>
                                @{user.login || user.id?.slice(0, 8)}
                            </div>

                            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                                <Button
                                    kind="primary"
                                    disabled={!canOpenChatOrCall}
                                    onClick={async () => {
                                        if (!userId) return;
                                        try {
                                            const cid = await openDM(userId);
                                            if (cid) navigate(`/chats/${cid}`);
                                        } catch {
                                            alert("Не удалось открыть диалог");
                                        }
                                    }}
                                    title={canOpenChatOrCall ? "Открыть чат" : "Доступно только для взаимных контактов"}
                                    aria-label="Открыть чат"
                                >
                                    <ChatIcon />
                                </Button>

                                <Button
                                    disabled={!canOpenChatOrCall}
                                    onClick={() => {
                                        if (userId) void startAudio(userId, roomId);
                                    }}
                                    title={canOpenChatOrCall ? "Аудиозвонок" : "Доступно только для взаимных контактов"}
                                    aria-label="Аудиозвонок"
                                >
                                    <PhoneIcon />
                                </Button>

                                <Button
                                    disabled={!canOpenChatOrCall}
                                    onClick={() => {
                                        if (userId) void startVideo(userId, roomId);
                                    }}
                                    title={canOpenChatOrCall ? "Видеозвонок" : "Доступно только для взаимных контактов"}
                                    aria-label="Видеозвонок"
                                >
                                    <VideoIcon />
                                </Button>

                                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                                    {relation === "unknown" && (
                                        <Button disabled>Проверяем…</Button>
                                    )}

                                    {isMutual && (
                                        <>
                                            <Button disabled>В контактах</Button>
                                            <Button kind="danger" onClick={() => remove(userId!)}>Убрать</Button>
                                        </>
                                    )}

                                    {isInbound && (
                                        <Button onClick={() => add(userId!)}>Добавить в ответ</Button>
                                    )}

                                    {isOutbound && (
                                        <Button onClick={() => add(userId!)}>Ожидаем ответ</Button>
                                    )}

                                    {relation === "none" && (
                                        <Button onClick={() => add(userId!)}>Добавить</Button>
                                    )}
                                </div>
                            </div>

                            {!isMutual && userId !== meId && (
                                <div style={{ marginTop: 8, fontSize: 13, opacity: 0.75 }}>
                                    {isOutbound
                                        ? "Ожидаем взаимного добавления, чтобы можно было писать и звонить."
                                        : isInbound
                                            ? "Этот пользователь добавил вас. Добавьте его, чтобы общаться."
                                            : "Добавьте друг друга в контакты, чтобы писать и звонить."}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Card>

            {user?.avatar && showAvatar && (
                <ImageModal src={user.avatar} alt={displayName(user, user.id)} onClose={() => setShowAvatar(false)} />
            )}
        </div>
    );
}
