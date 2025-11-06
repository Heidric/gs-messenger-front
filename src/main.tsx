import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router } from "./router";
import { authWire } from "./lib/api";
import { useAuth } from "./store/auth";
import "./ui/theme.css";
import {ErrorBoundary} from "./components/ErrorBoundary";

const qc = new QueryClient();

authWire.useAccess(() => useAuth.getState().accessToken);
authWire.useRefresh(() => useAuth.getState().refreshToken);
authWire.useSetTokens((a, r) => useAuth.getState().setTokens(a, r));

ReactDOM.createRoot(document.getElementById("root")!).render(
    <ErrorBoundary>
        <QueryClientProvider client={qc}>
            <RouterProvider router={router} />
        </QueryClientProvider>
    </ErrorBoundary>
);
