"""Sliding-window in-memory rate limiter for authentication endpoints."""

from collections import defaultdict, deque
from math import ceil
from threading import Lock
import time

from fastapi import status

from app.core.exceptions import AppAuthException, AuthErrorCode


class SlidingWindowRateLimiter:
    """Thread-safe sliding window rate limiter keyed by client/action identifier."""

    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def check(self, key: str, max_requests: int, window_seconds: int) -> None:
        """Record a request hit or raise 429 if the window quota is exceeded."""
        now = time.monotonic()
        cutoff = now - window_seconds

        with self._lock:
            timestamps = self._hits[key]
            while timestamps and timestamps[0] <= cutoff:
                timestamps.popleft()

            if len(timestamps) >= max_requests:
                retry_after = max(1, ceil(timestamps[0] + window_seconds - now))
                raise AppAuthException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    error_code=AuthErrorCode.RATE_LIMIT_EXCEEDED,
                    detail=f"Too many authentication attempts. Try again in {retry_after} seconds.",
                    headers={"Retry-After": str(retry_after)},
                    extra={"retry_after_seconds": retry_after},
                )

            timestamps.append(now)

    def reset(self) -> None:
        """Clear all recorded rate-limit hits (intended for tests)."""
        with self._lock:
            self._hits.clear()


rate_limiter = SlidingWindowRateLimiter()

