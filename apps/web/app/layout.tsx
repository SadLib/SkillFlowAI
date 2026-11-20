import type { Metadata } from "next";
import "@fontsource-variable/geist";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "SkillFlow AI · Capacitación inteligente", template: "%s · SkillFlow AI" },
  description: "Convierte los procedimientos de tu empresa en respuestas y capacitación que tu equipo puede aplicar.",
  icons: { icon: "/brand/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
