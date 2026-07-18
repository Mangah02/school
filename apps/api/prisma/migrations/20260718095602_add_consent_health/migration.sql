-- CreateTable
CREATE TABLE "consent_records" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "data_subject_id" TEXT NOT NULL,
    "data_category" TEXT NOT NULL,
    "consent_granted" BOOLEAN NOT NULL DEFAULT true,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "evidence_url" TEXT,

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_records" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "allergies" TEXT NOT NULL,
    "chronic_conditions" TEXT NOT NULL,
    "current_medications" TEXT NOT NULL,
    "consent_record_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medical_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinic_visits" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "medical_record_id" TEXT NOT NULL,
    "visit_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "symptoms" TEXT NOT NULL,
    "diagnosis" TEXT,
    "treatment" TEXT NOT NULL,
    "nurse_notes" TEXT,
    "attended_by" TEXT NOT NULL,

    CONSTRAINT "clinic_visits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "consent_records_data_subject_id_data_category_revoked_at_idx" ON "consent_records"("data_subject_id", "data_category", "revoked_at");

-- CreateIndex
CREATE UNIQUE INDEX "medical_records_student_id_key" ON "medical_records"("student_id");

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinic_visits" ADD CONSTRAINT "clinic_visits_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinic_visits" ADD CONSTRAINT "clinic_visits_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinic_visits" ADD CONSTRAINT "clinic_visits_medical_record_id_fkey" FOREIGN KEY ("medical_record_id") REFERENCES "medical_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
