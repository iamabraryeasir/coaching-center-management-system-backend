-- CreateTable
CREATE TABLE "teacher_attendance_records" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "markedById" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "checkInTime" TIMESTAMP(3),
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teacher_attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "teacher_attendance_records_teacherId_idx" ON "teacher_attendance_records"("teacherId");

-- CreateIndex
CREATE INDEX "teacher_attendance_records_date_idx" ON "teacher_attendance_records"("date");

-- CreateIndex
CREATE INDEX "teacher_attendance_records_status_idx" ON "teacher_attendance_records"("status");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_attendance_records_teacherId_date_key" ON "teacher_attendance_records"("teacherId", "date");

-- AddForeignKey
ALTER TABLE "teacher_attendance_records" ADD CONSTRAINT "teacher_attendance_records_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_attendance_records" ADD CONSTRAINT "teacher_attendance_records_markedById_fkey" FOREIGN KEY ("markedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
