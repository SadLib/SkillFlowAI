FROM python:3.12-slim

WORKDIR /app
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1

COPY apps/api/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY apps/api/skillflow ./apps/api/skillflow
COPY data ./data
COPY models ./models

RUN mkdir -p /app/.skillflow && chown 65534:65534 /app/.skillflow

USER 65534
EXPOSE 8000
CMD ["sh", "-c", "exec python -m uvicorn skillflow.main:app --app-dir apps/api --host 0.0.0.0 --port ${PORT:-8000}"]
