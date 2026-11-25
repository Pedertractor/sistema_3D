-- Estimativa da prototipagem por peça (os totais continuam em estimatedGrams/estimatedMinutes).
-- AlterTable
ALTER TABLE "PrintRequest" ADD COLUMN     "estimatedGramsPerUnit" INTEGER,
ADD COLUMN     "estimatedMinutesPerUnit" INTEGER;

