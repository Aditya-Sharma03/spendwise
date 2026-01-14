from fastapi import FastAPI
from backend.database import models
from backend.database.database import engine
from backend.app.routers import auth, transactions, jobs, dashboard, wallets, stats, insights

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="SpendWise API")
app.include_router(auth.router)
app.include_router(transactions.router)
app.include_router(jobs.router)
app.include_router(dashboard.router)
app.include_router(wallets.router)
app.include_router(stats.router)
app.include_router(insights.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to SpendWise Backend"}
