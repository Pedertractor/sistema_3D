-- Quantos itens vão em cada peça (partnumber) e, na produção, quantas peças foram pedidas.
-- AlterTable
ALTER TABLE "ItemPartNumber" ADD COLUMN     "quantityPerPart" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "PrintRequest" ADD COLUMN     "itemsPerPart" INTEGER,
ADD COLUMN     "partQuantity" INTEGER;
