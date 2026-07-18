-- CreateTable
CREATE TABLE "data_retention_policies" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "soft_delete_purge_days" INTEGER NOT NULL DEFAULT 90,
    "audit_log_retention_years" INTEGER NOT NULL DEFAULT 3,
    "alumni_data_retention_years" INTEGER NOT NULL DEFAULT 5,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_retention_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deletion_requests" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "requested_by_id" TEXT NOT NULL,
    "target_entity_type" TEXT NOT NULL,
    "target_entity_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "processed_by_id" TEXT,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deletion_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "data_retention_policies_school_id_key" ON "data_retention_policies"("school_id");

-- AddForeignKey
ALTER TABLE "data_retention_policies" ADD CONSTRAINT "data_retention_policies_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deletion_requests" ADD CONSTRAINT "deletion_requests_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
