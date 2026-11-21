import type { Intent } from "@/lib/api";

export type GuidedEmployee = "employee" | "valeria" | "diego";

export interface Workflow {
  id: string;
  author: GuidedEmployee;
  author_name: string;
  team: string;
  title: string;
  objective: string;
  sample: string;
  category: string;
  outcome: string;
  status: "pending" | "published";
  steps: string[];
  applications: { employee_name: string; team: string; sample: string; category: string; outcome: string }[];
}

export interface WorkflowRecommendation {
  workflow: Workflow;
  adaptation: string;
}

export interface GuidedTrial {
  sample: string;
  intent: Intent;
}

export const industryCase = {
  title: "Nubank · Clasificar solicitudes de soporte",
  description: "Su equipo de ingeniería explica cómo usa modelos para identificar el tema de una solicitud y apoyar su asignación.",
  source: "https://building.nu.com/global-expansion-of-machine-learning-models/",
};

export const humanReviewCase = {
  title: "Nubank · Revisión humana de sugerencias",
  description: "En su proyecto Agent Copilot, los agentes pueden aceptar o editar las sugerencias antes de usarlas.",
  source: "https://building.nu.com/empowering-customer-support-agents-with-generative-ai/",
};

export const practice = {
  employee: {
    title: "Clasificar solicitudes de mostrador con IA",
    objective: "Organizar las solicitudes de mostrador por tema para consultar la guía adecuada.",
    sample: "Un cliente compró una chamarra hace 20 días y quiere devolverla para recibir un reembolso.",
  },
  valeria: {
    title: "Clasificar tickets de soporte con IA",
    objective: "Organizar la bandeja de soporte por tema antes de asignar cada ticket.",
    sample: "Un cliente se queja de la atención que recibió en tienda y solicita que un supervisor revise su caso.",
  },
  diego: {
    title: "Clasificar incidencias de envío con IA",
    objective: "Separar las incidencias de entrega del resto de las solicitudes para derivarlas a Logística.",
    sample: "La guía marca el paquete como entregado, pero la clienta no lo recibió y pide que revisemos el envío.",
  },
};
