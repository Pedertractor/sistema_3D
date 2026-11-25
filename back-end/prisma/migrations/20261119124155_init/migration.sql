-- CreateEnum
CREATE TYPE "Unit" AS ENUM ('PEDERTRACTOR', 'TRACTOR');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'OPERATOR');

-- CreateEnum
CREATE TYPE "FilamentCategory" AS ENUM ('RIGIDO_PRETO', 'RIGIDO_COLORIDO', 'MALEAVEL_PRETO');

-- CreateEnum
CREATE TYPE "FilamentMovementType" AS ENUM ('ESTOQUE_INICIAL', 'ENTRADA', 'CONSUMO_IMPRESSAO', 'PERDA_FALHA', 'ESTORNO', 'AJUSTE');

-- CreateEnum
CREATE TYPE "MachineStatus" AS ENUM ('DISPONIVEL', 'IMPRIMINDO', 'MANUTENCAO', 'INATIVA');

-- CreateEnum
CREATE TYPE "RequestType" AS ENUM ('PROTOTIPAGEM', 'PRODUCAO');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('AGUARDANDO_IMPRESSAO', 'EM_IMPRESSAO', 'FALHA_IMPRESSAO', 'PAUSADO', 'FINALIZADO', 'AGUARDANDO_FILAMENTO', 'CANCELADO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" "Unit" NOT NULL,
    "cardNumber" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'OPERATOR',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Filament" (
    "id" TEXT NOT NULL,
    "category" "FilamentCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "almxCode" TEXT NOT NULL,
    "stockGrams" INTEGER NOT NULL DEFAULT 0,
    "minStockGrams" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Filament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilamentMovement" (
    "id" TEXT NOT NULL,
    "filamentId" TEXT NOT NULL,
    "type" "FilamentMovementType" NOT NULL,
    "grams" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "note" TEXT,
    "requestId" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FilamentMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Machine" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "model" TEXT,
    "notes" TEXT,
    "status" "MachineStatus" NOT NULL DEFAULT 'DISPONIVEL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Machine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plug" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "FilamentCategory" NOT NULL,
    "gramsPerUnit" INTEGER NOT NULL,
    "printMinutesPerUnit" INTEGER NOT NULL,
    "unitsPerPrint" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "originRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plug_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlugPartNumber" (
    "id" TEXT NOT NULL,
    "plugId" TEXT NOT NULL,
    "partNumber" TEXT NOT NULL,
    "partDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlugPartNumber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrintRequest" (
    "id" TEXT NOT NULL,
    "trackingCode" TEXT NOT NULL,
    "type" "RequestType" NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'AGUARDANDO_IMPRESSAO',
    "requesterName" TEXT NOT NULL,
    "requesterEmail" TEXT,
    "requesterSector" TEXT,
    "itemName" TEXT,
    "description" TEXT,
    "partNumber" TEXT,
    "partDescription" TEXT,
    "plugId" TEXT,
    "category" "FilamentCategory" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "estimatedGrams" INTEGER,
    "estimatedMinutes" INTEGER,
    "consumedGrams" INTEGER NOT NULL DEFAULT 0,
    "machineId" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrintRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestAttachment" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrintFailure" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "machineId" TEXT,
    "userId" TEXT,
    "lostGrams" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrintFailure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestStatusHistory" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "fromStatus" "RequestStatus",
    "toStatus" "RequestStatus" NOT NULL,
    "note" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_cardNumber_unit_key" ON "User"("cardNumber", "unit");

-- CreateIndex
CREATE UNIQUE INDEX "Filament_category_key" ON "Filament"("category");

-- CreateIndex
CREATE INDEX "FilamentMovement_filamentId_createdAt_idx" ON "FilamentMovement"("filamentId", "createdAt");

-- CreateIndex
CREATE INDEX "FilamentMovement_requestId_idx" ON "FilamentMovement"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "Machine_name_key" ON "Machine"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Plug_code_key" ON "Plug"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Plug_originRequestId_key" ON "Plug"("originRequestId");

-- CreateIndex
CREATE INDEX "PlugPartNumber_partNumber_idx" ON "PlugPartNumber"("partNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PlugPartNumber_plugId_partNumber_key" ON "PlugPartNumber"("plugId", "partNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PrintRequest_trackingCode_key" ON "PrintRequest"("trackingCode");

-- CreateIndex
CREATE INDEX "PrintRequest_status_createdAt_idx" ON "PrintRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PrintRequest_type_idx" ON "PrintRequest"("type");

-- CreateIndex
CREATE INDEX "PrintRequest_partNumber_idx" ON "PrintRequest"("partNumber");

-- CreateIndex
CREATE INDEX "PrintFailure_requestId_idx" ON "PrintFailure"("requestId");

-- CreateIndex
CREATE INDEX "RequestStatusHistory_requestId_createdAt_idx" ON "RequestStatusHistory"("requestId", "createdAt");

-- AddForeignKey
ALTER TABLE "FilamentMovement" ADD CONSTRAINT "FilamentMovement_filamentId_fkey" FOREIGN KEY ("filamentId") REFERENCES "Filament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilamentMovement" ADD CONSTRAINT "FilamentMovement_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PrintRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilamentMovement" ADD CONSTRAINT "FilamentMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plug" ADD CONSTRAINT "Plug_originRequestId_fkey" FOREIGN KEY ("originRequestId") REFERENCES "PrintRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlugPartNumber" ADD CONSTRAINT "PlugPartNumber_plugId_fkey" FOREIGN KEY ("plugId") REFERENCES "Plug"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintRequest" ADD CONSTRAINT "PrintRequest_plugId_fkey" FOREIGN KEY ("plugId") REFERENCES "Plug"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintRequest" ADD CONSTRAINT "PrintRequest_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestAttachment" ADD CONSTRAINT "RequestAttachment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PrintRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintFailure" ADD CONSTRAINT "PrintFailure_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PrintRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintFailure" ADD CONSTRAINT "PrintFailure_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintFailure" ADD CONSTRAINT "PrintFailure_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestStatusHistory" ADD CONSTRAINT "RequestStatusHistory_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PrintRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestStatusHistory" ADD CONSTRAINT "RequestStatusHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
