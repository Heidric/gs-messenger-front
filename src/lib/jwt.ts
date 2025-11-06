export function getSubject(token?: string | null): string | null {
    try {
        if (!token) return null;
        const payload = JSON.parse(atob(token.split(".")[1]));
        return payload?.subject || payload?.sub || null;
    } catch {
        return null;
    }
}

export function getUserIdFromToken(token?: string | null): string | null {
    if (!token) return null;
    try {
        const payload = JSON.parse(atob(token.split(".")[1] || ""));
        return payload?.userId || payload?.id || payload?.subject || payload?.sub || null;
    } catch {
        return null;
    }
}
