import { create } from "zustand";
import { Contacts as API } from "../lib/api";

const LS_OUTBOUND_KEY = "contacts_outbound_v1";

function loadOutboundLS(): Record<string, true> {
    try {
        const raw = localStorage.getItem(LS_OUTBOUND_KEY);
        if (!raw) return {};
        const arr = JSON.parse(raw);
        if (!Array.isArray(arr)) return {};
        const rec: Record<string, true> = {};
        for (const id of arr) if (typeof id === "string" && id) rec[id] = true;
        return rec;
    } catch {
        return {};
    }
}
function saveOutboundLS(rec: Record<string, true>) {
    try {
        localStorage.setItem(LS_OUTBOUND_KEY, JSON.stringify(Object.keys(rec)));
    } catch {}
}

type ContactsState = {
    mutual: Record<string, true>;
    inbound: Record<string, true>;
    outbound: Record<string, true>;

    loaded: boolean;
    loading: boolean;

    bootstrap: () => Promise<void>;
    refresh: () => Promise<void>;

    isMutual: (id?: string) => boolean;
    isInbound: (id?: string) => boolean;
    isOutbound: (id?: string) => boolean;

    add: (peerId: string) => Promise<void>;
    remove: (peerId: string) => Promise<void>;
};

export const useContacts = create<ContactsState>((set, get) => ({
    mutual: {},
    inbound: {},
    outbound: loadOutboundLS(),

    loaded: false,
    loading: false,

    async bootstrap() {
        const st = get();
        if (st.loaded || st.loading) return;
        await get().refresh();
    },

    async refresh() {
        set({ loading: true });
        try {
            const [m, ib] = await Promise.all([
                API.listMutual(),
                API.listInbound(),
            ]);

            let serverOutbound: string[] = [];
            try {
                const ob = await API.listOutbound();
                serverOutbound = ob.items.map(u => u.id);
            } catch {
                serverOutbound = [];
            }

            const mutual = m && m.items ? Object.fromEntries(m.items.map(u => [u.id, true] as const)) : {};
            const inbound = ib && ib.items ? Object.fromEntries(ib.items.map(u => [u.id, true] as const)) : {};

            const combinedOutbound: Record<string, true> = { ...get().outbound };
            for (const id of serverOutbound) combinedOutbound[id] = true;

            for (const id of Object.keys(combinedOutbound)) {
                if (mutual[id] || inbound[id]) delete combinedOutbound[id];
            }

            saveOutboundLS(combinedOutbound);

            set({
                mutual,
                inbound,
                outbound: combinedOutbound,
                loaded: true,
                loading: false,
            });
        } catch {
            set({ loading: false, loaded: true });
        }
    },

    isMutual:  (id) => !!id && !!get().mutual[id!],
    isInbound: (id) => !!id && !!get().inbound[id!],
    isOutbound:(id) => !!id && !!get().outbound[id!],

    async add(peerId) {
        await API.add(peerId);
        const outbound = { ...get().outbound, [peerId]: true as const };
        saveOutboundLS(outbound);
        set({ outbound });
        await get().refresh();
    },

    async remove(peerId) {
        await API.remove(peerId);
        const mutual   = { ...get().mutual };   delete mutual[peerId];
        const inbound  = { ...get().inbound };  delete inbound[peerId];
        const outbound = { ...get().outbound }; delete outbound[peerId];
        saveOutboundLS(outbound);
        set({ mutual, inbound, outbound });
        await get().refresh();
    },
}));
