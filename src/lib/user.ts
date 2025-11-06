import type { User } from "../store/users";
export const displayName = (u?: User, fallback?: string) => u?.name || u?.login || fallback || "-";
