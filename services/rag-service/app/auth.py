from fastapi import Header, HTTPException

def get_current_user(x_user_id: str = Header(..., description="User ID from API Gateway")) -> str:
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Missing X-User-Id header")
    return x_user_id
