"use client";

import Link from "next/link";
import { BookOpen, CheckCircle2, Clock3, FileText, ListChecks } from "lucide-react";
import { useDemo } from "@/components/demo-state";
import { CategoryTag, ErrorBox, Loading } from "@/components/ui";
import { useResource, type Recipe } from "@/lib/api";

export function RecipeDetail({ id }: { id: string }) {
  const { data: recipe, loading, error, reload } = useResource<Recipe>(`/api/recipes/${encodeURIComponent(id)}`);
  const { complete, learning, ready } = useDemo();
  const completed = learning.completed.includes(id);

  return <>
    <Link className="text-link breadcrumb" href="/recipes"><BookOpen size={17} /> Volver a Smart Recipes</Link>
    {error ? <ErrorBox message={error} retry={reload} /> : loading || !recipe ? <Loading /> :
      <div className="detail-layout">
        <article className="panel detail-main">
          <div className="detail-tags"><CategoryTag category={recipe.category} /><span className="tag neutral">{recipe.difficulty}</span><span className="inline-meta"><Clock3 size={16} /> {recipe.minutes} min</span></div>
          <h1>{recipe.title}</h1><p className="detail-intro">{recipe.description}</p>
          <section><h2>Objetivo</h2><p>{recipe.objective}</p></section>
          <section><h2><ListChecks size={21} /> Instrucciones</h2><ol className="detail-steps">{recipe.steps.map((step, index) => <li key={index}><span aria-hidden="true">{index + 1}</span><p>{step}</p></li>)}</ol></section>
          <section><h2>Ejemplos</h2>{recipe.examples.length ? <ul className="examples">{recipe.examples.map((example, index) => <li key={index}>{example}</li>)}</ul> : <p>El texto de origen no incluye ejemplos.</p>}</section>
        </article>
        <aside className="detail-aside">
          <div className="panel inset-panel"><div className="section-title"><span className="icon-tile"><FileText size={19} /></span><h2>Fuente documental</h2></div><p><strong>{recipe.source}</strong></p><blockquote>{recipe.excerpt}</blockquote></div>
          <div className="panel inset-panel detail-completion"><h2>Tu progreso</h2><p>{completed ? "Este procedimiento ya cuenta para tu capacitación." : "Marca el procedimiento al terminar de revisarlo."}</p>
            <button className={`button ${completed ? "secondary" : "primary"}`} type="button" onClick={() => complete(id)} disabled={!ready || completed}><CheckCircle2 size={18} /> {completed ? "Completado" : "Marcar como completado"}</button>
            <span className="sr-only" role="status">{completed ? "Procedimiento completado." : ""}</span>
          </div>
        </aside>
      </div>}
  </>;
}
