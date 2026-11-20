"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import { BookOpen, ClipboardCheck, LoaderCircle, RotateCcw, Target } from "lucide-react";
import { useDemo } from "@/components/demo-state";
import { CategoryTag, ErrorBox, Loading, Meter, PageHeading } from "@/components/ui";
import { api, errorMessage, useResource, type AssessmentResult, type Question } from "@/lib/api";

function Results({ result, restart }: { result: AssessmentResult; restart: () => void }) {
  return <div className="assessment-results">
    <section className="panel inset-panel score-panel">
      <div className="score-badge"><strong>{result.percent}%</strong><small>Resultado</small></div>
      <div><h2>Diagnóstico completado</h2><p>{result.correct} de {result.total} respuestas correctas.</p><p>{result.weaknesses.length ? `Áreas a reforzar: ${result.weaknesses.join(", ")}.` : "Todas las categorías alcanzaron el umbral del 70 %."}</p></div>
      <button type="button" className="button secondary" onClick={restart}><RotateCcw size={16} /> Repetir diagnóstico</button>
    </section>
    <div className="dashboard-bottom">
      <section className="panel inset-panel"><div className="section-title"><span className="icon-tile"><Target size={20} /></span><h2>Puntuación por categoría</h2></div>
        <div className="measurements">{result.categories.map((item) => <div key={item.category}><div><span>{item.category}</span><b>{item.correct}/{item.total} · {item.percent}%</b></div><Meter value={item.percent} label={item.category} /></div>)}</div>
      </section>
      <section className="panel inset-panel"><div className="section-title"><span className="icon-tile green"><BookOpen size={20} /></span><h2>Smart Recipes recomendadas</h2></div>
        <p className="muted">Motor de reglas. Vincula los errores de categorías por debajo del 70 % con las guías correspondientes. El clasificador supervisado se usa para interpretar consultas.</p>
        {result.recommendations.length ? <div className="line-list">{result.recommendations.map((recipe) => <Link key={recipe.id} href={`/recipes/${recipe.id}`}>{recipe.title}</Link>)}</div> :
          <p className="muted">No hay recomendaciones de refuerzo para este resultado.</p>}
      </section>
    </div>
    <Link href="/dashboard" className="button primary">Ver mi progreso</Link>
  </div>;
}

export default function Assessment() {
  const { learning, finishAssessment, ready } = useDemo();
  const { data: questions, loading, error, reload } = useResource<Question[]>("/api/assessment");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const answered = questions?.filter((question) => answers[question.id] !== undefined).length ?? 0;
  const result = editing ? null : learning.assessment;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!questions || answered !== questions.length || pending) return;
    setPending(true);
    setSubmitError("");
    try {
      finishAssessment(await api<AssessmentResult>("/api/assessment", { answers }));
      setEditing(false);
      window.scrollTo({ top: 0, behavior: "instant" });
    } catch (error) { setSubmitError(errorMessage(error)); }
    finally { setPending(false); }
  }

  return <>
    <PageHeading title="Diagnóstico" description="Pon a prueba tus conocimientos de NovaRetail y encuentra qué procedimientos practicar." />
    {!ready ? <Loading /> : result ? <Results result={result} restart={() => { setEditing(true); setAnswers({}); setSubmitError(""); }} /> :
      error ? <ErrorBox message={error} retry={reload} /> : loading || !questions ? <Loading text="Cargando preguntas…" /> :
        <form className="assessment-form" onSubmit={submit}>
          <div className="panel assessment-progress">
            <div className="section-title"><span className="icon-tile"><ClipboardCheck size={20} /></span><div><h2>Diagnóstico operativo</h2><p>Selecciona una respuesta por pregunta.</p></div></div>
            <div><span>{answered} de {questions.length} respondidas</span><Meter value={Math.round(100 * answered / questions.length)} label="Preguntas respondidas" /></div>
          </div>
          {questions.map((question, index) => <fieldset className="panel question-card" key={question.id} disabled={pending}>
            <legend className="sr-only">Pregunta {index + 1}. {question.prompt}</legend>
            <div className="question-heading"><span className="step-number">{index + 1}</span><h2>{question.prompt}</h2><CategoryTag category={question.category} /></div>
            <div className="question-options">{question.options.map((option, i) => <label key={option} className={answers[question.id] === i ? "selected" : ""}>
              <input type="radio" name={question.id} value={i} checked={answers[question.id] === i}
                onChange={() => setAnswers((current) => ({ ...current, [question.id]: i }))} />{option}
            </label>)}</div>
          </fieldset>)}
          {submitError && <ErrorBox message={submitError} />}
          <button className="button primary" type="submit" disabled={pending || answered !== questions.length}>{pending && <LoaderCircle className="spin" size={17} />} {pending ? "Calculando…" : "Ver resultados"}</button>
        </form>}
  </>;
}
