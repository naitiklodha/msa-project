from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health/live")
@router.get("/healthz")
def live() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/health/ready")
@router.get("/readyz")
def ready() -> dict[str, str]:
    return {"status": "ready"}
