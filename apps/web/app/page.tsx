import Link from "next/link";
import { BookOpen, CheckCircle2, ClipboardCheck, FileText, Layers3, MessageSquare, Search, Send, Sparkles, Workflow } from "lucide-react";
import { Brand } from "@/components/brand";

const benefits = [
  { icon: MessageSquare, title: "Respuestas con respaldo", description: "Resuelve dudas de trabajo al instante y consulta el procedimiento que sustenta cada respuesta." },
  { icon: Layers3, title: "Procedimientos que se aplican", description: "Consulta guías breves con pasos, ejemplos y su fuente original, justo cuando las necesitas." },
  { icon: ClipboardCheck, title: "Capacitación enfocada", description: "Detecta brechas con un diagnóstico y practica con las guías correspondientes a cada competencia." },
];
const steps = [
  { title: "Reúne tus procedimientos", body: "Organiza el conocimiento operativo en Smart Recipes breves y consultables." },
  { title: "Pregunta en el momento", body: "El AI Coach identifica la intención y localiza el documento relevante antes de responder." },
  { title: "Refuerza lo aprendido", body: "El diagnóstico sugiere prácticas específicas a partir de los errores de cada empleado." },
];

function CoachPreview() {
  return <div className="preview-frame" aria-label="Vista previa ilustrativa del AI Coach">
    <div className="preview-app">
      <div className="preview-top">
        <div className="preview-spark"><Sparkles size={19} /></div>
        <div><strong>AI Coach</strong><small>Base de conocimiento · NovaRetail</small></div>
        <span className="preview-live"><i /> Con respaldo</span>
      </div>
      <div className="preview-content">
        <div className="preview-user">Un cliente quiere devolver un producto después de 20 días, ¿qué hago?</div>
        <div className="preview-response">
          <span className="mini-spark"><Sparkles size={15} /></span>
          <div><strong>SkillFlow AI</strong>
            <p>La devolución está fuera del plazo estándar de <b>14 días</b>. Explica la política al cliente y registra la decisión.</p>
            <span className="preview-source"><FileText size={13} /> NR-DEV-01 · Política de devoluciones</span>
          </div>
        </div>
      </div>
      <div className="preview-input">Pregunta sobre un procedimiento… <span><Send size={15} /></span></div>
    </div>
  </div>;
}

export default function Landing() {
  return <div className="landing">
    <header className="marketing-header">
      <div className="marketing-width topbar">
        <Brand />
        <nav aria-label="Navegación principal"><a href="#funciones">Funciones</a><a href="#como-funciona">Cómo funciona</a></nav>
        <Link href="/demo" className="button primary top-cta">Entrar</Link>
      </div>
    </header>
    <main id="contenido">
      <section className="landing-hero">
        <div className="marketing-width hero-layout">
          <div className="hero-copy">
            <div className="eyebrow"><Sparkles size={15} /> Capacitación empresarial con IA</div>
            <h1>El conocimiento de tu empresa, <em>convertido en inteligencia</em></h1>
            <p>Practica con un coach 1 a 1, comparte lo que funciona y convierte los procedimientos de tu empresa en guías que cualquiera pueda consultar.</p>
            <div className="hero-actions"><Link href="/demo" className="button primary big">Entrar</Link><a href="#como-funciona" className="button secondary big">Cómo funciona</a></div>
            <div className="hero-note"><CheckCircle2 size={16} /> Consulta procesos, capacitación y conocimiento operativo en un mismo espacio.</div>
          </div>
          <CoachPreview />
        </div>
      </section>
      <section className="marketing-width benefits" aria-label="Beneficios">
        {benefits.map(({ icon: Icon, title, description }) => <article key={title}>
          <span className="icon-tile"><Icon size={22} /></span><h2>{title}</h2><p>{description}</p>
        </article>)}
      </section>
      <section className="marketing-section process" id="como-funciona">
        <div className="marketing-width">
          <div className="section-heading"><span className="eyebrow"><Workflow size={16} /> Cómo funciona</span><h2>Del documento a la práctica</h2></div>
          <div className="step-grid">{steps.map((step, i) => <article key={step.title}><span className="step-number">{i + 1}</span><h3>{step.title}</h3><p>{step.body}</p></article>)}</div>
        </div>
      </section>
      <section id="funciones" className="marketing-width marketing-section features">
        <div className="section-heading"><span className="eyebrow"><BookOpen size={16} /> Funciones</span><h2>Un espacio de trabajo para aprender y operar</h2></div>
        <div className="feature-grid">
          {[
            [Sparkles, "AI Coach", "Haz preguntas sobre la operación y abre los documentos que respaldan la respuesta."],
            [BookOpen, "Smart Recipes", "Encuentra y completa procedimientos breves organizados por área."],
            [ClipboardCheck, "Diagnóstico", "Identifica habilidades por reforzar y recibe prácticas basadas en tus respuestas."],
            [Search, "Laboratorio IA", "Inspecciona probabilidades, similitud documental y métricas de evaluación."],
          ].map(([Icon, title, text]) => {
            const FeatureIcon = Icon as typeof Sparkles;
            return <article key={String(title)}><FeatureIcon size={21} /><div><h3>{String(title)}</h3><p>{String(text)}</p></div></article>;
          })}
        </div>
      </section>
      <section className="marketing-width last-cta">
        <div><h2>Accede al espacio de trabajo de NovaRetail</h2><p>Consulta procedimientos, desarrolla habilidades y comparte conocimiento con el equipo.</p></div>
        <Link href="/demo" className="button primary big">Entrar</Link>
      </section>
    </main>
    <footer className="marketing-width marketing-footer"><Brand /><p>Capacitación y conocimiento operativo para cada equipo.</p><Link href="/demo">Acceder</Link></footer>
  </div>;
}
