-- Filamentos livres (tipo, cor, rigidez, foto) no lugar das 3 categorias fixas.
-- Itens e solicitações passam a apontar para um filamento. Escrita com as tabelas de filamento, itens e solicitações vazias.

-- CreateEnum
CREATE TYPE "FilamentRigidity" AS ENUM ('RIGIDO', 'MALEAVEL');

-- DropIndex
DROP INDEX "Filament_category_key";

-- AlterTable
ALTER TABLE "Filament" DROP COLUMN "category",
DROP COLUMN "name",
ADD COLUMN     "colorHex" TEXT NOT NULL,
ADD COLUMN     "colorName" TEXT NOT NULL,
ADD COLUMN     "imageMimeType" TEXT,
ADD COLUMN     "imageStoredName" TEXT,
ADD COLUMN     "rigidity" "FilamentRigidity" NOT NULL,
ADD COLUMN     "type" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Item" DROP COLUMN "category",
ADD COLUMN     "filamentId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "PrintRequest" DROP COLUMN "category",
ADD COLUMN     "filamentId" TEXT NOT NULL;

-- DropEnum
DROP TYPE "FilamentCategory";

-- CreateIndex
CREATE UNIQUE INDEX "Filament_type_colorName_key" ON "Filament"("type", "colorName");

-- CreateIndex
CREATE INDEX "PrintRequest_filamentId_status_idx" ON "PrintRequest"("filamentId", "status");

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_filamentId_fkey" FOREIGN KEY ("filamentId") REFERENCES "Filament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintRequest" ADD CONSTRAINT "PrintRequest_filamentId_fkey" FOREIGN KEY ("filamentId") REFERENCES "Filament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

