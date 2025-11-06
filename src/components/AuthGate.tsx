import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../store/auth";

export default function AuthGate() {
    const { isAuthed } = useAuth();
    const loc = useLocation();

    if (!isAuthed) {
        return <Navigate to="/login" replace state={{ from: loc }} />;
    }
    return <Outlet />;
}
