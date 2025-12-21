import json
from main import app
from fastapi.openapi.utils import get_openapi

def generate_openapi():
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        openapi_version=app.openapi_version,
        description=app.description,
        routes=app.routes,
        tags=app.openapi_tags,
        servers=app.servers
    )
    with open("openapi.json", "w") as f:
        json.dump(openapi_schema, f, indent=2)
    print("Successfully generated openapi.json")

if __name__ == "__main__":
    generate_openapi()