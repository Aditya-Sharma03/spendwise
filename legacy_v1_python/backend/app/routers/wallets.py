from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from backend.database import models
from backend.database.database import get_db
from backend.app import auth, schemas

router = APIRouter(
    prefix="/wallets",
    tags=["wallets"],
)

@router.get("/", response_model=List[schemas.WalletResponse])
def get_wallets(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    return current_user.wallets
