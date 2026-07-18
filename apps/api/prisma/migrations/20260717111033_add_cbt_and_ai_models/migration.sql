-- CreateTable
CREATE TABLE "cbt_exams" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "total_marks" DOUBLE PRECISION NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "cbt_exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cbt_questions" (
    "id" TEXT NOT NULL,
    "exam_id" TEXT NOT NULL,
    "question_text" TEXT NOT NULL,
    "question_type" TEXT NOT NULL,
    "options" JSONB,
    "correct_answer" TEXT,
    "marks" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "rubric" TEXT,

    CONSTRAINT "cbt_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cbt_sessions" (
    "id" TEXT NOT NULL,
    "exam_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "cbt_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cbt_answers" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "student_answer" TEXT NOT NULL,
    "client_updated_at" TIMESTAMP(3) NOT NULL,
    "server_updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cbt_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cbt_proctoring_logs" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" JSONB,

    CONSTRAINT "cbt_proctoring_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cbt_sessions_exam_id_student_id_key" ON "cbt_sessions"("exam_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "cbt_answers_session_id_question_id_key" ON "cbt_answers"("session_id", "question_id");

-- AddForeignKey
ALTER TABLE "cbt_exams" ADD CONSTRAINT "cbt_exams_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cbt_exams" ADD CONSTRAINT "cbt_exams_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cbt_questions" ADD CONSTRAINT "cbt_questions_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "cbt_exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cbt_sessions" ADD CONSTRAINT "cbt_sessions_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "cbt_exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cbt_sessions" ADD CONSTRAINT "cbt_sessions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cbt_answers" ADD CONSTRAINT "cbt_answers_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "cbt_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cbt_answers" ADD CONSTRAINT "cbt_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "cbt_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cbt_proctoring_logs" ADD CONSTRAINT "cbt_proctoring_logs_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "cbt_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
