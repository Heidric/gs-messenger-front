import { createBrowserRouter } from "react-router-dom";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Users from "./pages/Users";
import Voice from "./pages/Voice";
import ChatsPage from "./pages/Chats";
import ChatView from "./pages/Chat";
import BootGate from "./components/BootGate";
import AuthGate from "./components/AuthGate";
import AppLayout from "./layout/AppLayout";
import UserProfilePage from "./pages/UserProfile";

export const router = createBrowserRouter([
    {
        element: <BootGate />,
        children: [
            { path: "/login", element: <Login /> },
            { path: "/register", element: <Register /> },

            {
                element: <AuthGate />,
                children: [
                    {
                        element: <AppLayout />,
                        children: [
                            { index: true, element: <ChatsPage /> },
                            { path: "/chats", element: <ChatsPage /> },
                            { path: "/chats/:chatId", element: <ChatView /> },
                            { path: "/users", element: <Users /> },
                            { path: "/users/:userId", element: <UserProfilePage /> },
                            { path: "/voice", element: <Voice /> },
                        ],
                    },
                ],
            },
        ],
    },
]);
