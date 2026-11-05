from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Read from the `.env` at the repo root."""

    model_config = SettingsConfigDict(env_file=ROOT / ".env", extra="ignore")

    # The one team account. Left empty, nobody can sign in.
    team_username: str = ""
    team_password: str = ""
    # Signs the session cookie. Changing it signs everyone out.
    session_secret: str = ""
    # Set true wherever the site is served over https.
    cookie_secure: bool = False
    content_dir: Path = ROOT / "content"
    frontend_dist: Path = ROOT / "frontend" / "dist"


settings = Settings()
