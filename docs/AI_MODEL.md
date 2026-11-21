# Modelo de intención y recuperación documental

## 1. Problema y alcance

SkillFlow AI clasifica consultas de capacitación de NovaRetail en cuatro intenciones y recupera procedimientos locales para ayudar a encontrar una fuente. Es un prototipo académico, no un sistema validado con consultas reales ni información de clientes. El clasificador es aprendizaje automático supervisado; el recuperador es un índice TF-IDF independiente; las respuestas del Coach se construyen localmente con fragmentos y reglas deterministas. No se llama a un proveedor externo de IA.

## 2. Dataset y etiquetas

`data/intents.json` contiene 200 ejemplos sintéticos en español, redactados para este prototipo: 50 por categoría. No son conversaciones ni datos reales de NovaRetail o sus empleados.

| Etiqueta | Tema |
|---|---|
| `devoluciones` | Plazos, retornos y reembolsos |
| `reclamaciones` | Quejas, inconformidades y escalamiento |
| `envios` | Guías, rastreo y problemas de entrega |
| `informacion_general` | Acceso al portal y recursos internos |

El entrenamiento valida las columnas, textos, etiquetas y duplicados después de normalizar Unicode, mayúsculas y espacios. La división estratificada deja 160 ejemplos para entrenar y 40 para probar, con semilla fija 42. El vectorizador se ajusta únicamente con la partición de entrenamiento.

## 3. Preprocesamiento y clasificación

El pipeline de scikit-learn convierte el texto con `TfidfVectorizer` usando unigramas y bigramas, normalización Unicode de acentos, hasta 5.000 características y frecuencia sublineal. TF-IDF representa la importancia relativa de los términos; no genera embeddings.

`LogisticRegression` aprende las cuatro etiquetas con `max_iter=1000`, `C=4` y pesos balanceados. El pipeline completo se serializa con joblib en `models/intent_classifier.joblib` y FastAPI lo carga una vez durante su ciclo de inicio. El endpoint de clasificación invoca ese pipeline y devuelve la consulta, la etiqueta predicha, el nombre del modelo y `predict_proba`. Esas probabilidades son puntuaciones estimadas, no certezas ni probabilidades calibradas.

Para reproducir el entrenamiento desde la raíz:

```powershell
.\.venv\Scripts\python.exe scripts\train_intent_model.py
```

El script evalúa sobre ejemplos que no participaron en el ajuste y compara contra `DummyClassifier(strategy="most_frequent")`, entrenado solo con la partición de entrenamiento. Regenera el artefacto y `models/metrics.json`, que contiene accuracy, promedios macro de precision/recall/F1, reporte por clase, matriz de confusión, baseline, semilla, versión de scikit-learn y huella SHA-256 del dataset.

## 4. Resultados de evaluación

Las cifras se generan desde la partición reservada al ejecutar el script; esta tabla resume las métricas almacenadas en `models/metrics.json`.

| Métrica | TF-IDF + Regresión Logística | Baseline |
|---|---:|---:|
| Accuracy | 91,67 % | 25,00 % |
| Precision macro | 93,75 % | 6,25 % |
| Recall macro | 91,67 % | 25,00 % |
| Macro F1 | 92,02 % | 10,00 % |

La matriz de confusión tiene filas reales y columnas predichas, en el orden de las etiquetas del JSON de métricas:

| Real / predicha | Devoluciones | Envíos | Información general | Reclamaciones |
|---|---:|---:|---:|---:|
| Devoluciones | 8 | 1 | 0 | 0 |
| Envíos | 0 | 9 | 0 | 0 |
| Información general | 0 | 1 | 8 | 0 |
| Reclamaciones | 0 | 1 | 0 | 8 |

Hay solo 40 ejemplos de prueba, escritos con estilo y vocabulario similares a los de entrenamiento. El corpus pequeño, sintético y preparado para este catálogo no representa tráfico real; estas métricas no demuestran rendimiento en producción. La comparación con el baseline es una referencia reproducible, no una prueba independiente de generalización.

## 5. Recuperación documental

`apps/api/skillflow/services/catalog.py` crea un índice independiente con los procedimientos ficticios de `data/recipes.json`. Para cada procedimiento concatena título (con peso adicional), palabras clave, fragmento y pasos; otro `TfidfVectorizer` representa sus términos. La consulta se compara con el catálogo mediante similitud coseno. Se devuelven hasta tres documentos con score de al menos 0,16, ordenados por similitud. El score mide coincidencia léxica, no certeza de que la política resuelva el caso.

Los documentos contienen identificador, título, categoría, fuente y contenido (fragmento y pasos). Las evaluaciones de referencia están en `data/retrieval_eval.json` y sus resultados reales en `models/retrieval_metrics.json`; el conjunto fue construido para el catálogo inicial.

## 6. Respuestas locales del AI Coach

`POST /api/coach` predice la intención con el artefacto entrenado y, en un paso separado, busca evidencia en el índice documental. Cuando encuentra documentos, una plantilla reproduce el fragmento de mayor similitud y su fuente. Para la política de devolución aplica una regla explícita que compara un único número de días del mensaje con el límite leído del fragmento. No formula contenido con un LLM. Si no supera el umbral documental, responde que no encontró contexto y evita recomendar una política. La respuesta identifica el modo `local_template` o `insufficient_context`.

La selección de la recomendación y la calificación del diagnóstico utilizan reglas. No son predicciones del clasificador. En Administración, la estructura de pasos de un procedimiento nuevo se obtiene dividiendo el texto ingresado; tampoco es Machine Learning.

## 7. API, interfaz y pruebas

FastAPI carga el modelo y métricas durante `lifespan`. `/api/classify` devuelve predicción y puntuaciones; `/api/coach` combina esa clasificación con recuperación y respuesta con fuente; `/api/model/metrics` sirve el JSON medido. Next.js consume esas rutas: AI Coach presenta la respuesta y evidencia, y Laboratorio obtiene métricas, reporte, matriz, baseline y resultados interactivos desde el backend. Si la API no está disponible, la interfaz muestra error en vez de fabricar métricas.

Las pruebas en `tests/` verifican artefacto y huella, partición/métricas, las cuatro categorías, validación de consultas, clasificación y Coach HTTP, abstención, recuperación, creación local de procedimientos y diagnóstico.

## 8. Herramientas, autoría y limitaciones

El equipo escribió el dataset sintético, el pipeline, el flujo de entrenamiento/evaluación, las reglas de respuesta, la integración FastAPI y la interfaz. scikit-learn, pandas y joblib son bibliotecas externas que implementan las operaciones generales de vectorización, regresión logística, división, evaluación y serialización; no se presenta el algoritmo de la biblioteca como un algoritmo inventado por el equipo.

El contenido del catálogo, el corpus y los ejemplos de evaluación son demostrativos. TF-IDF depende del solapamiento de palabras; las consultas ambiguas, fuera de dominio o formuladas de maneras no cubiertas pueden obtener scores débiles o engañosos. Antes de un uso operativo se necesitarían datos representativos revisados, evaluación externa, calibración/abstención validada, controles editoriales y monitoreo.
