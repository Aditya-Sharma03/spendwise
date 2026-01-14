from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from backend.database import models
from backend.database.database import get_db
from backend.app import schemas, auth

router = APIRouter(
    prefix="/auth",
    tags=["auth"],
)

@router.post("/register", response_model=schemas.UserResponse)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    try:
        print(f"Attempting to register: {user.email}")
        db_user = db.query(models.User).filter(models.User.email == user.email).first()
        if db_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        print("Hashing password...")
        try:
            hashed_password = auth.get_password_hash(user.password)
            print("Password hashed successfully")
        except Exception as e:
            print(f"HASHING ERROR: {e}")
            raise e

        new_user = models.User(email=user.email, hashed_password=hashed_password)
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        # Create default wallets (Step 4 Requirement)
        cash_wallet = models.Wallet(user_id=new_user.id, name="Cash", type="CASH")
        bank_wallet = models.Wallet(user_id=new_user.id, name="Bank", type="BANK")
        db.add(cash_wallet)
        db.add(bank_wallet)
        db.commit()
        
        print(f"User created: {new_user.id}, {new_user.email}, {new_user.created_at}")
        try:
            resp = schemas.UserResponse.model_validate(new_user)
            print("Validation successful")
            return resp
        except Exception as e:
            print(f"VALIDATION ERROR: {e}")
            raise e

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}
