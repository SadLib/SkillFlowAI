"use client";

import Link from "next/link";
import { useState } from "react";
import { BookOpen, CheckCircle2, LoaderCircle, UsersRound } from "lucide-react";
import { api, errorMessage, intentLabels, useResource } from "@/lib/api";
import type { Workflow } from "@/lib/workflows";
import { ErrorBox } from "@/components/ui";

export function WorkflowReview({ onPublished }: { onPublished: () => void }) {
  const workflows = useResource<Workflow[]>("/api/workflows");
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function publish(id: string) {
    if (pending) return;
    setPending(id);
    setError("");
    setNotice("");
    try {
      const saved = await api<Workflow>(`/api/workflows/${id}/publish`, {});
      setNotice(`«${saved.title}» ya está publicada en Smart Recipes.`);
      workflows.reload();
      onPublished();
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setPending("");
    }
  }

  return <section className="panel inset-panel spaced" id="aportaciones">
    <div className="section-title"><span className="icon-tile"><UsersRound size={20} /></span>
      <div><h2>Aportaciones del equipo</h2><p>Revisa las guías de las sesiones 1 a 1 y consulta quién las aplicó.</p></div></div>
    {error && <ErrorBox message={error} />}
    {notice && <p className="workflow-notice" role="status"><CheckCircle2 size={18} /> {notice}</p>}
    {workflows.error ? <ErrorBox message={workflows.error} retry={workflows.reload} /> :
      workflows.loading && !workflows.data ? <p className="muted" role="status">Cargando aportaciones…</p> :
      !workflows.data?.length ? <p className="muted">Las guías enviadas por los empleados aparecerán aquí.</p> :
      <div className="workflow-list">
        {workflows.data.map((workflow) => <article className="workflow-item" key={workflow.id}>
          <div className="workflow-item-head"><div><small>{workflow.author_name} · {workflow.team}</small><h3>{workflow.title}</h3></div>
            <span className={`tag ${workflow.status === "published" ? "green" : "orange"}`}>{workflow.status === "published" ? "Publicada" : "Pendiente de revisión"}</span></div>
          <p>{workflow.objective}</p>
          <details open={workflow.status === "pending"}><summary>Revisar pasos y resultado</summary>
            <ol>{workflow.steps.map((step) => <li key={step}>{step}</li>)}</ol>
            <p><strong>Ticket de práctica.</strong> {workflow.sample}</p>
            <p><strong>Categoría confirmada.</strong> {intentLabels[workflow.category]}</p>
            <p><strong>Resultado.</strong> {workflow.outcome}</p>
          </details>
          {workflow.status === "pending"
            ? <button className="button primary" type="button" disabled={Boolean(pending)} onClick={() => publish(workflow.id)}>
              {pending === workflow.id && <LoaderCircle className="spin" size={16} />} {pending === workflow.id ? "Publicando…" : "Publicar guía"}
            </button>
            : <>
              <Link className="text-link" href={`/recipes/${workflow.id}`}><BookOpen size={16} /> Abrir guía publicada</Link>
              <div className="workflow-uses">
                <strong>{workflow.applications.length ? "Aplicada por" : "Aún sin aplicaciones registradas"}</strong>
                {workflow.applications.map((entry) => <details key={entry.employee_name}>
                  <summary>{entry.employee_name} · {entry.team}</summary>
                  <p><strong>Ticket.</strong> {entry.sample}</p>
                  <p><strong>Categoría.</strong> {intentLabels[entry.category]}</p>
                  <p><strong>Resultado.</strong> {entry.outcome}</p>
                </details>)}
              </div>
            </>}
        </article>)}
      </div>}
  </section>;
}
