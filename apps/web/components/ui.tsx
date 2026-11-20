import Link from "next/link";
import { AlertCircle, BookOpen, Clock3, Headphones, LoaderCircle, Monitor, PackageCheck, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import type { Category, Recipe } from "@/lib/api";

export const categoryStyle = {
  "Atención al cliente": { icon: Headphones, color: "purple" },
  "Devoluciones": { icon: RotateCcw, color: "blue" },
  "Envíos": { icon: PackageCheck, color: "green" },
  "Herramientas digitales": { icon: Monitor, color: "orange" },
};

export function CategoryIcon({ category }: { category: Category }) {
  const { icon: Icon, color } = categoryStyle[category];
  return <span className={`icon-tile ${color}`}><Icon size={20} /></span>;
}

export function CategoryTag({ category }: { category: Category }) {
  return <span className={`tag ${categoryStyle[category].color}`}>{category}</span>;
}

export function PageHeading({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return <div className="page-heading"><div><h1>{title}</h1><p>{description}</p></div>{children}</div>;
}

export function Loading({ text = "Cargando información…" }: { text?: string }) {
  return <div className="panel state-panel" role="status"><LoaderCircle size={20} className="spin" /> {text}</div>;
}

export function ErrorBox({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="error-box" role="alert"><AlertCircle size={19} /><span>{message}</span>
    {retry && <button type="button" className="button secondary small" onClick={retry}>Reintentar</button>}</div>;
}

export function Empty({ title, children }: { title: string; children: ReactNode }) {
  return <div className="panel empty"><BookOpen size={27} /><h3>{title}</h3><p>{children}</p></div>;
}

export function Meter({ value, label }: { value: number; label: string }) {
  return <div className="meter" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} aria-label={label}>
    <span style={{ width: `${value}%` }} />
  </div>;
}

export function RecipeCard({ recipe, completed = false }: { recipe: Recipe; completed?: boolean }) {
  return <Link className="panel recipe-card" href={`/recipes/${recipe.id}`}>
    <div className="recipe-card-top"><CategoryIcon category={recipe.category} /><CategoryTag category={recipe.category} /></div>
    <div><h3>{recipe.title}</h3><p>{recipe.description}</p></div>
    <div className="recipe-meta"><span><Clock3 size={15} /> {recipe.minutes} min</span><span>{recipe.difficulty}</span>{completed && <span className="completed-text">Completada</span>}</div>
  </Link>;
}
