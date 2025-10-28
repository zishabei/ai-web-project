import { useEffect, useState } from "react";
import { health, askAI } from "./api";
export default function App(){
  const [status,setStatus]=useState("checking...");
  const [prompt,setPrompt]=useState("用两句话介绍该系统");
  const [answer,setAnswer]=useState("");
  useEffect(()=>{ health().then(d=>setStatus(d.status)).catch(()=>setStatus("error")); },[]);
  return (<div className="min-h-screen p-8 space-y-6">
    <h1 className="text-2xl font-bold">AI Web 项目前端</h1>
    <div>后端健康：<span className="font-mono">{status}</span></div>
    <div className="space-y-2">
      <textarea className="w-full border p-2 rounded" rows={4} value={prompt} onChange={e=>setPrompt(e.target.value)} />
      <button className="px-4 py-2 rounded bg-black text-white" onClick={async()=>{
        setAnswer("思考中…"); const r = await askAI(prompt); setAnswer(r.text || JSON.stringify(r));
      }}>询问 AI</button>
    </div>
    <pre className="whitespace-pre-wrap border rounded p-3 bg-gray-50">{answer}</pre>
  </div>);
}
