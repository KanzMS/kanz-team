"""The site's content is plain files: drop one in `content/` and it is live."""

import re
from pathlib import Path

import frontmatter

from .config import settings

IMAGE_TYPES = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
}
SLUG = re.compile(r"[a-z0-9][a-z0-9-]*")


def _title(stem: str) -> str:
    words = re.sub(r"[-_]+", " ", stem).strip()
    return words[:1].upper() + words[1:]


def list_assets() -> list[dict]:
    """Every image under `content/assets`, grouped by its top-level folder."""
    root = settings.content_dir / "assets"
    assets = []
    for path in sorted(root.rglob("*")):
        relative = path.relative_to(root)
        if (
            not path.is_file()
            or path.suffix.lower() not in IMAGE_TYPES
            or any(part.startswith(".") for part in relative.parts)
        ):
            continue
        assets.append(
            {
                "path": relative.as_posix(),
                "name": _title(path.stem),
                "filename": path.name,
                "category": _title(relative.parts[0]) if len(relative.parts) > 1 else "General",
                "format": path.suffix[1:].upper().replace("JPEG", "JPG"),
                "bytes": path.stat().st_size,
            }
        )
    return assets


def resolve_asset(relative: str) -> Path | None:
    """The file for an asset path, or None if it is not a listed image under the root."""
    root = (settings.content_dir / "assets").resolve()
    path = (root / relative).resolve()
    if (
        not path.is_relative_to(root)
        or not path.is_file()
        or path.suffix.lower() not in IMAGE_TYPES
        or any(part.startswith(".") for part in path.relative_to(root).parts)
    ):
        return None
    return path


def _doc_meta(path: Path, post: frontmatter.Post) -> dict:
    return {
        "slug": path.stem,
        "title": post.get("title", _title(path.stem)),
        "summary": post.get("summary", ""),
        "icon": post.get("icon", "description"),
        "order": post.get("order", 100),
    }


def list_docs() -> list[dict]:
    docs = [
        _doc_meta(path, frontmatter.load(path))
        for path in (settings.content_dir / "docs").glob("*.md")
        if SLUG.fullmatch(path.stem)
    ]
    return sorted(docs, key=lambda doc: (doc["order"], doc["title"]))


def get_doc(slug: str) -> dict | None:
    if not SLUG.fullmatch(slug):
        return None
    path = settings.content_dir / "docs" / f"{slug}.md"
    if not path.is_file():
        return None
    post = frontmatter.load(path)
    return {**_doc_meta(path, post), "body": post.content}
