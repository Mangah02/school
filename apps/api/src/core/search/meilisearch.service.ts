// apps/api/src/core/search/meilisearch.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MeiliSearch, Index } from 'meilisearch';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MeilisearchService implements OnModuleInit {
  private readonly logger = new Logger(MeilisearchService.name);
  private client: MeiliSearch;
  private studentIndex: Index;
  private staffIndex: Index;
  private bookIndex: Index;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.client = new MeiliSearch({
      host: this.configService.get<string>('MEILISEARCH_HOST') || 'http://localhost:7700',
      apiKey: this.configService.get<string>('MEILISEARCH_MASTER_KEY'),
    });
  }

  async onModuleInit() {
    try {
      // Initialize or get existing indexes
      this.studentIndex = await this.client.index('students');
      this.staffIndex = await this.client.index('staff');
      this.bookIndex = await this.client.index('books');
      
      this.logger.log('MeiliSearch indexes initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize MeiliSearch indexes', error.message);
    }
  }

  async indexStudent(student: any) {
    const document = {
      id: student.id,
      school_id: student.school_id,
      admission_number: student.admission_number,
      first_name: student.first_name,
      last_name: student.last_name,
      gender: student.gender,
      class: student.stream?.class?.name || 'Unassigned',
    };
    await this.studentIndex.addDocuments([document], { primaryKey: 'id' });
  }

  async deleteStudent(studentId: string) {
    await this.studentIndex.deleteDocument(studentId);
  }

  async indexStaff(staff: any) {
    const document = {
      id: staff.id,
      school_id: staff.school_id,
      employee_id: staff.employee_id,
      first_name: staff.first_name,
      last_name: staff.last_name,
      role: staff.user?.role?.name || 'Staff',
    };
    await this.staffIndex.addDocuments([document], { primaryKey: 'id' });
  }

  async indexBook(book: any) {
    const document = {
      id: book.id,
      school_id: book.school_id,
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      category: book.category,
    };
    await this.bookIndex.addDocuments([document], { primaryKey: 'id' });
  }
}