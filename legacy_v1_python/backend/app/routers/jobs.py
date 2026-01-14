from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from backend.database.database import SessionLocal, get_db
from backend.app import ledger, auth
from backend.database import models
from sqlalchemy.orm import Session

router = APIRouter(
    prefix="/jobs",
    tags=["jobs"],
)

def run_month_close(month_str: str):
    db = SessionLocal()
    try:
        ledger.close_month(db, month_str)
    finally:
        db.close()

def run_recalculation(wallet_id: int, start_month: str):
    db = SessionLocal()
    try:
        ledger.cascade_recalculation(db, wallet_id, start_month)
    finally:
        db.close()

@router.post("/close-month")
def trigger_month_close(month_str: str, background_tasks: BackgroundTasks, current_user: models.User = Depends(auth.get_current_user)):
    # In production, verify admin status
    background_tasks.add_task(run_month_close, month_str)
    return {"status": "accepted", "message": f"Month close for {month_str} scheduled"}

@router.post("/recalculate")
def trigger_recalculation(wallet_id: int, start_month: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    wallet = db.query(models.Wallet).filter(models.Wallet.id == wallet_id, models.Wallet.user_id == current_user.id).first()
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")

    background_tasks.add_task(run_recalculation, wallet_id, start_month)
    return {"status": "accepted", "message": "Recalculation scheduled"}
