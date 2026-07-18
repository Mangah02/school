/*
  Warnings:

  - Added the required column `updated_at` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Made the column `mpesa_state` on table `payments` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "merchant_request_id" TEXT,
ADD COLUMN     "phone_number" TEXT,
ADD COLUMN     "result_code" INTEGER,
ADD COLUMN     "result_desc" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "mpesa_state" SET NOT NULL,
ALTER COLUMN "mpesa_state" SET DEFAULT 'INITIATED',
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "payments_school_id_checkout_request_id_idx" ON "payments"("school_id", "checkout_request_id");
