
// apps/api/src/modules/student/student.module.ts
import { Module } from '@nestjs/common';
import { StudentController } from './student.controller';
import { StudentsService } from './student.service';
import { QueueModule } from '../../core/queue/queue.module'; // ✅ Import your QueueModule (adjust path if needed)

@Module({
  imports: [QueueModule], // ✅ Make Bull queues available to StudentsService
  controllers: [StudentController],
  providers: [StudentsService]
})
export class StudentModule {}