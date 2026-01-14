-- CreateEnum
CREATE TYPE "DueType" AS ENUM ('GIVE', 'TAKE');

-- CreateEnum
CREATE TYPE "DueStatus" AS ENUM ('PENDING', 'SETTLED');

-- CreateTable
CREATE TABLE "DueTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletId" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "type" "DueType" NOT NULL,
    "status" "DueStatus" NOT NULL DEFAULT 'PENDING',
    "personName" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "settledAt" TIMESTAMP(3),

    CONSTRAINT "DueTransaction_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DueTransaction" ADD CONSTRAINT "DueTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DueTransaction" ADD CONSTRAINT "DueTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
