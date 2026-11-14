-- AlterTable
ALTER TABLE "Attachment" ADD COLUMN     "byPatient" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PatientProfile" ADD COLUMN     "address" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "emergencyName" TEXT,
ADD COLUMN     "emergencyPhone" TEXT,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "insuranceName" TEXT,
ADD COLUMN     "job" TEXT,
ADD COLUMN     "referralSource" TEXT;

-- Birth dates are now stored as ISO dates; free text from the first version cannot be converted.
UPDATE "PatientProfile" SET "birthDate" = NULL WHERE "birthDate" IS NOT NULL AND "birthDate" !~ '^\d{4}-\d{2}-\d{2}$';

-- The old staff-only "medicalHistory" becomes the clinical notes.
ALTER TABLE "PatientRecord" RENAME COLUMN "medicalHistory" TO "clinicalNotes";

-- AlterTable
ALTER TABLE "PatientRecord" ADD COLUMN     "asaClass" TEXT,
ADD COLUMN     "brushing" TEXT,
ADD COLUMN     "cariesRisk" TEXT,
ADD COLUMN     "chiefComplaint" TEXT,
ADD COLUMN     "concerns" TEXT[],
ADD COLUMN     "conditions" TEXT[],
ADD COLUMN     "conditionsNote" TEXT,
ADD COLUMN     "consentAt" TIMESTAMP(3),
ADD COLUMN     "dentalAnxiety" TEXT,
ADD COLUMN     "diagnosis" TEXT,
ADD COLUMN     "extraoral" TEXT,
ADD COLUMN     "fileNo" SERIAL NOT NULL,
ADD COLUMN     "fileStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "flossing" TEXT,
ADD COLUMN     "habits" TEXT[],
ADD COLUMN     "internalNote" TEXT,
ADD COLUMN     "lastDentalVisit" TEXT,
ADD COLUMN     "occlusion" TEXT,
ADD COLUMN     "patientNotes" TEXT,
ADD COLUMN     "periodontal" TEXT,
ADD COLUMN     "plaque" TEXT,
ADD COLUMN     "pregnancy" TEXT,
ADD COLUMN     "recallAt" TEXT,
ADD COLUMN     "smoking" TEXT,
ADD COLUMN     "softTissue" TEXT,
ADD COLUMN     "tmj" TEXT;

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LedgerEntry_recordId_createdAt_idx" ON "LedgerEntry"("recordId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PatientRecord_fileNo_key" ON "PatientRecord"("fileNo");

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "PatientRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
