import type { AxiosRequestConfig } from "axios";
import axios, { AxiosError } from "axios";
import { useAuth } from "../store/auth";

const BASE = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
const API_BASE_URL = import.meta.env.DEV
    ? (import.meta.env.VITE_DEV_API_BASE_URL as string | undefined) || `${BASE}/api`
    : (import.meta.env.VITE_API_BASE_URL as string | undefined) || `${BASE}/api`;

export const LOGIN_PATH = `${BASE}/login`;

export const redirectToLogin = () => {
    if (location.pathname !== LOGIN_PATH) {
        location.replace(LOGIN_PATH);
    }
};

export interface AuthResponse {
    tokenType: string;
    accessToken: string;
    refreshToken: string;
}
export interface LoginDTO { login: string; password: string; }

export interface User { id: string; login: string; name?: string; avatar?: string; }

export interface Chat {
    id: string;
    user1Id: string;
    user2Id: string;
    createdAt?: string;
}

export interface Message {
    uuid: string;
    id: number;
    chatId: string;
    senderId: string;
    text: string;
    file?: string;
    filePreview?: string;
    fileType?: string;
    createdAt?: string;
    readAt?: string | null;
}

export interface ContactsListResponse {
    items: User[];
    total: number;
}

export const api = axios.create({
    baseURL: `${API_BASE_URL}/v1`,
    headers: { "Content-Type": "application/json" },
});

const authApi = axios.create({
    baseURL: `${API_BASE_URL}/v1`,
    headers: { "Content-Type": "application/json" },
});

let getAccessToken: () => string | null = () => null;
let getRefreshToken: () => string | null = () => null;
let setTokens: (a: string | null, r: string | null) => void = () => {};

export const authWire = {
    useAccess(fn: typeof getAccessToken) { getAccessToken = fn; },
    useRefresh(fn: typeof getRefreshToken) { getRefreshToken = fn; },
    useSetTokens(fn: typeof setTokens) { setTokens = fn; },
};

api.interceptors.request.use((config: any) => {
    const t = getAccessToken?.();
    if (t) {
        config.headers = config.headers ?? {};
        config.headers["Authorization"] = `Bearer ${t}`;
    }
    return config;
});

let refreshing: Promise<void> | null = null;
let waitQueue: Array<() => void> = [];

function enqueueWait(): Promise<void> {
    return new Promise<void>((resolve) => { waitQueue.push(resolve); });
}
function flushQueue() { waitQueue.forEach((r) => r()); waitQueue = []; }

function isMessageLike(x: any): x is Message {
    return x && typeof x === "object" && "id" in x && "chatId" in x && "senderId" in x;
}

api.interceptors.response.use(
    (resp) => resp,
    async (error: AxiosError) => {
        const status = error.response?.status;
        const original = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
        const url = (original?.url || "") as string;

        if (status !== 401 || !original) {
            throw error;
        }

        if (url.includes("/api/v1/auth/login") || url.includes("/api/v1/auth/refresh-token")) {
            useAuth.getState().forceLogout();
            redirectToLogin();
            throw error;
        }

        if (original._retry) {
            useAuth.getState().forceLogout();
            redirectToLogin();
            throw error;
        }

        if (refreshing) {
            await enqueueWait();
            original._retry = true;
            return api(original);
        }

        try {
            refreshing = (async () => {
                const rt = getRefreshToken?.();
                if (!rt) throw new Error("No refresh token");

                const { data } = await authApi.post<{ accessToken: string; refreshToken: string }>(
                    "/auth/refresh-token",
                    { refreshToken: rt }
                );

                setTokens?.(data.accessToken, data.refreshToken);
                useAuth.getState().setTokens(data.accessToken, data.refreshToken);
            })();

            await refreshing;

            original._retry = true;
            original.headers = original.headers ?? {};
            (original.headers as any).Authorization = `Bearer ${getAccessToken?.()}`;
            return api(original);
        } catch (e) {
            useAuth.getState().forceLogout();
            redirectToLogin();
            throw error;
        } finally {
            refreshing = null;
            flushQueue();
        }
    }
);

export const Auth = {
    login: (dto: LoginDTO) =>
        authApi.post<AuthResponse>("/auth/login", dto).then(r => r.data),

    resetPassword: (login: string) =>
        authApi.post("/auth/reset-password", { login }),

    register: (login: string, password: string) =>
        authApi.post<void>("/auth/register", { login, password }).then(() => {}),

    refresh: async (body: { refreshToken: string }) => {
        const { data } = await authApi.post<{ accessToken: string; refreshToken: string }>(
            `/auth/refresh-token`,
            body
        );
        return data;
    },
};

export const Users = {
    list: () => api.get<{ items: User[]; count: number }>("/users").then(r => r.data),
    get: (id: string) => api.get<User>(`/users/${id}`).then(r => r.data),
};

export const Chats = {
    list: () =>
        api.get<{ chats: Chat[]; total: number }>("/chats").then(r => r.data),
    getDirectChat: (peerId: string) =>
        api.post<Chat>("/chats/direct", { peerId }).then(r => r.data),
    history: (chatId: string, afterId?: number, limit = 50) =>
        api.get<{ messages: Message[]; total: number }>(
            `/chats/${chatId}`,
            { params: { afterId, limit } }
        ).then(r => r.data),
    latest: async (chatId: string): Promise<Message | null> => {
        const { data } = await api.get<Message | { message?: Message | null }>(`/chats/${chatId}/latest`);
        if (isMessageLike(data)) return data;
        if (data && typeof data === "object" && "message" in data) {
            const m = (data as any).message;
            return isMessageLike(m) ? m : null;
        }
        return null;
    },
    sendText: (chatId: string, text: string) =>
        api.post<Message>(`/chats/${chatId}`, { text }).then(r => r.data),
};

export const Contacts = {
    listMutual: () =>
        api.get<ContactsListResponse>("/contacts/mutual").then(r => r.data),
    listInbound: () =>
        api.get<ContactsListResponse>("/contacts/inbound").then(r => r.data),
    listOutbound: () =>
        api.get<ContactsListResponse>("/contacts/outbound").then(r => r.data),
    add: (peerId: string) =>
        api.post<void>("/contacts", { peerId }).then(() => {}),
    remove: (peerId: string) =>
        api.delete<void>(`/contacts/${peerId}`).then(() => {}),
};

