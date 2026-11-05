from fastapi import APIRouter, Depends, FastAPI, HTTPException, Response
from fastapi.responses import FileResponse
from pydantic import BaseModel

from . import content
from .auth import credentials_match, end_session, require_member, start_session
from .config import settings

# No generated docs pages: `/docs` belongs to the site's Brand docs page.
app = FastAPI(title="Kanz team", docs_url=None, redoc_url=None, openapi_url=None)

api = APIRouter(prefix="/api", dependencies=[Depends(require_member)])


class Login(BaseModel):
    username: str
    password: str


@app.post("/api/login", status_code=204)
def login(body: Login, response: Response) -> None:
    if not credentials_match(body.username, body.password):
        raise HTTPException(401, "That username or password isn't right.")
    start_session(response)


@app.post("/api/logout", status_code=204)
def logout(response: Response) -> None:
    end_session(response)


@api.get("/me")
def me(username: str = Depends(require_member)) -> dict:
    return {"username": username}


@api.get("/assets")
def assets() -> list[dict]:
    return content.list_assets()


@api.get("/assets/file/{path:path}")
def asset_file(path: str) -> FileResponse:
    file = content.resolve_asset(path)
    if file is None:
        raise HTTPException(404, "No such file.")
    return FileResponse(
        file,
        media_type=content.IMAGE_TYPES[file.suffix.lower()],
        headers={
            "Cache-Control": "private, max-age=60",
            "X-Content-Type-Options": "nosniff",
            # An uploaded SVG can hold script; never let it run on this origin.
            "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
        },
    )


@api.get("/docs")
def docs() -> list[dict]:
    return content.list_docs()


@api.get("/docs/{slug}")
def doc(slug: str) -> dict:
    found = content.get_doc(slug)
    if found is None:
        raise HTTPException(404, "No such document.")
    return found


app.include_router(api)


@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
def unknown_api(path: str) -> None:
    raise HTTPException(404, "Not found.")


# Declared last, so it only gets what nothing above claimed. Sends the built
# frontend's files, and index.html for its client-side routes.
@app.get("/{path:path}", include_in_schema=False)
def frontend(path: str) -> FileResponse:
    dist = settings.frontend_dist.resolve()
    file = (dist / path).resolve()
    if path and file.is_relative_to(dist) and file.is_file():
        return FileResponse(file)
    index = dist / "index.html"
    if not index.is_file():
        raise HTTPException(404, "The frontend is not built. Run `npm run build` in frontend/.")
    return FileResponse(index, headers={"Cache-Control": "no-cache"})
