-- Renomeia "Plug" para "Item" preservando os dados (tabelas, colunas, chaves e índices).

-- Tabelas
ALTER TABLE "Plug" RENAME TO "Item";
ALTER TABLE "PlugPartNumber" RENAME TO "ItemPartNumber";

-- Colunas
ALTER TABLE "ItemPartNumber" RENAME COLUMN "plugId" TO "itemId";
ALTER TABLE "PrintRequest" RENAME COLUMN "plugId" TO "itemId";

-- Chaves primárias
ALTER TABLE "Item" RENAME CONSTRAINT "Plug_pkey" TO "Item_pkey";
ALTER TABLE "ItemPartNumber" RENAME CONSTRAINT "PlugPartNumber_pkey" TO "ItemPartNumber_pkey";

-- Chaves estrangeiras
ALTER TABLE "Item" RENAME CONSTRAINT "Plug_originRequestId_fkey" TO "Item_originRequestId_fkey";
ALTER TABLE "ItemPartNumber" RENAME CONSTRAINT "PlugPartNumber_plugId_fkey" TO "ItemPartNumber_itemId_fkey";
ALTER TABLE "PrintRequest" RENAME CONSTRAINT "PrintRequest_plugId_fkey" TO "PrintRequest_itemId_fkey";

-- Índices
ALTER INDEX "Plug_code_key" RENAME TO "Item_code_key";
ALTER INDEX "Plug_originRequestId_key" RENAME TO "Item_originRequestId_key";
ALTER INDEX "PlugPartNumber_partNumber_idx" RENAME TO "ItemPartNumber_partNumber_idx";
ALTER INDEX "PlugPartNumber_plugId_partNumber_key" RENAME TO "ItemPartNumber_itemId_partNumber_key";
