import { FormEvent, useState } from "react";
import Chat from "./Chat";
import { login } from "./api";

export default function App() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!username.trim()) return;
    try {
      setError(null);
      const res = await login(username, password);
      setToken(res.token);
      setLoggedIn(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    }
  };

  if (loggedIn) {
    return <Chat username={username.trim() || "游客"} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg border border-slate-200">
        <h1 className="text-2xl font-semibold text-slate-900 mb-4">登录</h1>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 border border-red-200">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <label className="block text-sm text-slate-600">用户名</label>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="输入任意用户名"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm text-slate-600">密码</label>
            <div className="relative flex items-center">
              <input
                type={showPassword ? "text" : "password"}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="密码可随意填写"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-600 hover:text-slate-800 focus:outline-none"
                aria-label={showPassword ? "隐藏密码" : "显示密码"}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-4 w-4"
                >
                  {showPassword ? (
                    <>
                      <path d="M3 3l18 18" />
                      <path d="M10.58 10.58a2 2 0 002.84 2.84" />
                      <path d="M9.88 5.38A9.53 9.53 0 0112 5c5 0 9 5 9 7a9.84 9.84 0 01-1.64 3.54" />
                      <path d="M6.1 6.1A9.89 9.89 0 003 12c0 2 4 7 9 7a8.45 8.45 0 003.9-1" />
                    </>
                  ) : (
                    <>
                      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                      <circle cx="12" cy="12" r="3" />
                    </>
                  )}
                </svg>
              </button>
            </div>
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1"
          >
            登录
          </button>
        </form>
      </div>
    </div>
  );
}
