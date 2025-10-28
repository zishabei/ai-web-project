export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";
export async function health(){ const r = await fetch(`${API_BASE}/health`); return r.json(); }
export async function askAI(prompt: string){
  const r = await fetch(`${API_BASE}/ai/ask`, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({prompt}) });
  return r.json();
}
