"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import { BookOpen, ChevronDown, ClipboardCheck, FilePlus2, LoaderCircle, MessageSquare, UsersRound } from "lucide-react";
import { profiles, progressFor, useDemo } from "@/components/demo-state";
import { ErrorBox, Loading, Meter, PageHeading } from "@/components/ui";
import { WorkflowReview } from "@/components/workflow-review";
import { api, categories, errorMessage, useResource, type Category, type CreatedRecipe, type Recipe } from "@/lib/api";

export default function Admin() {
  const { ready, state } = useDemo();
  if (!ready) return <Loading />;
  if (state.role !== "admin") return <>
    <PageHeading title="Administración" description="Esta vista está disponible en el perfil de Carlos Ramírez." />
    <Link className="button primary" href="/demo">Cambiar de cuenta</Link>
  </>;
  return <AdminPanel />;
}

function AdminPanel() {
  const catalog = useResource<Recipe[]>("/api/recipes");
  const { state } = useDemo();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category>("Atención al cliente");
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [created, setCreated] = useState<CreatedRecipe | null>(null);
  const recipes = catalog.data ?? [];
  const team = (["employee", "valeria", "diego"] as const).map((id) => {
    const profile = profiles[id];
    const learning = state[id];
    return {
      name: profile.name, area: profile.team,
      progress: catalog.data ? progressFor(learning, recipes.map((recipe) => recipe.id)).progress : null,
      assessment: learning.assessment?.percent ?? null, activity: learning.activity,
    };
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setSaveError("");
    setCreated(null);
    setPending(true);
    try {
      const result = await api<CreatedRecipe>("/api/recipes", { title, category, text });
      setCreated(result);
      setTitle("");
      setText("");
      catalog.reload();
    } catch (error) { setSaveError(errorMessage(error)); }
    finally { setPending(false); }
  }

  return <>
    <PageHeading title="Administración" description="Revisa la capacitación, el uso del AI Coach y los procedimientos de NovaRetail.">
      <span className="tag purple">Administración de NovaRetail</span>
    </PageHeading>
    <WorkflowReview onPublished={catalog.reload} />
    <div className="admin-stats">
      {[
        { icon: UsersRound, title: "Empleados", value: team.length },
        { icon: ClipboardCheck, title: "Diagnósticos completados", value: team.filter((row) => row.assessment !== null).length },
        { icon: BookOpen, title: "Procedimientos disponibles", value: catalog.data ? recipes.length : "—" },
        { icon: MessageSquare, title: "Consultas al AI Coach", value: team.reduce((sum, row) => sum + row.activity, 0) },
      ].map(({ icon: Icon, title, value }) => <div className="panel stat-card" key={title}><Icon size={21} /><strong>{value}</strong><span>{title}</span></div>)}
    </div>
    <section className="panel inset-panel spaced">
      <div className="section-title"><span className="icon-tile"><UsersRound size={20} /></span><div><h2>Equipo de NovaRetail</h2><p>Consulta la actividad y los diagnósticos registrados para cada cuenta del equipo.</p></div></div>
      <div className="table-scroll"><table><thead><tr><th>Empleado</th><th>Área</th><th>Progreso</th><th>Diagnóstico</th><th>Consultas</th></tr></thead>
        <tbody>{team.map((row) => <tr key={row.name}><th scope="row">{row.name}</th><td>{row.area}</td>
          <td>{row.progress === null ? "—" : <div className="row-progress"><Meter value={row.progress} label={`Progreso de ${row.name}`} />{row.progress}%</div>}</td>
          <td>{row.assessment === null ? "Pendiente" : `${row.assessment}%`}</td><td>{row.activity}</td></tr>)}</tbody>
      </table></div>
    </section>
    <div className="dashboard-bottom spaced">
      <section className="panel inset-panel"><div className="section-title"><span className="icon-tile"><FilePlus2 size={20} /></span><h2>Crear procedimiento</h2></div>
        <p className="muted">El procedimiento se agrega a la biblioteca y se incorpora a la búsqueda documental hasta el próximo reinicio de la API.</p>
        <form className="admin-form" onSubmit={submit}>
          <label>Título<input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} /></label>
          <label>Categoría<span className="select-wrap"><select value={category} onChange={(e) => setCategory(e.target.value as Category)}>{categories.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={17} /></span></label>
          <label>Texto del procedimiento<textarea value={text} onChange={(e) => setText(e.target.value)} required minLength={15} maxLength={3000} rows={5} placeholder="Describe el procedimiento o pega sus pasos…" /></label>
          {saveError && <ErrorBox message={saveError} />}
          {created && <div className="success-box" role="status"><strong>Procedimiento creado</strong><span>Estructurado localmente mediante reglas; no se usó una API externa.</span><Link className="text-link" href={`/recipes/${created.recipe.id}`}>Abrir procedimiento</Link></div>}
          <button type="submit" className="button primary" disabled={pending || !title.trim() || text.trim().length < 15}>{pending && <LoaderCircle className="spin" size={17} />} {pending ? "Estructurando…" : "Crear procedimiento"}</button>
        </form>
      </section>
      <section className="panel inset-panel"><div className="section-title"><span className="icon-tile green"><BookOpen size={20} /></span><h2>Procedimientos disponibles</h2></div>
        {catalog.error ? <ErrorBox message={catalog.error} retry={catalog.reload} /> : !catalog.data ? <Loading /> :
          <div className="line-list">{[...recipes].reverse().map((recipe) => <Link href={`/recipes/${recipe.id}`} key={recipe.id}><span>{recipe.title}</span><small>{recipe.category}</small></Link>)}</div>}
      </section>
    </div>
  </>;
}
