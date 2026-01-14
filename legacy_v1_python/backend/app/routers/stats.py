from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import List, Dict, Any
from backend.database import models
from backend.database.database import get_db
from backend.app import auth

router = APIRouter(
    prefix="/stats",
    tags=["stats"],
)

@router.get("/expenses-by-category")
def get_expenses_by_category(month: str, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    dt = datetime.strptime(month, "%Y-%m")
    start_date = dt.replace(day=1)
    next_month = (start_date + timedelta(days=32)).replace(day=1)
    
    results = db.query(models.Expense.category, func.sum(models.Expense.amount)).join(models.Wallet).filter(
        models.Wallet.user_id == current_user.id,
        models.Expense.date >= start_date,
        models.Expense.date < next_month
    ).group_by(models.Expense.category).all()
    
    return {r[0]: r[1] for r in results}

@router.get("/monthly-trend")
def get_monthly_trend(year: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    items = db.query(models.WalletMonthlyBalance.month, 
                     func.sum(models.WalletMonthlyBalance.total_income), 
                     func.sum(models.WalletMonthlyBalance.total_expense)).join(models.Wallet).filter(
        models.Wallet.user_id == current_user.id,
        models.WalletMonthlyBalance.month.like(f"{year}-%")
    ).group_by(models.WalletMonthlyBalance.month).all()
    
    data = []
    for m in range(1, 13):
        m_str = f"{year}-{m:02d}"
        found = next((i for i in items if i[0] == m_str), None)
        if found:
            data.append({"month": m_str, "income": found[1], "expense": found[2]})
        else:
            data.append({"month": m_str, "income": 0, "expense": 0})
            
    return data
