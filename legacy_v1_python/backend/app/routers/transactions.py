from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import datetime
from backend.database import models
from backend.database.database import get_db
from backend.app import schemas, auth, ledger
from backend.app.routers import jobs

router = APIRouter(
    prefix="/transactions",
    tags=["transactions"],
)

@router.post("/income")
def add_income(income: schemas.IncomeCreate, background_tasks: BackgroundTasks, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    wallet = db.query(models.Wallet).filter(models.Wallet.id == income.wallet_id, models.Wallet.user_id == current_user.id).first()
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")

    new_income = models.Income(**income.dict())
    db.add(new_income)
    db.commit()
    
    # Update Ledger
    month_str = income.date.strftime("%Y-%m")
    # Immediate update for feedback
    monthly_ledger = ledger.get_or_create_monthly_balance(db, wallet.id, month_str)
    ledger.update_ledger_totals(db, monthly_ledger)
    
    # Background recalculation for propagation
    background_tasks.add_task(jobs.run_recalculation, wallet.id, month_str)
    
    return {"status": "success", "message": "Income added"}

@router.post("/expense")
def add_expense(expense: schemas.ExpenseCreate, background_tasks: BackgroundTasks, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    wallet = db.query(models.Wallet).filter(models.Wallet.id == expense.wallet_id, models.Wallet.user_id == current_user.id).first()
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")

    # Check balance
    month_str = expense.date.strftime("%Y-%m")
    monthly_ledger = ledger.get_or_create_monthly_balance(db, wallet.id, month_str)
    
    if monthly_ledger.closing_balance < expense.amount:
        raise HTTPException(status_code=400, detail="Insufficient funds")

    new_expense = models.Expense(**expense.dict())
    db.add(new_expense)
    db.commit()
    
    ledger.update_ledger_totals(db, monthly_ledger)
    background_tasks.add_task(jobs.run_recalculation, wallet.id, month_str)
    
    return {"status": "success", "message": "Expense added"}

@router.post("/transfer")
def wallet_transfer(transfer: schemas.TransferCreate, background_tasks: BackgroundTasks, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    source_wallet = db.query(models.Wallet).filter(models.Wallet.id == transfer.source_wallet_id, models.Wallet.user_id == current_user.id).first()
    target_wallet = db.query(models.Wallet).filter(models.Wallet.id == transfer.target_wallet_id, models.Wallet.user_id == current_user.id).first()
    
    if not source_wallet or not target_wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")

    month_str = transfer.date.strftime("%Y-%m")
    source_ledger = ledger.get_or_create_monthly_balance(db, source_wallet.id, month_str)
    
    if source_ledger.closing_balance < transfer.amount:
        raise HTTPException(status_code=400, detail="Insufficient funds in source wallet")

    new_transfer = models.WalletTransfer(**transfer.dict())
    db.add(new_transfer)
    db.commit()
    
    target_ledger = ledger.get_or_create_monthly_balance(db, target_wallet.id, month_str)
    
    ledger.update_ledger_totals(db, source_ledger)
    ledger.update_ledger_totals(db, target_ledger)
    
    background_tasks.add_task(jobs.run_recalculation, source_wallet.id, month_str)
    background_tasks.add_task(jobs.run_recalculation, target_wallet.id, month_str)
    
    return {"status": "success", "message": "Transfer successful"}
