import jwt
from fastapi import Header, HTTPException, Depends
from .config import JWT_SECRET

def get_current_user(authorization: str = Header(..., description="Bearer JWT token")) -> str:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header format. Must be 'Bearer <token>'")
    
    token = authorization.split(" ")[1]
    
    try:
        # Note: In production, you might want to specify algorithms=['HS256']
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token missing 'sub' claim")
        return str(user_id)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
