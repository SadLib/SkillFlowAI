"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { BookOpen, CheckCircle2, FileText, MessageCircle, Send, Sparkles, UsersRound } from "lucide-react";
import { profiles, useDemo } from "@/components/demo-state";
import { ErrorBox, Loading, PageHeading } from "@/components/ui";
import { api, errorMessage, intentLabels, useResource, type Intent } from "@/lib/api";
import { humanReviewCase, industryCase, practice, type GuidedEmployee, type GuidedTrial, type Workflow, type WorkflowRecommendation } from "@/lib/workflows";

type Result = { workflow: Workflow; reused: boolean };
type Phase = "start" | "objective" | "sample" | "review" | "capture" | "complete";
const phaseLabels = { objective: "Objetivo", sample: "Ticket", review: "Revisión", capture: "Resultado" } as const;

function Message({ text, coach = false }: { text: string; coach?: boolean }) {
  return <div className={`guided-message ${coach ? "guided-from-coach" : "guided-from-user"}`}>
    {coach && <span className="mini-spark"><Sparkles size={16} /></span>}
    <div><strong>{coach ? "SkillFlow AI" : "Tú"}</strong><p>{text}</p></div>
  </div>;
}

export default function GuidedCoachPage() {
  const { state, ready } = useDemo();

  if (!ready) return <Loading text="Preparando tu sesión…" />;
  if (state.role === "admin") return <>
    <PageHeading title="Sesión 1 a 1" description="Las sesiones de práctica están disponibles con los perfiles de empleados." />
    <div className="guided-actions"><Link className="button primary" href="/demo">Seleccionar cuenta</Link><Link className="button secondary" href="/admin#aportaciones">Revisar aportaciones</Link></div>
  </>;

  return <Session key={state.role} employee={state.role} />;
}

function Session({ employee }: { employee: GuidedEmployee }) {
  const { logCoach, complete } = useDemo();
  const defaults = practice[employee];
  const [need, setNeed] = useState(defaults.objective);
  const [searchNeed, setSearchNeed] = useState(defaults.objective);
  const suggestions = useResource<WorkflowRecommendation[]>(`/api/workflows/suggestions?employee=${employee}&need=${encodeURIComponent(searchNeed)}`);
  const [phase, setPhase] = useState<Phase>("start");
  const [sessionId, setSessionId] = useState("");
  const [origin, setOrigin] = useState<WorkflowRecommendation | null>(null);
  const [objective, setObjective] = useState("");
  const [sample, setSample] = useState("");
  const [trial, setTrial] = useState<GuidedTrial | null>(null);
  const [decision, setDecision] = useState("");
  const [title, setTitle] = useState(practice[employee].title);
  const [outcome, setOutcome] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const profile = profiles[employee];
  const messages = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const log = messages.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [phase]);

  function start(source: WorkflowRecommendation | null) {
    setSessionId(crypto.randomUUID());
    setOrigin(source);
    setObjective("");
    setSample("");
    setTrial(null);
    setDecision("");
    setTitle(defaults.title);
    setOutcome("");
    setResult(null);
    setError("");
    setPhase("objective");
  }

  async function classify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || sample.trim().length < 8) return;
    setPending(true);
    setError("");
    try {
      const intent = await api<Intent>("/api/classify", { query: sample });
      setTrial({ sample: sample.trim(), intent });
      setDecision(intent.label);
      setPhase("review");
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setPending(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !trial || outcome.trim().length < 8 || (!origin && !title.trim())) return;
    setPending(true);
    setError("");
    try {
      const workflow = origin
        ? await api<Workflow>(`/api/workflows/${origin.workflow.id}/reuse`, {
          employee, sample: trial.sample, category: decision, outcome,
        })
        : await api<Workflow>("/api/workflows", {
          id: sessionId, author: employee, objective, title, sample: trial.sample, category: decision, outcome,
        });
      setResult({ workflow, reused: Boolean(origin) });
      logCoach();
      if (origin) complete(origin.workflow.id);
      suggestions.reload();
      setPhase("complete");
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setPending(false);
    }
  }

  function useSuggestedResult() {
    setOutcome(`En este ticket de práctica confirmé la categoría ${intentLabels[decision]} y pude decidir a qué equipo derivarlo.`);
  }

  const step = phase in phaseLabels ? Object.keys(phaseLabels).indexOf(phase) : -1;
  return <>
    <PageHeading title="Sesión 1 a 1 con el coach" description={`Clasifica una solicitud de ${profile.team} y comparte un proceso útil con tu equipo.`}>
      <Link className="button secondary" href="/coach"><MessageCircle size={17} /> Consultar una política</Link>
    </PageHeading>
    {phase === "start" ? <div className="guided-start">
      <section className="panel inset-panel guided-intro">
        <span className="tag purple"><MessageCircle size={15} /> Sesión de texto</span>
        <h2>Organiza solicitudes de {profile.team.toLowerCase()} con IA</h2>
        <p>Clasifica un ticket con IA, revisa la sugerencia y comparte un proceso reutilizable con tu equipo.</p>
        <button className="button primary" onClick={() => start(null)}><Sparkles size={17} /> Guiarme paso a paso</button>
      </section>
      <section className="panel inset-panel guided-industry">
        <div className="section-title"><span className="icon-tile"><FileText size={19} /></span><h2>Casos de industria</h2></div>
        {[industryCase, humanReviewCase].map((caseStudy) => <article key={caseStudy.source}>
          <h3>{caseStudy.title}</h3><p>{caseStudy.description}</p>
          <a className="text-link" href={caseStudy.source} target="_blank" rel="noreferrer">Leer la fuente de Nubank</a>
        </article>)}
        <p><strong>Tu adaptación en NovaRetail.</strong> {defaults.objective}</p>
      </section>
      <section className="panel inset-panel guided-peers">
        <div className="section-title"><span className="icon-tile green"><UsersRound size={19} /></span><h2>Guías de tus compañeros</h2></div>
        <form className="guided-search" onSubmit={(event) => {
          event.preventDefault();
          if (need.trim().length < 8) return;
          if (need.trim() === searchNeed) suggestions.reload();
          else setSearchNeed(need.trim());
        }}><label>¿Qué problema quieres resolver?<input value={need} onChange={(event) => setNeed(event.target.value)} minLength={8} maxLength={280} /></label>
          <button className="button secondary" type="submit" disabled={need.trim().length < 8}>Buscar guías</button></form>
        {suggestions.error ? <ErrorBox message={suggestions.error} retry={suggestions.reload} /> :
          suggestions.loading ? <p className="muted" role="status">Buscando guías publicadas…</p> :
          suggestions.data?.length ? suggestions.data.map((item) => <article className="guided-peer" key={item.workflow.id}>
            <div><small>{item.workflow.author_name} · {item.workflow.team}</small><h3>{item.workflow.title}</h3>
              <p>{item.adaptation}</p><Link className="text-link" href={`/recipes/${item.workflow.id}`}>Ver guía original</Link>
            </div>
            <button type="button" className="button primary" onClick={() => start(item)}>Adaptar a mi equipo</button>
          </article>) : <p className="muted">Aún no hay aportaciones publicadas que coincidan con este problema.</p>}
      </section>
    </div> : phase === "complete" && result ? <section className="panel inset-panel guided-success" role="status">
      <span className="icon-tile green"><CheckCircle2 size={22} /></span>
      <h2>{result.reused ? "Reutilización registrada" : "Guía enviada para revisión"}</h2>
      <p>{result.reused
        ? `Aplicaste la guía de ${result.workflow.author_name} a ${profile.team}. Carlos puede ver el registro en Administración.`
        : `«${result.workflow.title}» queda pendiente hasta que Carlos la publique para el equipo.`}</p>
      <div className="guided-actions">
        {result.reused && <Link className="button primary" href={`/recipes/${result.workflow.id}`}>Ver guía original</Link>}
        <Link className={`button ${result.reused ? "secondary" : "primary"}`} href="/demo">Cambiar de cuenta</Link>
        <button className="button secondary" type="button" onClick={() => setPhase("start")}>Volver a las sesiones</button>
      </div>
    </section> : <div className="guided-live">
      <section className="panel inset-panel guided-conversation" aria-label="Sesión de texto">
        <div className="guided-live-header"><div className="section-title"><span className="icon-tile"><MessageCircle size={20} /></span><div><h2>Conversación con {profile.firstName}</h2><small>{origin ? `Adaptando una guía de ${origin.workflow.author_name}` : "Sesión de aprendizaje"}</small></div></div>
        <span className="tag purple">Paso {step + 1} de 4</span></div>
        <ol className="guided-progress">{Object.entries(phaseLabels).map(([key, label], index) => <li key={key} aria-current={index === step ? "step" : undefined} data-done={index < step}>{label}</li>)}</ol>
        <div className="guided-messages" role="log" aria-live="polite" ref={messages}>
          <Message coach text={`Hola, ${profile.firstName}. Primero define qué proceso quieres mejorar. Después clasificaremos un ticket de ese proceso y registraremos el resultado.`} />
          {step >= 1 && <><Message text={objective} /><Message coach text={origin
            ? `${origin.adaptation} Comparte un ticket de tu equipo para clasificarlo.`
            : "Vamos a clasificar solicitudes por tema antes de asignarlas. Comparte un ticket concreto de tu equipo. Para consultar una política interna, usa «Consultar una política»."} /></>}
          {trial && <><Message text={trial.sample} /><Message coach text={`El clasificador sugiere «${intentLabels[trial.intent.label]}» con ${Math.round(trial.intent.probabilities[trial.intent.label] * 100)} %. Lee el ticket y confirma o corrige el tema antes de tomar la decisión.`} /></>}
          {step >= 3 && <><Message text={`Confirmo la categoría ${intentLabels[decision]}.`} /><Message coach text={origin
            ? "Ahora registra qué pasó al aplicar la guía en tu equipo."
            : "Cuéntame qué funcionó con este ejemplo. Prepararé una guía para que el equipo administrador la revise y la comparta."} /></>}
        </div>
        {phase === "objective" && <form className="guided-form" onSubmit={(event) => { event.preventDefault(); if (objective.trim().length >= 8) setPhase("sample"); }}>
          <label>¿Qué quieres mejorar?<textarea minLength={8} maxLength={280} rows={2} required value={objective} onChange={(event) => setObjective(event.target.value)} /></label>
          <div className="guided-actions"><button type="button" className="button secondary" onClick={() => setObjective(defaults.objective)}>Usar objetivo sugerido</button>
            <button type="submit" className="button primary" disabled={objective.trim().length < 8}><Send size={16} /> Enviar objetivo</button></div>
        </form>}
        {phase === "sample" && <form className="guided-form" onSubmit={classify}>
          <label>Ticket de trabajo<textarea minLength={8} maxLength={500} rows={2} required value={sample} onChange={(event) => setSample(event.target.value)} /></label>
          <div className="guided-actions"><button type="button" className="button secondary" onClick={() => setSample(defaults.sample)}>Usar ticket de referencia</button>
            <button type="submit" className="button primary" disabled={pending || sample.trim().length < 8}><Send size={16} />{pending ? "Clasificando…" : "Pedir sugerencia"}</button></div>
        </form>}
        {phase === "review" && <form className="guided-form" onSubmit={(event) => { event.preventDefault(); setPhase("capture"); }}>
          <fieldset><legend>Categoría que confirmarías</legend><div className="guided-options">
            {Object.entries(intentLabels).map(([id, label]) => <label key={id}><input type="radio" name="confirmed-category" checked={decision === id} onChange={() => setDecision(id)} /> {label}</label>)}
          </div></fieldset>
          <div className="guided-actions"><button type="submit" className="button primary"><CheckCircle2 size={16} /> Confirmar categoría</button></div>
        </form>}
        {phase === "capture" && <form className="guided-form" onSubmit={save}>
          {!origin && <label>Título de la guía<input maxLength={110} required value={title} onChange={(event) => setTitle(event.target.value)} /></label>}
          <label>Resultado observado<textarea minLength={8} maxLength={500} rows={2} required value={outcome} onChange={(event) => setOutcome(event.target.value)} /></label>
          <div className="guided-actions"><button type="button" className="button secondary" onClick={useSuggestedResult}>Usar resultado sugerido</button>
            <button type="submit" className="button primary" disabled={pending || outcome.trim().length < 8 || (!origin && !title.trim())}>
              <BookOpen size={16} />{pending ? "Guardando…" : origin ? "Registrar que la apliqué" : "Enviar guía a revisión"}
            </button></div>
        </form>}
        {error && <ErrorBox message={error} />}
      </section>
      <aside className="panel inset-panel guided-context">
        <div className="section-title"><span className="icon-tile"><BookOpen size={19} /></span><h2>{origin ? "Guía de referencia" : "Referencia de industria"}</h2></div>
        {origin ? <><h3>{origin.workflow.title}</h3><p>Por {origin.workflow.author_name} · {origin.workflow.team}</p><ol>{origin.workflow.steps.map((item) => <li key={item}>{item}</li>)}</ol>
          <Link className="text-link" href={`/recipes/${origin.workflow.id}`}>Abrir guía original</Link></> :
          <><h3>{industryCase.title}</h3><p>{industryCase.description}</p><a className="text-link" href={industryCase.source} target="_blank" rel="noreferrer">Leer la fuente de Nubank</a></>}
      </aside>
    </div>}
  </>;
}
