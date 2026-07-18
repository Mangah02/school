-- CreateTable
CREATE TABLE "school_subscriptions" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "plan_tier" TEXT NOT NULL DEFAULT 'BASIC',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "grace_period_ends_at" TIMESTAMP(3),
    "external_customer_id" TEXT,
    "payment_method" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "school_subscriptions_school_id_key" ON "school_subscriptions"("school_id");

-- AddForeignKey
ALTER TABLE "school_subscriptions" ADD CONSTRAINT "school_subscriptions_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
