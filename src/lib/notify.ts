export async function ensurePermission(): Promise<NotificationPermission | undefined> {
    try {
        if (!("Notification" in window)) return;
        if (Notification.permission === "default") {
            return await Notification.requestPermission();
        }
        return Notification.permission;
    } catch {
        return Notification.permission;
    }
}

export function canSilentNotifyNow(): boolean {
    if (typeof document === "undefined") return true;
    const hidden = document.hidden;
    const focused = typeof document.hasFocus === "function" ? document.hasFocus() : true;
    return hidden || !focused;
}

export function showNewMessage(title: string, body: string, chatUrl?: string): Notification | null {
    try {
        if (!("Notification" in window)) return null;
        if (Notification.permission !== "granted") return null;

        const n = new Notification(title, { body });
        if (chatUrl) {
            n.onclick = () => {
                try { window.focus(); } catch {}
                window.location.assign(chatUrl);
                try { n.close(); } catch {}
            };
        }
        return n;
    } catch {
        return null;
    }
}

type CallNotifyOpts = {
    body?: string;
    icon?: string;
    tag?: string;
    onClick?: () => void;
};

export function showIncomingCall(title: string, opts?: CallNotifyOpts): Notification | null {
    try {
        if (!("Notification" in window)) return null;
        if (Notification.permission !== "granted") return null;

        const n = new Notification(title, {
            body: opts?.body,
            icon: opts?.icon,
            tag: opts?.tag,
            silent: false,
        });
        if (opts?.onClick) {
            n.onclick = () => {
                try { window.focus(); } catch {}
                try { opts.onClick!(); } catch {}
                try { n.close(); } catch {}
            };
        }
        return n;
    } catch {
        return null;
    }
}
