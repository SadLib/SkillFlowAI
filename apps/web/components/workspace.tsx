"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BookOpen, ClipboardCheck, FlaskConical, LayoutDashboard, Menu, ShieldCheck, Sparkles, UsersRound, X } from "lucide-react";
import { Brand } from "@/components/brand";
import { profiles, useDemo } from "@/components/demo-state";

const mainLinks = [
  { href: "/dashboard", title: "Resumen", icon: LayoutDashboard },
  { href: "/coach", title: "AI Coach", icon: Sparkles },
  { href: "/recipes", title: "Smart Recipes", icon: BookOpen },
  { href: "/assessment", title: "Diagnóstico", icon: ClipboardCheck },
];
const labLink = { href: "/lab", title: "Laboratorio IA", icon: FlaskConical };
const adminLink = { href: "/admin", title: "Administración", icon: ShieldCheck };

export function Workspace({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [menu, setMenu] = useState(false);
  const { state } = useDemo();
  const profile = profiles[state.role];
  const links = state.role === "admin" ? [...mainLinks, adminLink, labLink] : [...mainLinks, labLink];
  const active = (href: string) => path === href || path.startsWith(href + "/");
  const section = links.find(({ href }) => active(href))?.title ?? "Espacio de trabajo";
  return <div className="workspace">
    <a href="#workspace-main" className="skip-link">Saltar al contenido</a>
    {menu && <button className="mobile-overlay" aria-label="Cerrar navegación" onClick={() => setMenu(false)} />}
    <aside className={`sidebar ${menu ? "sidebar-open" : ""}`}>
      <div className="sidebar-brand"><Brand /><button className="icon-button sidebar-close" aria-label="Cerrar menú" onClick={() => setMenu(false)}><X size={21} /></button></div>
      <div className="company">
        <div className="nova-mark" aria-hidden="true">N</div>
        <div><strong>NovaRetail</strong><small>Espacio de trabajo</small></div>
      </div>
      <nav className="side-nav" aria-label="Espacio de trabajo">
        <div className="nav-label">Capacitación</div>
        {links.map(({ href, title, icon: Icon }) => <Link key={href} href={href}
          className={`nav-link ${active(href) ? "active" : ""}`}
          aria-current={active(href) ? "page" : undefined} onClick={() => setMenu(false)}>
          <Icon size={19} />{title}
        </Link>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="profile-info"><span className="avatar">{profile.initials}</span><div><strong>{profile.name}</strong><small>{profile.role}</small></div></div>
        <Link className="nav-link profile-switch" href="/demo" onClick={() => setMenu(false)}><UsersRound size={17} /> Cambiar de cuenta</Link>
      </div>
    </aside>
    <div className="workspace-main">
      <header className="workspace-top">
        <div><button className="icon-button mobile-toggle" aria-label="Abrir menú" aria-expanded={menu} onClick={() => setMenu(true)}><Menu size={23} /></button>
          <span>{section}</span></div>
        <Link href="/demo" className="demo-chip"><FlaskConical size={15} /> <span>Espacio de trabajo</span></Link>
      </header>
      <main id="workspace-main" className="workspace-content">{children}</main>
    </div>
  </div>;
}
