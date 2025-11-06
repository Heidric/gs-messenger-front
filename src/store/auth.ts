import { create } from "zustand";
import { Auth } from "../lib/api";

type AuthState = {
    accessToken: string | null;
    refreshToken: string | null;
    isAuthed: boolean;
    setTokens: (a: string | null, r: string | null) => void;
    login: (login: string, password: string) => Promise<void>;
    registerAndLogin: (login: string, password: string) => Promise<void>;
    refresh: () => Promise<void>;
    logout: () => void;
    forceLogout: () => void;
};

export const useAuth = create<AuthState>((set, get) => ({
    accessToken: localStorage.getItem("accessToken"),
    refreshToken: localStorage.getItem("refreshToken"),
    isAuthed: !!localStorage.getItem("accessToken"),
    setTokens: (a, r) => {
        if (a) { localStorage.setItem("accessToken", a); }
        if (r) { localStorage.setItem("refreshToken", r); }
        set({ accessToken: a, refreshToken: r, isAuthed: true });
    },
    login: async (login, password) => {
        const res = await Auth.login({ login, password });
        get().setTokens(res.accessToken, res.refreshToken);
    },
    registerAndLogin: async (login, password) => {
        await Auth.register(login, password);
        await get().login(login, password);
    },
    refresh: async () => {
        const r = get().refreshToken;
        if (!r) throw new Error("No refresh token");
        const res = await Auth.refresh({ refreshToken: r });
        get().setTokens(res.accessToken, res.refreshToken);
    },
    logout: () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        set({ accessToken: null, refreshToken: null, isAuthed: false });
    },
    forceLogout: () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        set({ accessToken: null, refreshToken: null, isAuthed: false });
    },
}));
