# SkillFlow AI

SkillFlow AI es un MVP académico de una plataforma B2B de capacitación interna. En la empresa ficticia NovaRetail, una persona puede preguntar por un procedimiento, consultar su fuente y practicar con una guía breve. Una evaluación identifica competencias por reforzar y recomienda procedimientos concretos.

## Producto y negocio

En operaciones de tienda, atención y logística, los manuales pueden estar dispersos y las respuestas pueden depender de quién esté disponible para orientar a un empleado. SkillFlow AI reúne el catálogo, el asistente y el diagnóstico en un mismo espacio de trabajo. El público inicial serían equipos de capacitación y operaciones de retailers con varias sucursales.

La **hipótesis de negocio** es una suscripción mensual por empleado activo con un mínimo por empresa, precedida por un piloto pagado. En un piloto mediríamos el tiempo para localizar una política, el acierto con que se aplica y la proporción de guías completadas. NovaRetail, sus usuarios y sus datos operativos son ficticios. El proyecto no presenta clientes, ventas ni resultados de negocio validados.

## Qué incluye

| Ruta | Experiencia |
|---|---|
| `/` | Presentación del producto y acceso al espacio de trabajo |
| `/demo` | Selector de cuatro cuentas de ejemplo: Valeria en Soporte, Diego en Logística, María en tienda y Carlos en Administración |
| `/dashboard` | Progreso, cursos agrupados por competencia, prácticas, novedades y evaluaciones |
| `/coach` | Preguntas libres y sugeridas, intención, respuesta, documentos y guía recomendada |
| `/coach/sesion` | Coach 1 a 1 por texto, casos de referencia, prueba con el clasificador y guías entre compañeros |
| `/recipes` | Ocho Smart Recipes iniciales con búsqueda y filtro por categoría |
| `/recipes/[id]` | Objetivo, pasos, ejemplos, fuente y registro de finalización |
| `/assessment` | Nueve preguntas, calificación por competencia y recomendaciones por reglas |
| `/admin` | Empleados, indicadores, alta de procedimientos y revisión, publicación y reutilización de las guías de compañeros |
| `/lab` | Arquitectura, métricas medidas, matriz de confusión y consulta interactiva |

## Stack y arquitectura

Next.js 16 con App Router, TypeScript estricto, React, Tailwind CSS, Lucide y Geist local para la interfaz. FastAPI, Pydantic, pandas, scikit-learn, joblib y HTTPX para datos, inferencia y API REST.

El navegador envía la consulta a FastAPI. El pipeline entrenado TF-IDF + regresión logística calcula puntuaciones estimadas por intención. Un índice documental independiente recupera fragmentos mediante similitud coseno. El Coach responde con plantillas y reglas locales sobre el fragmento principal, muestra su fuente o declara contexto insuficiente. La clasificación, recuperación y respuesta no dependen de APIs externas de IA. El diagnóstico califica usando una clave de respuestas y aplica reglas de recomendación. [Arquitectura](docs/ARCHITECTURE.md)

```text
apps/web/                 Interfaz Next.js, componentes, estilos y public/brand/
apps/api/skillflow/       FastAPI, routers, esquemas Pydantic y servicios
apps/api/requirements*    Dependencias de ejecución y prueba
data/                     Intenciones, recetas, preguntas y casos de recuperación
models/                   Modelo joblib y resultados reales de ambas evaluaciones
scripts/                  Entrenamiento y evaluación documental reproducibles
tests/                    Pruebas del modelo, recuperación y API
docs/                     Arquitectura, modelo, guion y pitch
Dockerfile                Imagen backend con datos y modelo
railway.toml              Constructor Docker y verificación de salud
```

## Instalación y ejecución local

Requisitos de la demo comprobada: Python 3.12, Node.js 22 o superior y npm. Abre dos terminales en la raíz `SkillFlow-AI`.

**Terminal 1, backend en Windows PowerShell**

```powershell
py -3.12 -m venv .venv
Copy-Item .env.example .env
.\.venv\Scripts\python.exe -m pip install -r apps/api/requirements-dev.txt
.\.venv\Scripts\python.exe -m uvicorn skillflow.main:app --app-dir apps/api --host 127.0.0.1 --port 8000
```

En macOS o Linux usa `python3.12 -m venv .venv`, `cp .env.example .env` y sustituye `.\.venv\Scripts\python.exe` por `./.venv/bin/python`. En Windows también puedes invocar el ejecutable de Python 3.12 directamente si tu instalación no incluye `py`.

**Terminal 2, frontend**

```powershell
cd apps/web
Copy-Item .env.example .env.local
npm.cmd ci
npm.cmd run dev
```

En macOS o Linux usa `cp .env.example .env.local` y ejecuta `npm ci` y `npm run dev`. Abre [la interfaz local](http://localhost:3000) y, para confirmar el backend, consulta [health](http://localhost:8000/health) u [OpenAPI](http://localhost:8000/docs). Los artefactos entrenados ya se incluyen, de modo que arrancar la demo no requiere entrenamiento ni una clave externa.

## Variables de entorno

| Variable | Ubicación y valor |
|---|---|
| `CORS_ORIGINS` | FastAPI. Orígenes del navegador separados por coma, sin barra final. Los dos orígenes locales del puerto 3000 están habilitados por defecto. |
| `SKILLFLOW_DB_PATH` | FastAPI. Archivo SQLite de aportaciones y aplicaciones. Por defecto `.skillflow/workflows.sqlite3` en el monorepo. |
| `PORT` | Railway lo inyecta. La imagen usa 8000 como respaldo local. |
| `NEXT_PUBLIC_API_URL` | Next.js. URL pública base de FastAPI sin `/api`, disponible al compilar. Predeterminado `http://localhost:8000`. |

Durante el desarrollo, FastAPI carga `.env` de la raíz y Next.js carga `apps/web/.env.local`. Los ejemplos no contienen secretos.

## Dataset, entrenamiento y resultados

`data/intents.json` contiene 200 consultas en español redactadas para NovaRetail, 50 por clase. Las etiquetas son `devoluciones`, `reclamaciones`, `envios` e `informacion_general`. El script valida textos, etiquetas y duplicados tras normalizar Unicode, mayúsculas y espacios. La separación es estratificada y reproducible con semilla 42. El vectorizador aprende el vocabulario e IDF con 160 ejemplos de entrenamiento y transforma por separado los 40 de prueba. Extrae unigramas y bigramas de palabras, reduce acentos y aplica frecuencia sublineal.

Desde la raíz, con el entorno virtual activo:

```sh
python scripts/train_intent_model.py
python scripts/evaluate_retrieval.py
python -m pytest -q
```

| Métrica real | Resultado |
|---|---:|
| Accuracy | 90,00 % (36/40) |
| Precisión macro | 91,45 % |
| Recall macro | 90,00 % |
| F1 macro | 90,16 % |

El entrenamiento guarda `models/intent_classifier.joblib` y `models/metrics.json` con el baseline, el reporte por clase, la matriz, la semilla, la versión de scikit-learn y la huella del dataset. El clasificador expone puntuaciones `predict_proba`; son estimaciones, no certezas calibradas. Los 40 ejemplos de prueba miden el comportamiento sobre este corpus pequeño. No se ha medido generalización sobre transcripciones reales. [Modelo, matriz y limitaciones](docs/AI_MODEL.md)

## Recuperación y recomendaciones

La búsqueda ajusta un segundo TF-IDF con el título, las palabras clave, el fragmento y los pasos de cada procedimiento. Ordena por similitud coseno, aplica un umbral de **0,16** y devuelve hasta tres coincidencias. El Coach compone una respuesta local a partir del fragmento recuperado y cita el documento usado. La comparación del plazo se calcula desde el texto de la política al detectar un único número de días. Si falta evidencia recuperada, el asistente comunica la limitación.

La recuperación se evaluó sin consultar el clasificador. Obtuvo **9/9** aciertos en primera posición, **9/9** en los primeros tres resultados y **2/2** abstenciones. Los casos y resultados están en `data/retrieval_eval.json` y `models/retrieval_metrics.json`.

En el diagnóstico se cuentan aciertos por categoría. Cuando una categoría queda por debajo del 70 %, el motor de reglas vincula los errores con las guías asociadas, ordena las categorías por puntuación y elimina guías duplicadas. El Coach recomienda el documento más próximo y usa la categoría predicha para resolver diferencias pequeñas entre candidatos. El progreso personal contabiliza recetas completadas más el diagnóstico, sobre el total de recetas disponibles más un diagnóstico.

## API y ejemplos

| Método y ruta | Entrada o comportamiento |
|---|---|
| `GET /health` | Disponibilidad de la API y carga del modelo |
| `POST /api/classify` | `{"query":"…"}` devuelve consulta, etiqueta, puntuaciones estimadas y nombre del modelo local |
| `POST /api/coach` | `{"query":"…"}` devuelve intención, documentos y similitudes, respuesta local, fuentes y modo |
| `GET /api/recipes` | Catálogo inicial y procedimientos creados durante la sesión del servidor |
| `GET /api/recipes/{id}` | Procedimiento completo o 404 |
| `POST /api/recipes` | `{"title":"…","category":"Envíos","text":"…"}` devuelve receta y motor de estructuración |
| `GET /api/assessment` | Preguntas y opciones |
| `POST /api/assessment` | `{"answers":{"q1":1,"q2":0,…}}` con los nueve IDs y opciones indexadas desde 0 |
| `GET /api/model/metrics` | Reporte real de entrenamiento y prueba |
| `GET /api/workflows` | Aportaciones y aplicaciones registradas para la vista de Administración |
| `POST /api/workflows` | Envía una guía de sesión con autoría, ticket de práctica, categoría confirmada y resultado |
| `POST /api/workflows/{id}/publish` | Publica la aportación y la incorpora a Smart Recipes |
| `GET /api/workflows/suggestions` | Devuelve aportaciones publicadas que coinciden con el problema `need`, adaptadas al perfil `employee` |
| `POST /api/workflows/{id}/reuse` | Registra la aplicación por otro empleado y el resultado de su práctica |

```powershell
$body = @{ query = 'Un cliente quiere devolver un producto después de 20 días, ¿qué hago?' } | ConvertTo-Json
Invoke-RestMethod http://localhost:8000/api/coach -Method Post -ContentType 'application/json; charset=utf-8' -Body $body
```

El resultado esperado cita `NR-DEV-01`, explica que 20 días exceden el plazo estándar de 14 días y ofrece la receta `devolucion-plazo`. OpenAPI está disponible en `/docs` y `/openapi.json`.

## Despliegue en Railway y Vercel

El repositorio incluye la configuración. El despliegue externo queda pendiente.

1. Sube **el contenido** de `SkillFlow-AI` a la raíz de un repositorio Git. Conserva los archivos ocultos, `data/` y `models/`.
2. En Railway, crea un proyecto con **Deploy from GitHub repo** y selecciona el repositorio. Para el servicio de FastAPI usa **Root Directory** `/` y **Config File Path** `/railway.toml`. Railway construirá el `Dockerfile` de la raíz y usará el `PORT` asignado. Mantén una réplica para esta demo.
3. En el servicio de Railway, abre **Settings → Networking → Public Networking → Generate Domain**. Copia la URL HTTPS y comprueba `https://TU_API.up.railway.app/health`. No se necesita una clave de IA externa.
4. En Vercel, elige **Add New → Project** e importa el mismo repositorio. Usa **Framework Preset** Next.js, **Root Directory** `apps/web`, y Node.js 22.x o 24.x. Usa `npm ci` como **Install Command** y `npm run build` como **Build Command** si configuras valores explícitos. Deja el directorio de salida predeterminado.
5. En el proyecto de Vercel, agrega `NEXT_PUBLIC_API_URL=https://TU_API.up.railway.app` al entorno **Production** antes de desplegar. Si cambias esa variable después, vuelve a desplegar el frontend.
6. Copia el dominio de producción de Vercel. En **Variables** del servicio Railway configura `CORS_ORIGINS=https://TU_WEB.vercel.app` sin barra final. Si vas a probar desde otro origen, agrégalo separado por coma. Aplica el nuevo despliegue de Railway.
7. Verifica `/health`, abre `https://TU_WEB.vercel.app/demo` y ejecuta el caso de los 20 días en AI Coach. Comprueba que el Laboratorio carga la matriz y que se puede abrir el procedimiento citado.

## Recorrido del producto y equipo

1. Entra como **Valeria** e inicia **Guiarme paso a paso**. Usa el objetivo y el ticket de ejemplo, comprueba la categoría calculada y confirma o corrige la sugerencia. Envía la guía para revisión.
2. Cambia a **Carlos** y publica la guía desde **Aportaciones del equipo**.
3. Entra como **Diego**, selecciona **Adaptar a mi equipo** en la guía de Valeria y clasifica el ejemplo de Logística. Carlos verá el resultado al regresar a Administración.

El equipo está integrado por Nef, Erick, Sarai, Dane y Ale. La división de trabajo cubre integración de API, interfaz, coach y evaluación, flujos reutilizables, y administración y pruebas. [Guion minuto a minuto](docs/DEMO_SCRIPT.md) · [Pitch de 8 minutos](docs/PITCH.md)

## Relación con Sistemas Inteligentes

La demo hace visibles el aprendizaje supervisado, la selección de características, la separación estratificada, la medición multiclase, la representación y recuperación textual, la abstención por umbral y la toma de decisiones mediante reglas. El Laboratorio también permite comparar la probabilidad de una intención con la similitud de un documento, que miden cosas distintas.

## Estado, limitaciones y hoja de ruta

- Los cuatro perfiles son ficticios. Los diagnósticos, las finalizaciones y la actividad de cada perfil se guardan en el navegador.
- Las aportaciones de sesiones, sus publicaciones y las aplicaciones de compañeros se guardan en SQLite. Para conservarlas entre despliegues en Railway, usa un volumen persistente y define `SKILLFLOW_DB_PATH` dentro de ese volumen. Los procedimientos creados con el formulario directo de Administración tienen alcance de sesión del servidor.
- Las sesiones 1 a 1 usan un recorrido guiado por texto, clasificación supervisada y revisión humana. La coincidencia entre problemas se resuelve con reglas acotadas al ejercicio de clasificación de tickets. La elección de perfil y las operaciones de publicación pertenecen al entorno ficticio de demo.
- El Coach y la estructuración de procedimientos usan plantillas y reglas locales, sin llamadas a proveedores externos de IA. Quedan pendientes una compilación Docker y el despliegue Railway/Vercel.
- El corpus de prueba comparte el estilo y vocabulario del corpus de entrenamiento. TF-IDF tiene sensibilidad a formulaciones nuevas y la similitud coseno mide coincidencia léxica. El umbral se usa como heurística de demo.
- Siguientes pasos: autenticación y permisos reales, almacenamiento persistente, versionado de políticas, medición con consultas independientes y un piloto controlado. Pagos y soporte multiempresa quedan fuera del MVP.

## Validación local

- `scripts/train.py` y `scripts/evaluate_retrieval.py` regeneran los artefactos y reportes.
- `python -m pytest -q` ejecutó las pruebas del clasificador, la recuperación, los endpoints, el diagnóstico y los flujos: **29 pasaron**.
- `npm ci` instala las dependencias de la interfaz y `npm run build` compila las diez rutas con TypeScript estricto.
- La compilación Docker y el despliegue externo todavía requieren ejecutarse antes de publicar una versión productiva.
