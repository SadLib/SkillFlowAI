import { useCallback, useEffect, useState } from "react";

export const categories = ["Atención al cliente", "Devoluciones", "Envíos", "Herramientas digitales"] as const;
export type Category = typeof categories[number];

export interface Recipe {
  id: string;
  title: string;
  description: string;
  category: Category;
  difficulty: "Básico" | "Intermedio" | "Avanzado";
  minutes: number;
  objective: string;
  source: string;
  excerpt: string;
  steps: string[];
  examples: string[];
}
export type RecipeLink = Pick<Recipe, "id" | "title">;

export interface Evidence extends RecipeLink {
  category: Category;
  content: string;
  source: string;
  score: number;
  excerpt: string;
}
export interface Intent {
  label: string;
  probabilities: Record<string, number>;
}
export interface CoachResult {
  query: string;
  intent: Intent;
  documents: Evidence[];
  answer: string;
  sources: string[];
  model: string;
  mode: "local_template" | "insufficient_context";
  recommended_recipe: RecipeLink | null;
}
export interface Question {
  id: string;
  category: Category;
  prompt: string;
  options: string[];
}
export interface AssessmentResult {
  correct: number;
  total: number;
  percent: number;
  categories: { category: Category; correct: number; total: number; percent: number }[];
  weaknesses: Category[];
  recommendations: RecipeLink[];
  recommendation_engine: "rules";
}
export interface Metrics {
  model: string;
  learning_type: "supervised";
  labels: string[];
  samples: number;
  train_size: number;
  test_size: number;
  seed: number;
  sklearn_version: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  macro_f1: number;
  confusion_matrix: number[][];
  report: Record<string, {
    precision: number;
    recall: number;
    "f1-score": number;
    support: number;
  } | number>;
  baseline: {
    model: string;
    accuracy: number;
    precision: number;
    recall: number;
    f1: number;
    macro_f1: number;
  };
}
export interface CreatedRecipe {
  recipe: Recipe;
  mode: "deterministic";
}
export const intentLabels: Record<string, string> = {
  devoluciones: "Devoluciones",
  envios: "Envíos",
  informacion_general: "Información general",
  reclamaciones: "Reclamaciones",
};
export const modes = {
  local_template: "Motor local: plantillas y reglas (sin API externa)",
  insufficient_context: "Contexto insuficiente",
};
export const demoQuestion = "Un cliente quiere devolver un producto después de 20 días, ¿qué hago?";
export const suggestedQuestions = [
  { title: "Devolución a los 20 días", query: demoQuestion },
  { title: "Rastrear un pedido", query: "¿Cómo consulto el rastreo de un pedido con el número de guía?" },
  { title: "Registrar una queja", query: "Quiero registrar una queja de servicio por mala atención" },
];

const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/+$/, "");

export async function api<T>(path: string, body?: object, signal?: AbortSignal): Promise<T> {
  const timeout = AbortSignal.timeout(20_000);
  let response: Response;
  try {
    response = await fetch(`${apiBase}${path}`, {
      signal: signal ? AbortSignal.any([timeout, signal]) : timeout,
      ...(body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    if (timeout.aborted) throw new Error("La API tardó demasiado. Intenta de nuevo.");
    throw new Error("No se pudo conectar con la API de SkillFlow. Intenta de nuevo.");
  }
  if (!response.ok) {
    const data: { detail?: unknown } = await response.json().catch(() => ({}));
    throw new Error(typeof data.detail === "string" ? data.detail :
      response.status === 422 ? "Revisa los datos y vuelve a intentarlo." : "El servicio no pudo completar la solicitud.");
  }
  return response.json() as Promise<T>;
}

export function useResource<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    api<T>(path, undefined, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setData(result); })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setError(errorMessage(error));
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [path, revision]);
  return { data, error, loading, reload };
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Ocurrió un error inesperado.";
}
