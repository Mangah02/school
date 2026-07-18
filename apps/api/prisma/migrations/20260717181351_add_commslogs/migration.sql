-- CreateTable
CREATE TABLE "message_logs" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "recipient_type" TEXT NOT NULL,
    "recipient_id" TEXT,
    "recipient_contact" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "provider_message_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "message_logs_school_id_channel_created_at_idx" ON "message_logs"("school_id", "channel", "created_at");

-- AddForeignKey
ALTER TABLE "message_logs" ADD CONSTRAINT "message_logs_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
