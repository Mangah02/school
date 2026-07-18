-- CreateTable
CREATE TABLE "dormitories" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "warden_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dormitories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beds" (
    "id" TEXT NOT NULL,
    "dormitory_id" TEXT NOT NULL,
    "room_number" TEXT NOT NULL,
    "bed_number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,

    CONSTRAINT "beds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bed_assignments" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "bed_id" TEXT NOT NULL,
    "academic_year_id" TEXT NOT NULL,
    "check_in_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "check_out_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "bed_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roll_calls" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "dormitory_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "time" TIMESTAMP(3) NOT NULL,
    "session" TEXT NOT NULL,
    "marked_by" TEXT NOT NULL,

    CONSTRAINT "roll_calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roll_call_records" (
    "id" TEXT NOT NULL,
    "roll_call_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "roll_call_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact_person" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "unit_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reorder_level" INTEGER NOT NULL DEFAULT 5,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requisitions" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "requested_by" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "justification" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "requisitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "requisition_id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "total_amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "order_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_items" (
    "id" TEXT NOT NULL,
    "purchase_order_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_cost" DOUBLE PRECISION NOT NULL,
    "received_quantity" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "beds_dormitory_id_room_number_bed_number_key" ON "beds"("dormitory_id", "room_number", "bed_number");

-- CreateIndex
CREATE UNIQUE INDEX "bed_assignments_student_id_academic_year_id_key" ON "bed_assignments"("student_id", "academic_year_id");

-- CreateIndex
CREATE UNIQUE INDEX "roll_call_records_roll_call_id_student_id_key" ON "roll_call_records"("roll_call_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_school_id_sku_key" ON "inventory_items"("school_id", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_requisition_id_key" ON "purchase_orders"("requisition_id");

-- AddForeignKey
ALTER TABLE "dormitories" ADD CONSTRAINT "dormitories_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dormitories" ADD CONSTRAINT "dormitories_warden_id_fkey" FOREIGN KEY ("warden_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beds" ADD CONSTRAINT "beds_dormitory_id_fkey" FOREIGN KEY ("dormitory_id") REFERENCES "dormitories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bed_assignments" ADD CONSTRAINT "bed_assignments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bed_assignments" ADD CONSTRAINT "bed_assignments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bed_assignments" ADD CONSTRAINT "bed_assignments_bed_id_fkey" FOREIGN KEY ("bed_id") REFERENCES "beds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roll_calls" ADD CONSTRAINT "roll_calls_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roll_calls" ADD CONSTRAINT "roll_calls_dormitory_id_fkey" FOREIGN KEY ("dormitory_id") REFERENCES "dormitories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roll_call_records" ADD CONSTRAINT "roll_call_records_roll_call_id_fkey" FOREIGN KEY ("roll_call_id") REFERENCES "roll_calls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roll_call_records" ADD CONSTRAINT "roll_call_records_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisitions" ADD CONSTRAINT "requisitions_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisitions" ADD CONSTRAINT "requisitions_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisitions" ADD CONSTRAINT "requisitions_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisitions" ADD CONSTRAINT "requisitions_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_requisition_id_fkey" FOREIGN KEY ("requisition_id") REFERENCES "requisitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
