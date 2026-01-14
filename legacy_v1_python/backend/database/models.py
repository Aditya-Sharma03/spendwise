from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    wallets = relationship("Wallet", back_populates="user")

class Wallet(Base):
    __tablename__ = "wallets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String) # e.g., "Main Cash", "Main Bank"
    type = Column(String) # "CASH" or "BANK"

    user = relationship("User", back_populates="wallets")
    monthly_balances = relationship("WalletMonthlyBalance", back_populates="wallet")
    incomes = relationship("Income", back_populates="wallet")
    expenses = relationship("Expense", back_populates="wallet")
    
    # For transfers, it's a bit complex with two foreign keys to the same table.
    # We'll define relationships on the Transfer model mostly.

class WalletMonthlyBalance(Base):
    __tablename__ = "wallet_monthly_balances"

    id = Column(Integer, primary_key=True, index=True)
    wallet_id = Column(Integer, ForeignKey("wallets.id"))
    month = Column(String) # Format: "YYYY-MM"
    
    opening_balance = Column(Float, default=0.0)
    total_income = Column(Float, default=0.0)
    total_expense = Column(Float, default=0.0)
    total_transfers_in = Column(Float, default=0.0)
    total_transfers_out = Column(Float, default=0.0)
    closing_balance = Column(Float, default=0.0)
    is_closed = Column(Boolean, default=False)

    wallet = relationship("Wallet", back_populates="monthly_balances")

    __table_args__ = (
        UniqueConstraint('wallet_id', 'month', name='unique_wallet_month'),
    )

class Income(Base):
    __tablename__ = "incomes"

    id = Column(Integer, primary_key=True, index=True)
    wallet_id = Column(Integer, ForeignKey("wallets.id"))
    amount = Column(Float)
    date = Column(DateTime)
    category = Column(String)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    wallet = relationship("Wallet", back_populates="incomes")

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    wallet_id = Column(Integer, ForeignKey("wallets.id"))
    amount = Column(Float)
    date = Column(DateTime)
    category = Column(String)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    wallet = relationship("Wallet", back_populates="expenses")

class WalletTransfer(Base):
    __tablename__ = "wallet_transfers"

    id = Column(Integer, primary_key=True, index=True)
    source_wallet_id = Column(Integer, ForeignKey("wallets.id"))
    target_wallet_id = Column(Integer, ForeignKey("wallets.id"))
    amount = Column(Float)
    date = Column(DateTime)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    source_wallet = relationship("Wallet", foreign_keys=[source_wallet_id])
    target_wallet = relationship("Wallet", foreign_keys=[target_wallet_id])
