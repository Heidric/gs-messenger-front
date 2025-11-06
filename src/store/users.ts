import { create } from "zustand";
import { Users as UsersAPI } from "../lib/api";

export type User = { id: string; login?: string; name?: string; avatar?: string };

type UsersState = {
    byId: Record<string, User>;
    loading: Set<string>;
    get: (id?: string) => User | undefined;
    fetch: (id: string) => Promise<User | undefined>;
    ensure: (ids: (string | undefined | null)[]) => Promise<void>;
    ensureMany: (ids: string[]) => Promise<void>;
};

export const useUsers = create<UsersState>((set, get) => ({
    byId: {},
    loading: new Set(),

    get: (id) => (id ? get().byId[id] : undefined),

    fetch: async (id: string) => {
        if (!id) return;
        const { byId, loading } = get();
        if (byId[id] || loading.has(id)) return byId[id];

        loading.add(id);
        set({ loading: new Set(loading) });

        try {
            const u = await UsersAPI.get(id);
            console.log("Fetched user: ", u);
            set(s => ({ byId: { ...s.byId, [u.id]: u } }));
            return u;
        } catch {
            return undefined;
        } finally {
            const l = get().loading;
            l.delete(id);
            set({ loading: new Set(l) });
        }
    },

    ensure: async (ids) => {
        const uniq = Array.from(new Set((ids.filter(Boolean) as string[])));
        const { byId } = get();
        const toFetch = uniq.filter(id => !byId[id]);
        if (toFetch.length === 0) return;
        await Promise.all(toFetch.map(id => get().fetch(id)));
    },

    ensureMany: async (ids) => {
        const pending = ids.filter(id => get().byId[id] === undefined);
        await Promise.all(pending.map(id => get().fetch(id)));
    },
}));
