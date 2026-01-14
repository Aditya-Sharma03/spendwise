from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from backend.database import models

def get_previous_month(month_str: str) -> str:
    """Returns YYYY-MM for the previous month."""
    dt = datetime.strptime(month_str, "%Y-%m")
    first_day = dt.replace(day=1)
    prev_month = first_day - timedelta(days=1)
    return prev_month.strftime("%Y-%m")

def get_next_month(month_str: str) -> str:
    dt = datetime.strptime(month_str, "%Y-%m")
    next_month = (dt.replace(day=1) + timedelta(days=32)).replace(day=1)
    return next_month.strftime("%Y-%m")

def get_or_create_monthly_balance(db: Session, wallet_id: int, month_str: str) -> models.WalletMonthlyBalance:
    """
    Retrieves the ledger for a specific wallet and month.
    If it doesn't exist, it creates it, carrying over the closing balance 
    from the previous month as the opening balance.
    """
    ledger = db.query(models.WalletMonthlyBalance).filter(
        models.WalletMonthlyBalance.wallet_id == wallet_id,
        models.WalletMonthlyBalance.month == month_str
    ).first()
    
    if ledger:
        return ledger

    prev_month_str = get_previous_month(month_str)
    
    # Try to find previous month record
    prev_ledger = db.query(models.WalletMonthlyBalance).filter(
        models.WalletMonthlyBalance.wallet_id == wallet_id,
        models.WalletMonthlyBalance.month == prev_month_str
    ).first()
    
    opening_balance = 0.0
    
    if prev_ledger:
        opening_balance = prev_ledger.closing_balance
        
    new_ledger = models.WalletMonthlyBalance(
        wallet_id=wallet_id,
        month=month_str,
        opening_balance=opening_balance,
        total_income=0.0,
        total_expense=0.0,
        total_transfers_in=0.0,
        total_transfers_out=0.0,
        closing_balance=opening_balance
    )
    db.add(new_ledger)
    db.commit()
    db.refresh(new_ledger)
    return new_ledger

def update_ledger_totals(db: Session, ledger: models.WalletMonthlyBalance):
    """
    Recalculates totals for a single ledger entry based on actual transactions
    and upates closing balance.
    """
    dt = datetime.strptime(ledger.month, "%Y-%m")
    start_date = dt.replace(day=1)
    # Get first day of next month
    next_month = (start_date + timedelta(days=32)).replace(day=1)
    
    total_income = db.query(func.sum(models.Income.amount)).filter(
        models.Income.wallet_id == ledger.wallet_id,
        models.Income.date >= start_date,
        models.Income.date < next_month
    ).scalar() or 0.0
    
    total_expense = db.query(func.sum(models.Expense.amount)).filter(
        models.Expense.wallet_id == ledger.wallet_id,
        models.Expense.date >= start_date,
        models.Expense.date < next_month
    ).scalar() or 0.0
    
    total_transfers_in = db.query(func.sum(models.WalletTransfer.amount)).filter(
        models.WalletTransfer.target_wallet_id == ledger.wallet_id,
        models.WalletTransfer.date >= start_date,
        models.WalletTransfer.date < next_month
    ).scalar() or 0.0

    total_transfers_out = db.query(func.sum(models.WalletTransfer.amount)).filter(
        models.WalletTransfer.source_wallet_id == ledger.wallet_id,
        models.WalletTransfer.date >= start_date,
        models.WalletTransfer.date < next_month
    ).scalar() or 0.0
    
    ledger.total_income = total_income
    ledger.total_expense = total_expense
    ledger.total_transfers_in = total_transfers_in
    ledger.total_transfers_out = total_transfers_out
    
    ledger.closing_balance = (
        ledger.opening_balance + 
        total_income - 
        total_expense + 
        total_transfers_in - 
        total_transfers_out
    )
    
    db.commit()
    db.refresh(ledger)
    return ledger

def cascade_recalculation(db: Session, wallet_id: int, start_month_str: str):
    """
    Recalculates balances starting from start_month_str and propagating to future months.
    """
    current_month_str = start_month_str
    max_months = 120 # Safety limit
    count = 0
    
    while count < max_months:
        ledger = get_or_create_monthly_balance(db, wallet_id, current_month_str)
        
        if count > 0:
            prev_month = get_previous_month(current_month_str)
            prev_ledger = db.query(models.WalletMonthlyBalance).filter(
                models.WalletMonthlyBalance.wallet_id == wallet_id,
                models.WalletMonthlyBalance.month == prev_month
            ).first()
            if prev_ledger:
                ledger.opening_balance = prev_ledger.closing_balance
            else:
                ledger.opening_balance = 0.0
        
        update_ledger_totals(db, ledger)
        
        # Check ahead
        next_month_str = get_next_month(current_month_str)
        next_exists = db.query(models.WalletMonthlyBalance).filter(
            models.WalletMonthlyBalance.wallet_id == wallet_id,
            models.WalletMonthlyBalance.month == next_month_str
        ).first()
        
        if not next_exists:
            break
            
        current_month_str = next_month_str
        count += 1

def close_month(db: Session, month_str: str):
    """
    Closes the month-end for all wallets.
    """
    ledgers = db.query(models.WalletMonthlyBalance).filter(
        models.WalletMonthlyBalance.month == month_str,
        models.WalletMonthlyBalance.is_closed == False
    ).all()
    
    for ledger in ledgers:
        update_ledger_totals(db, ledger) 
        ledger.is_closed = True
        
        # Initialize next month
        next_month = get_next_month(month_str)
        get_or_create_monthly_balance(db, ledger.wallet_id, next_month)
    
    db.commit()
