import hmac
import time

import jwt
from fastapi import Cookie, HTTPException, Response

from .config import settings

COOKIE = "kanz_session"
SESSION_SECONDS = 7 * 24 * 60 * 60


def credentials_match(username: str, password: str) -> bool:
    if not (settings.team_username and settings.team_password and settings.session_secret):
        return False
    # Both are always compared, in constant time, so timing reveals neither.
    username_ok = hmac.compare_digest(username.encode(), settings.team_username.encode())
    password_ok = hmac.compare_digest(password.encode(), settings.team_password.encode())
    return username_ok and password_ok


def start_session(response: Response) -> None:
    now = int(time.time())
    token = jwt.encode(
        {"sub": settings.team_username, "iat": now, "exp": now + SESSION_SECONDS},
        settings.session_secret,
        algorithm="HS256",
    )
    response.set_cookie(
        COOKIE,
        token,
        max_age=SESSION_SECONDS,
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure,
    )


def end_session(response: Response) -> None:
    response.delete_cookie(COOKIE, httponly=True, samesite="lax", secure=settings.cookie_secure)


def require_member(kanz_session: str | None = Cookie(default=None)) -> str:
    if kanz_session and settings.session_secret:
        try:
            claims = jwt.decode(
                kanz_session,
                settings.session_secret,
                algorithms=["HS256"],
                options={"require": ["exp", "sub"]},
            )
            return claims["sub"]
        except jwt.PyJWTError:
            pass
    raise HTTPException(401, "Sign in to continue.")
