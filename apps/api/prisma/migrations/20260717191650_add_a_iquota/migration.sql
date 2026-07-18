-- CreateTable
CREATE TABLE "ai_quota_alerts" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "alerted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_quota_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_quota_alerts_school_id_month_year_key" ON "ai_quota_alerts"("school_id", "month", "year");

-- AddForeignKey
ALTER TABLE "ai_quota_alerts" ADD CONSTRAINT "ai_quota_alerts_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
