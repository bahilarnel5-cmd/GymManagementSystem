"""Supabase Storage helper for payment proof uploads.

Uses the SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars (set on Render).
The client is created lazily so the app still boots when the env vars are
missing (e.g. local dev without Supabase configured). Payment proofs live in
a private bucket and are always read back via short-lived signed URLs — never
a permanent public URL.
"""
import os
import uuid

_sb_client = None


def get_sb_client():
    global _sb_client
    if _sb_client is not None:
        return _sb_client
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        return None
    try:
        from supabase import create_client
        _sb_client = create_client(url, key)
    except Exception:
        return None
    return _sb_client


def storage_configured() -> bool:
    return bool(os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_SERVICE_ROLE_KEY"))


def upload_screenshot(file_bytes: bytes, content_type: str, bucket: str = "payment-proofs") -> str:
    """Upload proof bytes and return the storage object path."""
    sb = get_sb_client()
    if sb is None:
        raise RuntimeError("Supabase storage is not configured on this server")
    path = f"{uuid.uuid4().hex}.{_extension(content_type)}"
    options = {"content-type": content_type}
    try:
        sb.storage.from_(bucket).upload(path, file_bytes, options)
    except Exception:
        # Some storage backends need the file object / upsert handling; fall
        # back to an upsert upload so intermittent "already exists" races for
        # a never-used UUID path don't break the member's submission.
        sb.storage.from_(bucket).update(path, file_bytes, options)
    return path


def signed_url(path: str, bucket: str = "payment-proofs", expires_in: int = 3600) -> str | None:
    """Return a short-lived signed URL for a stored object path."""
    sb = get_sb_client()
    if sb is None or not path:
        return None
    try:
        res = sb.storage.from_(bucket).create_signed_url(path, expires_in)
        if isinstance(res, dict):
            return res.get("signedURL") or res.get("signedUrl")
        return res
    except Exception:
        return None


def _extension(content_type: str) -> str:
    return {
        "image/png": "png",
        "image/jpeg": "jpg",
        "image/jpg": "jpg",
        "image/webp": "webp",
        "image/gif": "gif",
        "application/pdf": "pdf",
    }.get((content_type or "").lower(), "png")
