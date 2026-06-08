-- Lead Distribution Portal — Initial Migration
-- Run: npx prisma migrate deploy  (production)
-- Run: npx prisma migrate dev --name init  (development, auto-generates this)

-- CreateEnum
CREATE TYPE "BudgetRange" AS ENUM ('UNDER_10K', 'BETWEEN_10K_50K', 'GREATER_50K');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('PENDING', 'PROCESSING', 'SYNCED', 'FAILED');

-- CreateEnum
CREATE TYPE "HubSpotSyncStatus" AS ENUM ('PENDING', 'SYNCED', 'FAILED');

-- CreateTable: Lead
CREATE TABLE "Lead" (
    "id"               TEXT NOT NULL,
    "firstName"        TEXT NOT NULL,
    "lastName"         TEXT NOT NULL,
    "email"            TEXT NOT NULL,
    "companyName"      TEXT NOT NULL,
    "budgetRange"      "BudgetRange" NOT NULL,
    "status"           "LeadStatus" NOT NULL DEFAULT 'PENDING',
    "hubspotContactId" TEXT,
    "hubspotCompanyId" TEXT,
    "hubspotStatus"    "HubSpotSyncStatus" NOT NULL DEFAULT 'PENDING',
    "hubspotError"     TEXT,
    "syncAttempts"     INTEGER NOT NULL DEFAULT 0,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Settings (singleton)
CREATE TABLE "Settings" (
    "id"                  TEXT NOT NULL DEFAULT 'singleton',
    "hubspotAccessToken"  TEXT,
    "hubspotRefreshToken" TEXT,
    "hubspotTokenExpiry"  TIMESTAMP(3),
    "hubspotConnected"    BOOLEAN NOT NULL DEFAULT false,
    "lastSyncAt"          TIMESTAMP(3),
    "updatedAt"           TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique email per lead
CREATE UNIQUE INDEX "Lead_email_key" ON "Lead"("email");

-- CreateIndex: for efficient filtering on status fields
CREATE INDEX "Lead_status_idx" ON "Lead"("status");
CREATE INDEX "Lead_hubspotStatus_idx" ON "Lead"("hubspotStatus");
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");
