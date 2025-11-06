import { create } from "zustand";
import { Users } from "../lib/api";
import { useAuth } from "./auth";

type AppState = {
    booting: boolean;
    booted: boolean;
    bootError: any;
    boot: () => Promise<void>;
    resetBoot: () => void;
};

export const useApp = create<AppState>((set, get) => ({
    booting: false,
    booted: false,
    bootError: null,

    resetBoot: () => set({ booting: false, booted: false, bootError: null }),

    boot: async () => {
        const { booting, booted } = get();
        const access = useAuth.getState().accessToken;
        if (!access) return;
        if (booting || booted) return;

        set({ booting: true, bootError: null });
        try {
            await Users.list();
            set({ booting: false, booted: true, bootError: null });
            console.debug("[app.boot] OK");
        } catch (e: any) {
            const status = e?.response?.status;
            if (status === 401) {
                useAuth.getState().logout();
            } else {
                console.error("[app.boot] failed:", e);
            }
            set({ booting: false, booted: false, bootError: e });
        }
    },
}));
