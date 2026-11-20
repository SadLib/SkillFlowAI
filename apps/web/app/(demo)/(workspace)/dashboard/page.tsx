"use client";

import Link from "next/link";
import { BookOpen, CheckCircle2, ClipboardCheck, GraduationCap, LibraryBig, MessageSquare, Sparkles, Target } from "lucide-react";
import { profiles, progressFor, useDemo } from "@/components/demo-state";
import { Empty, ErrorBox, Loading, Meter, PageHeading, RecipeCard } from "@/components/ui";
import { useResource, type Category, type Recipe } from "@/lib/api";

const courses: Record<Category, string> = {
  "Atención al cliente": "Atención y escalamiento",
  "Devoluciones": "Operación de devoluciones",
  "Envíos": "Seguimiento de pedidos",
  "Herramientas digitales": "Uso del portal interno",
};

export default function Dashboard() {
  const { state, learning } = useDemo();
  const profile = profiles[state.role];
  const catalog = useResource<Recipe[]>("/api/recipes");
  const recipes = catalog.data ?? [];
  const progress = progressFor(learning, recipes.map((recipe) => recipe.id));
  const assessment = learning.assessment;
  const suggested = assessment?.recommendations ?? (
    state.role === "admin" ? ["queja-servicio", "escalamiento", "entrega-incidencia"] :
      ["devolucion-plazo", "rastreo", "queja-servicio"]
  ).flatMap((id) => recipes.filter((recipe) => recipe.id === id));
  const recommendations = suggested.flatMap(({ id }) =>
    recipes.filter((recipe) => recipe.id === id && !learning.completed.includes(id))).slice(0, 3);
  const courseCategories: Category[] = assessment?.weaknesses ??
    (state.role === "admin" ? ["Atención al cliente", "Envíos"] : ["Devoluciones", "Envíos"]);
  const latest = recipes.slice(-3).reverse();

  return <>
    <PageHeading title={`Hola, ${profile.firstName}`} description={`Tu espacio de capacitación en NovaRetail · ${profile.team}`} />
    <div className="dashboard-hero-grid">
      <section className="coach-banner">
        <div className="coach-banner-decoration" aria-hidden="true" />
        <span className="eyebrow"><Sparkles size={15} /> AI Coach</span>
        <h2>Resuelve tu próxima duda</h2>
        <p>Pregunta sobre devoluciones, envíos y procesos de NovaRetail. Cada respuesta documentada incluye su fuente.</p>
        <div className="guided-actions">
          <Link href={state.role === "valeria" || state.role === "diego" ? "/coach/sesion" : "/coach"} className="button primary">
            <MessageSquare size={17} /> {state.role === "valeria" || state.role === "diego" ? "Iniciar sesión 1 a 1" : "Abrir AI Coach"}
          </Link>
        </div>
      </section>
      <section className="panel progress-card">
        <div className="section-title"><span className="icon-tile"><Target size={20} /></span><h2>Tu progreso</h2></div>
        {catalog.loading && !catalog.data ? <p role="status">Cargando tu itinerario…</p> : catalog.error && !catalog.data ?
          <p>El itinerario no está disponible.</p> : <>
            <strong className="progress-value">{progress.progress}%</strong>
            <Meter value={progress.progress} label="Progreso de capacitación" />
            <p>{progress.count} de {recipes.length} recetas completadas · {assessment ? "Diagnóstico completado" : "Diagnóstico pendiente"}</p>
          </>}
        <Link className="text-link" href="/assessment">{assessment ? "Ir al diagnóstico" : "Iniciar diagnóstico"}</Link>
      </section>
    </div>
    <section className="spaced">
      <div className="section-row"><div><h2>Cursos y prácticas recomendadas</h2><p>{assessment ? "Seleccionados a partir de tu último diagnóstico." : "Capacitación para los procesos de tu puesto."}</p></div>
        <Link className="text-link" href="/recipes"><BookOpen size={16} /> Ver biblioteca</Link></div>
      {catalog.data && courseCategories.length > 0 && <div className="course-list" aria-label="Cursos recomendados">
        {courseCategories.map((category) => <Link key={category} className="panel course-link" href={`/recipes?category=${encodeURIComponent(category)}`}>
          <GraduationCap size={19} /><span><strong>{courses[category]}</strong><small>{recipes.filter((recipe) => recipe.category === category).length} procedimientos del curso</small></span>
        </Link>)}
      </div>}
      {catalog.error ? <ErrorBox message={catalog.error} retry={catalog.reload} /> : catalog.loading && !catalog.data ? <Loading /> :
        recommendations.length ? <div className="recipe-grid">{recommendations.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} />)}</div> :
          <Empty title="Estás al día">Puedes seguir explorando procedimientos en la biblioteca.</Empty>}
    </section>
    <div className="dashboard-bottom spaced">
      <section className="panel inset-panel">
        <div className="section-title"><span className="icon-tile"><LibraryBig size={19} /></span><h2>Últimas Smart Recipes</h2></div>
        {latest.length ? <div className="line-list">{latest.map((recipe) => <Link href={`/recipes/${recipe.id}`} key={recipe.id}><span>{recipe.title}</span><small>{recipe.minutes} min</small></Link>)}</div> :
          <p className="muted">Las recetas aparecerán cuando cargue el catálogo.</p>}
      </section>
      <section className="panel inset-panel">
        <div className="section-title"><span className="icon-tile green"><ClipboardCheck size={19} /></span><h2>Evaluaciones recientes</h2></div>
        {assessment ? <div className="result-line"><CheckCircle2 size={19} /><div><strong>Diagnóstico NovaRetail</strong><small>{assessment.correct} de {assessment.total} respuestas correctas</small></div><b>{assessment.percent}%</b></div> :
          <div className="result-line"><CheckCircle2 size={19} /><div><strong>{state.role === "admin" ? "Operación de tienda" : "Práctica de inducción"}</strong><small>Evaluación inicial · Punto de partida</small></div><b>{state.role === "admin" ? "80%" : "75%"}</b></div>}
        <Link className="text-link" href="/assessment">Ver diagnóstico</Link>
      </section>
    </div>
  </>;
}
