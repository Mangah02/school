-- CreateTable
CREATE TABLE "fee_waivers" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "requested_by_id" TEXT NOT NULL,
    "approved_by_id" TEXT,
    "waiver_amount" DOUBLE PRECISION NOT NULL,
    "waiver_percent" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "required_approver" TEXT NOT NULL,
    "justification" TEXT NOT NULL,
    "rejection_reason" TEXT,
    "board_resolution_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fee_waivers_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "fee_waivers" ADD CONSTRAINT "fee_waivers_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_waivers" ADD CONSTRAINT "fee_waivers_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_waivers" ADD CONSTRAINT "fee_waivers_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_waivers" ADD CONSTRAINT "fee_waivers_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
