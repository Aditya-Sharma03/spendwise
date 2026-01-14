from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from backend.database import models
from backend.database.database import get_db
from backend.app import auth, ledger

router = APIRouter(
    prefix="/insights",
    tags=["insights"],
)

@router.get("/")
def get_insights(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    month_str = datetime.now().strftime("%Y-%m")
    
    total_income = 0.0
    total_expense = 0.0
    cash_expense = 0.0
    bank_expense = 0.0
    
    insights = []
    
    for wallet in current_user.wallets:
        ledger_entry = ledger.get_or_create_monthly_balance(db, wallet.id, month_str)
        total_income += ledger_entry.total_income
        total_expense += ledger_entry.total_expense
        
        if wallet.type == "CASH":
            cash_expense += ledger_entry.total_expense
        elif wallet.type == "BANK":
            bank_expense += ledger_entry.total_expense
            
    # Rule 1: Cash Burn Rate
    if total_income > 0:
        burn_rate = (total_expense / total_income) * 100
        if burn_rate > 100:
            insights.append({"type": "warning", "message": f"You are spending {burn_rate:.1f}% of your income! (Deficit)"})
        elif burn_rate > 80:
            insights.append({"type": "caution", "message": f"High burn rate: {burn_rate:.1f}% of income used."})
        else:
            insights.append({"type": "success", "message": f"Healthy burn rate: {burn_rate:.1f}%."})
    elif total_expense > 0:
        insights.append({"type": "warning", "message": "Expenses detected with zero income."})
        
    # Rule 2: Bank Dependency
    if total_expense > 0:
        bank_share = (bank_expense / total_expense) * 100
        if bank_share > 80:
            insights.append({"type": "info", "message": f"High bank dependency: {bank_share:.1f}% of expenses via bank."})
        elif bank_share < 20:
            insights.append({"type": "info", "message": "Heavy cash usage detected."})
            
    return insights
