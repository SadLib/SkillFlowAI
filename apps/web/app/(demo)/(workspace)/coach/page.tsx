"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { BookOpen, FileText, LoaderCircle, MessageSquare, Send, Sparkles } from "lucide-react";
import { useDemo } from "@/components/demo-state";
import { ErrorBox, PageHeading } from "@/components/ui";
import { api, errorMessage, intentLabels, modes, suggestedQuestions, type CoachResult } from "@/lib/api";

type Exchange = { query: string; result?: CoachResult; error?: string };

export default function Coach() {
  const [input, setInput] = useState("");
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [pending, setPending] = useState(false);
  const { logCoach } = useDemo();
  const messages = useRef<HTMLDivElement>(null);
  const request = useRef<AbortController | null>(null);

  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    const panel = messages.current;
    if (!panel) return;
    const latest = panel.querySelector(".exchange:last-of-type .message-assistant");
    panel.scrollTop = latest && !pending
      ? panel.scrollTop + latest.getBoundingClientRect().top - panel.getBoundingClientRect().top - 8
      : panel.scrollHeight;
  }, [exchanges, pending]);

  async function send(query: string, retry = false) {
    const text = query.trim();
    if (!text || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    setExchanges((items) => [...(retry ? items.slice(0, -1) : items), { query: text }]);
    if (!retry) setInput("");
    try {
      const result = await api<CoachResult>("/api/coach", { query: text }, controller.signal);
      if (!controller.signal.aborted) {
        setExchanges((items) => [...items.slice(0, -1), { query: text, result }]);
        logCoach();
      }
    } catch (error) {
      if (!controller.signal.aborted) setExchanges((items) => [...items.slice(0, -1), { query: text, error: errorMessage(error) }]);
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setPending(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send(input);
  }

  return <>
    <PageHeading title="AI Coach" description="Consulta los procedimientos de NovaRetail y revisa la fuente de cada respuesta.">
      <Link className="button primary" href="/coach/sesion"><Sparkles size={17} /> Guiarme paso a paso</Link>
    </PageHeading>
    <section className="panel chat-panel" aria-label="Chat del AI Coach">
      <header className="chat-header"><span className="icon-tile"><Sparkles size={21} /></span><div><h2>Asistente de NovaRetail</h2><p>Base de conocimiento interna</p></div></header>
      <div ref={messages} className="messages" role="log" aria-label="Conversación" aria-live="polite">
        {!exchanges.length && <div className="chat-empty">
          <span className="icon-tile"><Sparkles size={27} /></span>
          <h2>¿En qué puedo ayudarte?</h2><p>Consulta los procesos de NovaRetail o elige una pregunta frecuente.</p>
          <div className="suggestions">{suggestedQuestions.map((item) => <button key={item.title} type="button" className="button secondary small"
            onClick={() => { void send(item.query); }}><MessageSquare size={15} />{item.title}</button>)}</div>
        </div>}
        {exchanges.map(({ query, result, error }, index) => <div className="exchange" key={index}>
          <div className="message-user">{query}</div>
          {result && <div className="message-assistant">
            <span className="mini-spark"><Sparkles size={16} /></span>
            <div className="message-answer">
              <div className="message-info"><b>SkillFlow AI</b><span className="tag purple">{intentLabels[result.intent.label]}</span></div>
              <p className="answer-content">{result.answer}</p>
              {result.documents.length > 0 && <details className="evidence-details" open>
                <summary><FileText size={16} /> Documentos consultados ({result.documents.length})</summary>
                <div className="evidence-list">{result.documents.map((doc) => <Link href={`/recipes/${doc.id}`} key={doc.id}><span>{doc.source}</span><span>{doc.score.toFixed(3)}</span></Link>)}</div>
              </details>}
              {result.recommended_recipe && <Link className="coach-recommendation" href={`/recipes/${result.recommended_recipe.id}`}><BookOpen size={17} /><span><small>Smart Recipe recomendada</small><strong>{result.recommended_recipe.title}</strong></span></Link>}
              <small className="mode-note">{modes[result.mode]}</small>
            </div>
          </div>}
          {error && <ErrorBox message={error} retry={index === exchanges.length - 1 && !pending ? () => { void send(query, true); } : undefined} />}
        </div>)}
        {pending && <div className="chat-loading" role="status"><LoaderCircle size={17} className="spin" /> Consultando procedimientos…</div>}
      </div>
      <form className="chat-form" onSubmit={submit}>
        <label className="sr-only" htmlFor="coach-query">Tu pregunta</label>
        <input id="coach-query" value={input} onChange={(event) => setInput(event.target.value)} maxLength={500} placeholder="Pregunta sobre un procedimiento…" />
        <button type="submit" className="button primary" disabled={pending || !input.trim()}><Send size={17} /> <span>Enviar</span></button>
      </form>
    </section>
  </>;
}
