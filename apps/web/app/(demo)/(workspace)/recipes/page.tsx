"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown, Search } from "lucide-react";
import { useDemo } from "@/components/demo-state";
import { Empty, ErrorBox, Loading, PageHeading, RecipeCard } from "@/components/ui";
import { categories, useResource, type Category, type Recipe } from "@/lib/api";

function normalize(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

export default function Recipes() {
  return <Suspense fallback={<Loading text="Cargando procedimientos…" />}><FilteredRecipes /></Suspense>;
}

function FilteredRecipes() {
  const searchCategory = useSearchParams().get("category");
  const initial = categories.find((category) => category === searchCategory) ?? "";
  return <RecipeLibrary key={initial} initialCategory={initial} />;
}

function RecipeLibrary({ initialCategory }: { initialCategory: Category | "" }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"" | Category>(initialCategory);
  const { learning } = useDemo();
  const { data, loading, error, reload } = useResource<Recipe[]>("/api/recipes");
  const searchTerms = normalize(query.trim()).split(/\s+/).filter(Boolean);
  const results = (data ?? []).filter((recipe) => {
    const index = normalize([recipe.title, recipe.description, recipe.category, recipe.source, recipe.excerpt].join(" "));
    return (!category || category === recipe.category) && searchTerms.every((term) => index.includes(term));
  });
  return <>
    <PageHeading title="Smart Recipes" description="Guías de NovaRetail con pasos claros, ejemplos y referencias para el trabajo diario." />
    <div className="filter-bar">
      <label className="search-label"><Search size={20} /><input type="search" aria-label="Buscar procedimientos" placeholder="Buscar procedimientos…" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
      <label className="select-wrap"><span className="sr-only">Categoría</span><select value={category} onChange={(e) => setCategory(e.target.value as "" | Category)}><option value="">Todas las categorías</option>{categories.map((category) => <option key={category}>{category}</option>)}</select><ChevronDown size={17} /></label>
    </div>
    {error ? <ErrorBox message={error} retry={reload} /> : loading ? <Loading text="Cargando procedimientos…" /> : <>
      <p className="result-count" role="status">{results.length} {results.length === 1 ? "procedimiento" : "procedimientos"}</p>
      {results.length ? <div className="recipe-grid">{results.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} completed={learning.completed.includes(recipe.id)} />)}</div> :
        <Empty title="Sin resultados">Prueba otra palabra clave o selecciona otra categoría.</Empty>}
    </>}
  </>;
}
