-- CreateTable
CREATE TABLE "books" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "isbn" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "total_copies" INTEGER NOT NULL DEFAULT 1,
    "available_copies" INTEGER NOT NULL DEFAULT 1,
    "is_digital" BOOLEAN NOT NULL DEFAULT false,
    "file_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,

    CONSTRAINT "books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_loans" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "borrow_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_date" TIMESTAMP(3) NOT NULL,
    "return_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'BORROWED',
    "fine_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drivers" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "license_number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buses" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "registration_number" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "driver_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,

    CONSTRAINT "buses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transport_routes" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "bus_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_point" TEXT NOT NULL,
    "end_point" TEXT NOT NULL,
    "estimated_time" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,

    CONSTRAINT "transport_routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bus_assignments" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "route_id" TEXT NOT NULL,
    "pickup_point" TEXT NOT NULL,
    "dropoff_point" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bus_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "books_barcode_key" ON "books"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "books_school_id_isbn_key" ON "books"("school_id", "isbn");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_license_number_key" ON "drivers"("license_number");

-- CreateIndex
CREATE UNIQUE INDEX "buses_registration_number_key" ON "buses"("registration_number");

-- CreateIndex
CREATE UNIQUE INDEX "bus_assignments_student_id_route_id_key" ON "bus_assignments"("student_id", "route_id");

-- AddForeignKey
ALTER TABLE "books" ADD CONSTRAINT "books_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_loans" ADD CONSTRAINT "book_loans_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_loans" ADD CONSTRAINT "book_loans_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_loans" ADD CONSTRAINT "book_loans_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buses" ADD CONSTRAINT "buses_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buses" ADD CONSTRAINT "buses_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_routes" ADD CONSTRAINT "transport_routes_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_routes" ADD CONSTRAINT "transport_routes_bus_id_fkey" FOREIGN KEY ("bus_id") REFERENCES "buses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bus_assignments" ADD CONSTRAINT "bus_assignments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bus_assignments" ADD CONSTRAINT "bus_assignments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bus_assignments" ADD CONSTRAINT "bus_assignments_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "transport_routes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
