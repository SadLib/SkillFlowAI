"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import { Activity, FileSearch, FlaskConical, LoaderCircle, MessageSquare, Network, ScanText } from "lucide-react";
import { ErrorBox, Loading, Meter, PageHeading } from "@/components/ui";
import { api, demoQuestion, errorMessage, intentLabels, modes, useResource, type CoachResult, type Metrics } from "@/lib/api";

const architecture = [
  { icon: ScanText, title: "Clasificación local", body: "El pipeline TF-IDF + Regresión Logística predice la intención." },
  { icon: FileSearch, title: "Recuperación", body: "TF-IDF y similitud coseno puntúan los procedimientos." },
  { icon: MessageSquare, title: "Respuesta local", body: "Plantillas y reglas responden solo con fragmentos documentales." },
  { icon: Network, title: "Recomendación", body: "Guía relevante en el chat y reglas en el diagnóstico." },
];
const abbreviations: Record<string, string> = { devoluciones: "Dev.", envios: "Env.", informacion_general: "Info.", reclamaciones: "Rec." };
const percentage = (value: number) => (100 * value).toLocaleString("es-MX", { maximumFractionDigits: 1 }) + "%";

export default function Lab() {
  const metrics = useResource<Metrics>("/api/model/metrics");
  const [query, setQuery] = useState(demoQuestion);
  const [result, setResult] = useState<CoachResult | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function analyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !query.trim()) return;
    setPending(true);
    setError("");
    setResult(null);
    try { setResult(await api<CoachResult>("/api/coach", { query: query.trim() })); }
    catch (error) { setError(errorMessage(error)); }
    finally { setPending(false); }
  }

  return <>
    <PageHeading title="Laboratorio IA" description="Inspecciona el modelo supervisado y la evidencia que usa el AI Coach." />
    <section className="panel inset-panel">
      <div className="section-title"><span className="icon-tile"><Network size={21} /></span><h2>Arquitectura del sistema</h2></div>
      <div className="architecture">{architecture.map(({ icon: Icon, title, body }) => <div key={title}><Icon size={21} /><h3>{title}</h3><p>{body}</p></div>)}</div>
    </section>
    <section className="spaced">
      <div className="section-row"><div><h2>Evaluación del clasificador</h2><p>Resultados del conjunto de prueba estratificado. Precisión, recall y F1 se promedian por clase.</p></div></div>
      {metrics.error ? <ErrorBox message={metrics.error} retry={metrics.reload} /> : !metrics.data ? <Loading /> : <ModelMetrics metrics={metrics.data} />}
    </section>
    <section className="panel inset-panel spaced">
      <div className="section-title"><span className="icon-tile"><FlaskConical size={20} /></span><div><h2>Clasificador interactivo</h2><p>Ejecuta el mismo flujo que utiliza el AI Coach.</p></div></div>
      <form className="lab-form" onSubmit={analyze}>
        <label className="sr-only" htmlFor="lab-query">Consulta para analizar</label>
        <input id="lab-query" value={query} onChange={(event) => setQuery(event.target.value)} maxLength={500} placeholder="Escribe una consulta…" />
        <button type="submit" className="button primary" disabled={pending || !query.trim()}>{pending ? <LoaderCircle size={17} className="spin" /> : <Activity size={17} />}{pending ? "Analizando…" : "Analizar consulta"}</button>
      </form>
      {error && <ErrorBox message={error} />}
      {result && <div className="lab-results" aria-live="polite">
        <div className="dashboard-bottom">
          <div><h3>Intención predicha</h3><span className="tag purple">{intentLabels[result.intent.label]}</span>
            <p className="muted">Modelo: {result.model}. Puntuaciones estimadas, no certezas.</p>
            <div className="measurements">{Object.entries(result.intent.probabilities).sort((a, b) => b[1] - a[1]).map(([label, value]) => <div key={label}><div><span>{intentLabels[label]}</span><b>{percentage(value)}</b></div><Meter label={intentLabels[label]} value={Math.round(100 * value)} /></div>)}</div>
          </div>
          <div><h3>Documentos recuperados</h3>{result.documents.length ? <div className="line-list lab-document-list">{result.documents.map((document) => <Link href={`/recipes/${document.id}`} key={document.id}><span><b>{document.title}</b><small>{document.category} · {document.source} · ID {document.id}</small><small>{document.content}</small></span><span className="tag neutral">{document.score.toFixed(3)}</span></Link>)}</div> :
            <p className="muted">Ningún documento alcanzó el umbral de similitud.</p>}</div>
        </div>
        <div className="lab-answer"><h3>Respuesta final</h3><span className="tag neutral">{modes[result.mode]}</span><p className="answer-content">{result.answer}</p></div>
      </div>}
    </section>
  </>;
}

function ModelMetrics({ metrics }: { metrics: Metrics }) {
  return <>
    <div className="admin-stats">
      {[["Accuracy", metrics.accuracy], ["Precision macro", metrics.precision], ["Recall macro", metrics.recall], ["F1-score", metrics.f1], ["Macro F1", metrics.macro_f1]].map(([title, value]) =>
        <div className="panel stat-card lab-stat" key={title}><strong>{percentage(Number(value))}</strong><span>{title}</span></div>)}
    </div>
    <div className="dashboard-bottom spaced">
      <div className="panel inset-panel"><h3>Modelo NLP</h3><p className="model-title">{metrics.model}</p><p className="muted">Aprendizaje supervisado · {metrics.samples} ejemplos en español · {metrics.train_size} de entrenamiento · {metrics.test_size} de prueba · Semilla {metrics.seed}</p>
        <div className="label-list">{metrics.labels.map((label) => <span className="tag neutral" key={label}>{intentLabels[label]}</span>)}</div>
        <p className="muted">Métricas calculadas sobre el conjunto de evaluación actual. El rendimiento en cada organización debe validarse con consultas y políticas representativas.</p>
        <h3>Baseline · {metrics.baseline.model}</h3>
        <div className="line-list">
          <div><span>Accuracy</span><b>{percentage(metrics.baseline.accuracy)}</b></div>
          <div><span>Precision macro</span><b>{percentage(metrics.baseline.precision)}</b></div>
          <div><span>Recall macro</span><b>{percentage(metrics.baseline.recall)}</b></div>
          <div><span>Macro F1</span><b>{percentage(metrics.baseline.macro_f1)}</b></div>
        </div>
      </div>
      <div className="panel inset-panel"><h3>Matriz de confusión</h3><p className="muted">Filas reales · Columnas predichas</p>
        <div className="table-scroll"><table className="matrix"><thead><tr><th scope="col">Clase</th>{metrics.labels.map((label) => <th scope="col" key={label} title={intentLabels[label]}>{abbreviations[label]}</th>)}</tr></thead>
          <tbody>{metrics.confusion_matrix.map((row, i) => <tr key={metrics.labels[i]}><th scope="row">{intentLabels[metrics.labels[i]]}</th>
            {row.map((count, j) => <td key={metrics.labels[j]}><span className={i === j ? "matrix-correct" : count ? "matrix-missed" : ""}>{count}</span></td>)}</tr>)}</tbody>
        </table></div>
        <h3>Reporte por categoría</h3>
        <div className="table-scroll"><table><thead><tr><th>Categoría</th><th>Precision</th><th>Recall</th><th>F1</th><th>Soporte</th></tr></thead>
          <tbody>{metrics.labels.map((label) => {
            const score = metrics.report[label];
            return typeof score === "number" ? null : <tr key={label}><th scope="row">{intentLabels[label]}</th>
              <td>{percentage(score.precision)}</td><td>{percentage(score.recall)}</td><td>{percentage(score["f1-score"])}</td><td>{score.support}</td></tr>;
          })}</tbody>
        </table></div>
      </div>
    </div>
  </>;
}
