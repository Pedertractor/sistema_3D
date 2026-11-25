-- Tempo de processo (minutos) informado ao marcar a falha de impressão.
-- AlterTable
ALTER TABLE "PrintFailure" ADD COLUMN "processMinutes" INTEGER;
