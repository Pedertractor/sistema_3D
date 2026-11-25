-- Solicitante identificado pelo cartão + unidade (API corporativa), com centro de custo.
-- AlterTable
ALTER TABLE "PrintRequest" ADD COLUMN     "requesterCardNumber" TEXT,
ADD COLUMN     "requesterCostCenter" TEXT,
ADD COLUMN     "requesterUnit" "Unit";

