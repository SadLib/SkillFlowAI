"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { AssessmentResult } from "@/lib/api";

export type Role = "employee" | "valeria" | "diego" | "admin";
type Learning = { completed: string[]; assessment: AssessmentResult | null; activity: number };
type State = Record<Role, Learning> & { role: Role };
const storageKey = "skillflow-demo-v1";

export const profiles = {
  employee: { name: "María López", firstName: "María", initials: "ML", role: "Empleada", team: "Atención en tienda" },
  valeria: { name: "Valeria Cruz", firstName: "Valeria", initials: "VC", role: "Empleada", team: "Soporte" },
  diego: { name: "Diego Torres", firstName: "Diego", initials: "DT", role: "Empleado", team: "Logística" },
  admin: { name: "Carlos Ramírez", firstName: "Carlos", initials: "CR", role: "Administrador", team: "Capacitación y operaciones" },
};

const initial: State = {
  role: "employee",
  employee: { completed: ["acceso-portal", "buscar-guias"], assessment: null, activity: 0 },
  valeria: { completed: ["queja-servicio", "escalamiento"], assessment: null, activity: 0 },
  diego: { completed: ["rastreo", "entrega-incidencia"], assessment: null, activity: 0 },
  admin: { completed: ["acceso-portal"], assessment: null, activity: 0 },
};

type Context = {
  state: State;
  ready: boolean;
  learning: Learning;
  select: (role: Role) => void;
  complete: (id: string) => void;
  finishAssessment: (result: AssessmentResult) => void;
  logCoach: () => void;
};
const DemoContext = createContext<Context | null>(null);

export function DemoState({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initial);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<State>;
        const restored = { ...initial };
        for (const role of Object.keys(profiles) as Role[]) {
          const value = saved[role];
          if (value && Array.isArray(value.completed)) restored[role] = value;
        }
        if (saved.role && Object.hasOwn(profiles, saved.role)) restored.role = saved.role;
        setState(restored);
      }
    } catch {
      // A disabled or unavailable browser store still allows the current session.
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) {
      try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch { /* in-memory fallback */ }
    }
  }, [state, ready]);

  const updateLearning = (update: (learning: Learning) => Learning) => {
    const role = state.role;
    setState((current) => ({ ...current, [role]: update(current[role]) }));
  };

  return (
    <DemoContext.Provider value={{
      state, ready, learning: state[state.role],
      select: (role) => setState((current) => ({ ...current, role })),
      complete: (id) => updateLearning((learning) => learning.completed.includes(id) ? learning :
        { ...learning, completed: [...learning.completed, id] }),
      finishAssessment: (result) => updateLearning((learning) => ({ ...learning, assessment: result })),
      logCoach: () => updateLearning((learning) => ({ ...learning, activity: learning.activity + 1 })),
    }}>{children}</DemoContext.Provider>
  );
}

export function useDemo() {
  const value = useContext(DemoContext);
  if (!value) throw new Error("El estado de demostración necesita su proveedor.");
  return value;
}

export function progressFor(learning: Learning, ids: string[]) {
  const count = ids.filter((id) => learning.completed.includes(id)).length;
  const total = ids.length + 1;
  const progress = Math.round(100 * (count + Number(learning.assessment !== null)) / total);
  return { count, total, progress };
}
