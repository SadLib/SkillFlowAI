"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, FlaskConical, GraduationCap, Headphones, PackageCheck, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/brand";
import { profiles, useDemo } from "@/components/demo-state";

const roles = [
  { id: "valeria", icon: Headphones, description: "Trabaja con el coach 1 a 1 para mejorar un proceso y compartirlo con el equipo.", next: "/coach/sesion" },
  { id: "admin", icon: ShieldCheck, description: "Revisa y publica las guías que aporta el equipo.", next: "/admin" },
  { id: "diego", icon: PackageCheck, description: "Adapta a Logística una guía que compartió una compañera.", next: "/coach/sesion" },
  { id: "employee", icon: GraduationCap, description: "Consulta políticas internas y completa tu diagnóstico.", next: "/dashboard" },
] as const;

export default function DemoPage() {
  const { select } = useDemo();
  const router = useRouter();

  return <div className="selection">
    <header className="marketing-width topbar"><Brand /><Link className="button secondary" href="/">Volver al inicio</Link></header>
    <main className="selection-main">
      <div className="eyebrow"><FlaskConical size={15} /> Acceso a cuentas</div>
      <h1>Selecciona una cuenta</h1>
      <p className="selection-intro">Elige el área con la que quieres ingresar. Puedes cambiar de cuenta desde el menú de usuario.</p>
      <div className="profile-options">
        {roles.map(({ id, icon: Icon, description, next }) => {
          const profile = profiles[id];
          return <article className="panel option-card" key={id}>
            <span className="icon-tile"><Icon size={25} /></span>
            <span className="option-role">{id === "admin" ? profile.role : profile.team}</span>
            <h2>{profile.name}</h2>
            <p>{description}</p>
            <button className={`button ${id === "valeria" ? "primary" : "secondary"}`} onClick={() => {
              select(id);
              router.push(next);
            }}>Entrar a la cuenta de {profile.firstName}</button>
          </article>;
        })}
      </div>
      <div className="selection-note"><Building2 size={16} /> NovaRetail · Atención, soporte, logística y administración.</div>
    </main>
  </div>;
}
