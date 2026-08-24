from fastapi.testclient import TestClient
from app.main import app
from app.core.schemas import HealthResponse

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    health = HealthResponse.model_validate(data)
    assert health.status == "ok"
    assert health.backend_ready is True
    assert health.model_ready is False
    assert health.model_provenance.model_name == "SEN2SRLite"
    assert health.model_provenance.model_variant == "NonReference_RGBN_x4"
    assert health.model_provenance.code_license == "CC0-1.0"
