from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from backend.database import models
from backend.database.database import get_db
from backend.app import auth, ledger

router = APIRouter(
    prefix="/dashboard",
    tags=["dashboard"],
)

@router.get("/summary")
def get_dashboard_summary(month: str = None, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    wallets = current_user.wallets
    month_str = month if month else datetime.now().strftime("%Y-%m")
    
    summary = {
        "cash": {"opening": 0.0, "closing": 0.0},
        "bank": {"opening": 0.0, "closing": 0.0},
        "total_income": 0.0,
        "total_expense": 0.0,
        "total_balance": 0.0
    }
    
    for wallet in wallets:
        # Get ledger
        monthly = ledger.get_or_create_monthly_balance(db, wallet.id, month_str)
        # Maybe calling get_or_create on GET request is a bit heavy (write op), 
        # but ensures consistency. Good for MVP.
        
        if wallet.type == "CASH":
            summary["cash"]["opening"] += monthly.opening_balance
            summary["cash"]["closing"] += monthly.closing_balance
        elif wallet.type == "BANK":
            summary["bank"]["opening"] += monthly.opening_balance
            summary["bank"]["closing"] += monthly.closing_balance
            
        summary["total_income"] += monthly.total_income
        summary["total_expense"] += monthly.total_expense
        summary["total_balance"] += monthly.closing_balance
        
    return summary
