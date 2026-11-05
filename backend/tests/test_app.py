import time

import jwt
import pytest
from fastapi.testclient import TestClient

from app.auth import COOKIE
from app.config import settings
from app.main import app

LOGIN = {"username": "team", "password": "correct horse"}


@pytest.fixture(autouse=True)
def configured(monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "team_username", LOGIN["username"])
    monkeypatch.setattr(settings, "team_password", LOGIN["password"])
    monkeypatch.setattr(settings, "session_secret", "s" * 64)
    monkeypatch.setattr(settings, "content_dir", tmp_path)
    logos = tmp_path / "assets" / "Logos"
    logos.mkdir(parents=True)
    (logos / "kanz-logo-white.png").write_bytes(b"png")
    (logos / "notes.txt").write_text("not an image")
    (logos / ".hidden.png").write_bytes(b"png")
    (tmp_path / "secret.png").write_bytes(b"outside the assets folder")
    docs = tmp_path / "docs"
    docs.mkdir()
    (docs / "second.md").write_text("---\ntitle: Second\norder: 2\n---\nBody two")
    (docs / "first.md").write_text("---\ntitle: First\norder: 1\n---\nBody one")


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def member(client):
    assert client.post("/api/login", json=LOGIN).status_code == 204
    return client


@pytest.mark.parametrize(
    "path", ["/api/me", "/api/assets", "/api/assets/file/Logos/kanz-logo-white.png", "/api/docs", "/api/docs/first"]
)
def test_every_content_route_needs_a_session(client, path):
    assert client.get(path).status_code == 401


@pytest.mark.parametrize(
    "body",
    [
        {"username": "team", "password": "wrong"},
        {"username": "wrong", "password": "correct horse"},
        {"username": "", "password": ""},
        {"username": "تيم", "password": "كلمة"},
    ],
)
def test_wrong_credentials_are_refused(client, body):
    response = client.post("/api/login", json=body)
    assert response.status_code == 401
    assert COOKIE not in response.cookies


@pytest.mark.parametrize("name", ["team_username", "team_password", "session_secret"])
def test_unconfigured_account_lets_nobody_in(client, monkeypatch, name):
    monkeypatch.setattr(settings, name, "")
    assert client.post("/api/login", json={"username": "", "password": ""}).status_code == 401
    assert client.post("/api/login", json=LOGIN).status_code == 401


def test_session_cookie_is_http_only_and_works(client):
    response = client.post("/api/login", json=LOGIN)
    cookie = response.headers["set-cookie"].lower()
    assert "httponly" in cookie and "samesite=lax" in cookie
    assert client.get("/api/me").json() == {"username": "team"}


def test_logout_ends_the_session(member):
    assert member.post("/api/logout").status_code == 204
    assert member.get("/api/me").status_code == 401


@pytest.mark.parametrize(
    ("secret", "expires_in"),
    [("x" * 64, 3600), ("s" * 64, -3600)],
    ids=["forged", "expired"],
)
def test_bad_session_tokens_are_refused(client, secret, expires_in):
    now = int(time.time())
    token = jwt.encode({"sub": "team", "exp": now + expires_in}, secret, algorithm="HS256")
    client.cookies.set(COOKIE, token)
    assert client.get("/api/me").status_code == 401


def test_assets_lists_only_visible_images(member):
    assets = member.get("/api/assets").json()
    assert [(a["path"], a["name"], a["category"], a["format"]) for a in assets] == [
        ("Logos/kanz-logo-white.png", "Kanz logo white", "Logos", "PNG")
    ]


def test_asset_file_is_served_sandboxed(member):
    response = member.get("/api/assets/file/Logos/kanz-logo-white.png")
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"
    assert "sandbox" in response.headers["content-security-policy"]


@pytest.mark.parametrize(
    "path",
    [
        "../secret.png",
        "Logos/../../secret.png",
        "..%2Fsecret.png",
        "Logos/notes.txt",
        "Logos/.hidden.png",
        "Logos/missing.png",
    ],
)
def test_asset_file_refuses_anything_else(member, path):
    response = member.get(f"/api/assets/file/{path}")
    assert response.status_code == 404
    assert response.content != b"outside the assets folder"


def test_docs_are_ordered_and_readable(member):
    assert [d["slug"] for d in member.get("/api/docs").json()] == ["first", "second"]
    assert member.get("/api/docs/second").json()["body"] == "Body two"


@pytest.mark.parametrize("slug", ["missing", "..%2F..%2Fsecret", "UPPER"])
def test_unknown_doc_is_404(member, slug):
    assert member.get(f"/api/docs/{slug}").status_code == 404


def test_unknown_api_route_is_404_not_the_frontend(member):
    assert member.get("/api/nothing").status_code == 404
