import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users as UsersAPI, Contacts as ContactsAPI, type User } from "../lib/api";
import { useChat } from "../store/chat";
import { useVoice } from "../store/voice";
import { useAuth } from "../store/auth";
import { getSubject } from "../lib/jwt";
import { displayName } from "../lib/user";
import { Avatar, Card, Button, ImageModal } from "../ui/components";
import { ChatIcon, PhoneIcon, VideoIcon } from "../ui/icons";
import { useNavigate } from "react-router-dom";
import { useContacts } from "../store/contacts";

type Tab = "mutual" | "inbound" | "all";

function roomOf(a: string, b: string) {
    return [a, b].sort().join(":");
}

export default function UsersPage() {
    const [tab, setTab] = useState<Tab>("mutual");
    const [preview, setPreview] = useState<{ src: string; alt: string } | null>(null);

    const navigate = useNavigate();
    const openDM = useChat((s) => s.openDM);
    const { startAudio, startVideo } = useVoice();
    const meId = getSubject(useAuth.getState().accessToken) ?? "me";

    const { isMutual, add: addContact, bootstrap } = useContacts();

    useEffect(() => { void bootstrap(); }, [bootstrap]);

    const qMutual = useQuery({
        queryKey: ["contacts", "mutual"],
        queryFn: ContactsAPI.listMutual,
        enabled: tab === "mutual",
    });
    const qInbound = useQuery({
        queryKey: ["contacts", "inbound"],
        queryFn: ContactsAPI.listInbound,
        enabled: tab === "inbound",
    });
    const qAll = useQuery({
        queryKey: ["users", "all"],
        queryFn: UsersAPI.list,
        enabled: tab === "all",
    });

    const items: User[] = useMemo(() => {
        if (tab === "mutual") return qMutual.data?.items ?? [];
        if (tab === "inbound") return qInbound.data?.items ?? [];
        return qAll.data?.items ?? [];
    }, [tab, qMutual.data, qInbound.data, qAll.data]);

    const isLoading =
        (tab === "mutual" && qMutual.isLoading) ||
        (tab === "inbound" && qInbound.isLoading) ||
        (tab === "all" && qAll.isLoading);

    const isError =
        (tab === "mutual" && qMutual.isError) ||
        (tab === "inbound" && qInbound.isError) ||
        (tab === "all" && qAll.isError);

    return (
        <div style={{ display: "grid", gap: 12 }}>
            <Card>
                <div style={{ display: "flex", gap: 8 }}>
                    <TabBtn active={tab === "mutual"} onClick={() => setTab("mutual")}>Взаимные</TabBtn>
                    <TabBtn active={tab === "inbound"} onClick={() => setTab("inbound")}>Входящие</TabBtn>
                    <TabBtn active={tab === "all"} onClick={() => setTab("all")}>Все</TabBtn>
                </div>
            </Card>

            {isLoading && <Card>Загрузка…</Card>}
            {isError && <Card style={{ color: "#b44" }}>Не удалось загрузить данные</Card>}

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                    gap: 12,
                    alignItems: "stretch",
                }}
            >
                {items.map((u) => {
                    const name = displayName(u, u.id);
                    const canTalk = isMutual(u.id);
                    const roomId = roomOf(meId, u.id);

                    const goProfile = () => navigate(`/users/${u.id}`);
                    const keyHandler: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            goProfile();
                        }
                    };

                    return (
                        <Card
                            key={u.id}
                            onClick={goProfile}
                            role="button"
                            tabIndex={0}
                            onKeyDown={keyHandler}
                            style={{ cursor: "pointer" }}
                        >
                            <div style={{ display: "grid", gridTemplateRows: "auto auto", gap: 10 }}>
                                <div
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns: "auto 1fr",
                                        gap: 12,
                                        alignItems: "center",
                                    }}
                                >
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (u.avatar) setPreview({ src: u.avatar, alt: name });
                                        }}
                                        title="Открыть аватар"
                                        aria-label="Открыть аватар"
                                        style={{ all: "unset", cursor: u.avatar ? "zoom-in" : "default" }}
                                    >
                                        <Avatar size={44} name={name} src={u.avatar} />
                                    </button>

                                    <div style={{ minWidth: 0 }}>
                                        <div
                                            style={{
                                                fontWeight: 700,
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                            }}
                                        >
                                            {name}
                                        </div>
                                        <div
                                            style={{
                                                opacity: 0.75,
                                                fontSize: 12,
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                            }}
                                        >
                                            @{u.login}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                                    <Button
                                        aria-label="Открыть чат"
                                        title={canTalk ? "Открыть чат" : "Недоступно: нет взаимного контакта"}
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            if (!canTalk) return;
                                            const id = await openDM(u.id);
                                            if (id) navigate(`/chats/${id}`);
                                        }}
                                        disabled={!canTalk}
                                    >
                                        <ChatIcon />
                                    </Button>

                                    <Button
                                        aria-label="Аудиозвонок"
                                        title={canTalk ? "Аудиозвонок" : "Недоступно: нет взаимного контакта"}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (canTalk) void startAudio(u.id, roomId);
                                        }}
                                        disabled={!canTalk}
                                    >
                                        <PhoneIcon />
                                    </Button>

                                    <Button
                                        aria-label="Видеозвонок"
                                        title={canTalk ? "Видеозвонок" : "Недоступно: нет взаимного контакта"}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (canTalk) void startVideo(u.id, roomId);
                                        }}
                                        disabled={!canTalk}
                                    >
                                        <VideoIcon />
                                    </Button>
                                </div>

                                {tab === "inbound" && (
                                    <div>
                                        <Button
                                            kind="primary"
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                await addContact(u.id);
                                            }}
                                            aria-label="Добавить в контакты"
                                        >
                                            Добавить в контакты
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </Card>
                    );
                })}
            </div>

            {preview && (
                <ImageModal
                    src={preview.src}
                    alt={preview.alt}
                    onClose={() => setPreview(null)}
                />
            )}
        </div>
    );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: "1px solid var(--border, #293155)",
                background: active ? "rgba(255,255,255,0.06)" : "transparent",
                cursor: "pointer",
                color: "inherit",
                fontWeight: active ? 700 : 500,
            }}
        >
            {children}
        </button>
    );
}
