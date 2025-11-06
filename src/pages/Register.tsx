import type { FormEvent } from "react";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "../store/auth";

const schema = z.object({
    login: z.string().min(3, "Минимум 3 символа"),
    password: z.string().min(8, "Пароль от 8 символов"),
});

export default function Register() {
    const nav = useNavigate();
    const registerAndLogin = useAuth(s => s.registerAndLogin);
    const [login, setLogin] = useState("");
    const [password, setPassword] = useState("");
    const [err, setErr] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setErr(null);

        const parsed = schema.safeParse({ login, password });
        if (!parsed.success) {
            setErr(parsed.error.issues[0]?.message || "Неверные данные");
            return;
        }

        setLoading(true);
        try {
            await registerAndLogin(login, password);
            nav("/");
        } catch (e: any) {
            const status = e?.response?.status;
            if (status === 409) setErr("Логин уже занят");
            else if (status === 400) setErr("Проверьте логин и пароль");
            else setErr("Не удалось зарегистрироваться");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: 420, margin: "80px auto", fontFamily: "ui-sans-serif" }}>
            <h1>Регистрация</h1>
            <form onSubmit={onSubmit}>
                <label>Логин<br/>
                    <input value={login} onChange={e => setLogin(e.target.value)} required/>
                </label>
                <br/>
                <label>Пароль<br/>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} required/>
                </label>
                <br/>
                <button disabled={loading} type="submit">
                    {loading ? "Создаём профиль…" : "Зарегистрироваться"}
                </button>
            </form>
            {err && <p style={{ color:"crimson" }}>{err}</p>}
            <p style={{ marginTop: 12 }}>
                Уже с нами? <Link to="/login">Войти</Link>
            </p>
        </div>
    );
}
