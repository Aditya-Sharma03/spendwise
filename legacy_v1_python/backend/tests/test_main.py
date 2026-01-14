from fastapi.testclient import TestClient
from backend.main import app
import pytest
import time

client = TestClient(app)

test_email = f"test_{int(time.time())}@example.com"
test_password = "password123"

def test_register_login():
    # Register
    res = client.post("/auth/register", json={"email": test_email, "password": test_password})
    if res.status_code == 400:
        pass
    else:
        assert res.status_code == 200
    
    # Login
    res = client.post("/auth/login", data={"username": test_email, "password": test_password})
    assert res.status_code == 200
    token = res.json()["access_token"]
    return token

def test_full_flow():
    token = test_register_login()
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get Wallets
    res = client.get("/wallets/", headers=headers)
    assert res.status_code == 200
    wallets = res.json()
    assert len(wallets) >= 2
    cash_wallet = next(w for w in wallets if w["type"] == "CASH")
    bank_wallet = next(w for w in wallets if w["type"] == "BANK")
    
    # Add Income (Jan)
    res = client.post("/transactions/income", json={
        "wallet_id": cash_wallet["id"],
        "amount": 1000.0,
        "date": "2025-01-01T00:00:00",
        "category": "Salary"
    }, headers=headers)
    assert res.status_code == 200
    
    # Add Expense (Jan)
    res = client.post("/transactions/expense", json={
        "wallet_id": cash_wallet["id"],
        "amount": 200.0,
        "date": "2025-01-02T00:00:00",
        "category": "Food"
    }, headers=headers)
    assert res.status_code == 200
    
    # Overdraft Check
    res = client.post("/transactions/expense", json={
        "wallet_id": cash_wallet["id"],
        "amount": 1000.0, 
        "date": "2025-01-03T00:00:00",
        "category": "Food"
    }, headers=headers)
    assert res.status_code == 400
    
    # Transfer (Jan)
    res = client.post("/transactions/transfer", json={
        "source_wallet_id": cash_wallet["id"],
        "target_wallet_id": bank_wallet["id"],
        "amount": 100.0,
        "date": "2025-01-04T00:00:00"
    }, headers=headers)
    assert res.status_code == 200
    
    # Verify Balances (Jan)
    res = client.get("/dashboard/summary?month=2025-01", headers=headers)
    data = res.json()
    assert abs(data["cash"]["closing"] - 700.0) < 0.01
    assert abs(data["bank"]["closing"] - 100.0) < 0.01

    # Verify Auto-Creation / Rollover (Feb)
    res = client.get("/dashboard/summary?month=2025-02", headers=headers)
    data = res.json()
    # Opening for Feb should match Closing Jan
    assert abs(data["cash"]["opening"] - 700.0) < 0.01
    assert abs(data["bank"]["opening"] - 100.0) < 0.01
