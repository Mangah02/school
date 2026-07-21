// apps/api/src/modules/student/student.module.ts
import { Module } from '@nestjs/common';
import { StudentController } from './student.controller';
import { StudentsService } from './student.service';

@Module({
  controllers: [StudentController],
  providers: [StudentsService], // PrismaService and Bull Queues are injected automatically!
})
export class StudentModule {}