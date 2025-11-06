import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../store/auth";

export default function LoginPage() {
    const { login, registerAndLogin } = useAuth();
    const [l, setL] = useState("");
    const [p, setP] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const nav = useNavigate();
    const loc = useLocation() as any;
    const from = loc.state?.from?.pathname || "/chats";

    const doLogin = async () => {
        setError(null);
        setBusy(true);
        try {
            await login(l.trim(), p);
            nav(from, { replace: true });
        } catch (e: any) {
            setError(e?.message || "Не удалось войти");
        } finally {
            setBusy(false);
        }
    };

    const doRegister = async () => {
        setError(null);
        setBusy(true);
        try {
            await registerAndLogin(l.trim(), p);
            nav(from, { replace: true });
        } catch (e: any) {
            setError(e?.message || "Не удалось зарегистрироваться");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div style={{ display:"grid", placeItems:"center", height:"100vh", fontFamily:"ui-sans-serif" }}>
            <div style={{ width:360, padding:24, border:"1px solid #eee", borderRadius:12, boxShadow:"0 10px 30px rgba(0,0,0,.06)", background:"#fff" }}>
                <h2 style={{ marginTop:0, marginBottom:16, textAlign:"center", color:"#000000" }}>Вход</h2>
                <div style={{ display:"grid", gap:10 }}>
                    <input
                        placeholder="Логин"
                        value={l}
                        onChange={e=>setL(e.target.value)}
                        disabled={busy}
                        style={{ padding:"10px 12px", borderRadius:10, border:"1px solid #ddd" }}
                    />
                    <input
                        placeholder="Пароль"
                        type="password"
                        value={p}
                        onChange={e=>setP(e.target.value)}
                        disabled={busy}
                        style={{ padding:"10px 12px", borderRadius:10, border:"1px solid #ddd" }}
                    />
                    {error && <div style={{ color:"#b00", fontSize:13 }}>{error}</div>}
                    <div style={{ display:"flex", gap:8 }}>
                        <button onClick={doLogin} disabled={busy} style={{ flex:1 }}>Войти</button>
                        <button onClick={doRegister} disabled={busy} style={{ flex:1, opacity:0.9 }}><Link to="/register">Регистрация</Link></button>
                    </div>
                </div>
            </div>
        </div>
    );
}
