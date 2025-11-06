export function fmtTime(iso?: string) {
    try {
        const d = iso ? new Date(iso) : new Date();
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch { return ""; }
}

export function fmtWhen(ts?: string | number | Date): string {
    if (!ts) return "";
    const d = new Date(ts);
    const now = new Date();

    const sameDay =
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate();
    if (sameDay) {
        return new Intl.DateTimeFormat("ru-RU", {
            hour: "2-digit",
            minute: "2-digit",
        }).format(d);
    }

    const sameYear = d.getFullYear() === now.getFullYear();
    const day = new Intl.DateTimeFormat("ru-RU", { day: "2-digit" }).format(d);
    const month = new Intl.DateTimeFormat("ru-RU", { month: "long" }).format(d);
    const year = new Intl.DateTimeFormat("ru-RU", { year: "numeric" }).format(d);
    const time = new Intl.DateTimeFormat("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
    }).format(d);

    return sameYear ? `${day} ${month} ${time}` : `${day} ${month} ${year} ${time}`;
}

