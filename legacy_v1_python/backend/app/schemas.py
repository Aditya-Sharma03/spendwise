from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    created_at: datetime
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class IncomeCreate(BaseModel):
    wallet_id: int
    amount: float
    date: datetime
    category: str
    description: Optional[str] = None

class ExpenseCreate(BaseModel):
    wallet_id: int
    amount: float
    date: datetime
    category: str
    description: Optional[str] = None

class TransferCreate(BaseModel):
    source_wallet_id: int
    target_wallet_id: int
    amount: float
    date: datetime
    description: Optional[str] = None

class WalletResponse(BaseModel):
    id: int
    name: str
    type: str
    class Config:
        from_attributes = True
