-- Períodos de uso de cada máquina (base do tempo de operação e do histórico da máquina).

-- CreateTable
CREATE TABLE "MachineRun" (
    "id" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "userId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "outcome" "RequestStatus",

    CONSTRAINT "MachineRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MachineRun_machineId_startedAt_idx" ON "MachineRun"("machineId", "startedAt");

-- CreateIndex
CREATE INDEX "MachineRun_requestId_idx" ON "MachineRun"("requestId");

-- AddForeignKey
ALTER TABLE "MachineRun" ADD CONSTRAINT "MachineRun_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineRun" ADD CONSTRAINT "MachineRun_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PrintRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineRun" ADD CONSTRAINT "MachineRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Preenche o passado a partir do histórico de status: cada entrada em "Imprimindo" vira um período,
-- encerrado pela mudança de status seguinte da mesma solicitação. O histórico não guarda a máquina,
-- então usa a máquina atual da solicitação (aproximação para quem trocou de máquina no meio).
INSERT INTO "MachineRun" ("id", "machineId", "requestId", "userId", "startedAt", "endedAt", "outcome")
SELECT gen_random_uuid()::text, r."machineId", h."requestId", h."userId", h."createdAt", h."nextAt", h."nextStatus"
FROM (
    SELECT
        "requestId",
        "userId",
        "createdAt",
        "toStatus",
        LEAD("createdAt") OVER (PARTITION BY "requestId" ORDER BY "createdAt") AS "nextAt",
        LEAD("toStatus") OVER (PARTITION BY "requestId" ORDER BY "createdAt") AS "nextStatus"
    FROM "RequestStatusHistory"
) h
JOIN "PrintRequest" r ON r."id" = h."requestId"
WHERE h."toStatus" = 'EM_IMPRESSAO' AND r."machineId" IS NOT NULL;
