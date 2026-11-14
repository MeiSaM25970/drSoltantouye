ALTER TABLE "GalleryItem" ADD COLUMN "externalId" TEXT;

CREATE UNIQUE INDEX "GalleryItem_externalId_key" ON "GalleryItem"("externalId");
