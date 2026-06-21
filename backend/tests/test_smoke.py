"""Smoke tests — no DB required, verify imports and config are sane."""

from app.core.security import create_access_token, decode_access_token, hash_password, verify_password


def test_password_hash_roundtrip():
    hashed = hash_password("hunter2")
    assert verify_password("hunter2", hashed) is True
    assert verify_password("wrong", hashed) is False


def test_jwt_roundtrip():
    token = create_access_token("00000000-0000-0000-0000-000000000001", extra={"email": "a@b.com"})
    payload = decode_access_token(token)
    assert payload["sub"] == "00000000-0000-0000-0000-000000000001"
    assert payload["email"] == "a@b.com"
    assert "exp" in payload and "iat" in payload
