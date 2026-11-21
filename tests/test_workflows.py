from uuid import uuid4

from fastapi.testclient import TestClient

from skillflow.main import app


def test_guided_workflow_is_published_reused_and_restored():
    need = {"employee": "diego", "need": "Quiero organizar incidencias de envíos"}
    draft = {
        "id": str(uuid4()), "author": "valeria", "title": "Clasificar tickets de soporte con IA",
        "objective": "Organizar la bandeja de soporte por tema.",
        "sample": "Un cliente se queja de la atención recibida.",
        "category": "reclamaciones", "outcome": "Confirmé el motivo y envié el ticket a Soporte.",
    }
    reuse = {
        "employee": "diego", "sample": "El paquete figura entregado pero no llegó.",
        "category": "envios", "outcome": "Consulté la guía del pedido y derivé la incidencia a Logística.",
    }
    with TestClient(app) as client:
        response = client.post("/api/workflows", json=draft)
        assert response.status_code == 201
        saved = response.json()
        identifier = saved["id"]
        assert saved["status"] == "pending"
        assert client.post("/api/workflows", json=draft).json()["id"] == identifier
        assert client.get("/api/workflows/suggestions", params=need).json() == []
        assert client.get(f"/api/recipes/{identifier}").status_code == 404
        assert client.post(f"/api/workflows/{identifier}/reuse", json=reuse).status_code == 404

        publication = client.post(f"/api/workflows/{identifier}/publish", json={}).json()
        assert publication["status"] == "published"
        assert client.get(f"/api/recipes/{identifier}").json()["source"].endswith("Valeria Cruz")
        recommendation, = client.get("/api/workflows/suggestions", params=need).json()
        assert recommendation["workflow"]["id"] == identifier
        assert "Logística" in recommendation["adaptation"]
        unrelated = {**need, "need": "¿Cuál es el horario de la sucursal?"}
        assert client.get("/api/workflows/suggestions", params=unrelated).json() == []
        assert client.get("/api/workflows/suggestions", params={**need, "employee": "valeria"}).json() == []

        assert client.post(f"/api/workflows/{identifier}/reuse", json=reuse).status_code == 200
        repeated = client.post(f"/api/workflows/{identifier}/reuse", json=reuse).json()
        recorded, = repeated["applications"]
        assert recorded["employee_name"] == "Diego Torres"
        assert recorded["outcome"] == reuse["outcome"]

    with TestClient(app) as restarted:
        saved, = restarted.get("/api/workflows").json()
        assert saved["applications"] == [recorded]
        assert restarted.get(f"/api/recipes/{identifier}").status_code == 200
