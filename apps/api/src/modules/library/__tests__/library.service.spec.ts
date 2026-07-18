// apps/api/src/modules/library/__tests__/library.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { LibraryService } from '../library.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { tenantStorage } from '../../../core/tenant/tenant.context';

describe('LibraryService - Borrow & Return (9.1)', () => {
  let service: LibraryService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LibraryService,
        { provide: PrismaService, useValue: {
          book: { findFirst: jest.fn(), update: jest.fn() },
          bookLoan: { create: jest.fn() },
          $transaction: jest.fn().mockImplementation(async (cb) => cb(prisma)),
        }},
      ],
    }).compile();

    service = module.get<LibraryService>(LibraryService);
    prisma = module.get<PrismaService>(PrismaService);
    tenantStorage.enterWith({ schoolId: 'sch-1', userId: 'user-1' });
  });

  it('should throw BadRequestException if no copies are available', async () => {
    jest.spyOn(prisma.book, 'findFirst').mockResolvedValue({ id: 'b1', available_copies: 0 } as any);

    await expect(service.borrowBook('b1', 'stu-1', 14)).rejects.toThrow(BadRequestException);
  });

  it('should decrement available copies and create loan record on successful borrow', async () => {
    jest.spyOn(prisma.book, 'findFirst').mockResolvedValue({ id: 'b1', available_copies: 1 } as any);
    jest.spyOn(prisma.book, 'update').mockResolvedValue({} as any);
    jest.spyOn(prisma.bookLoan, 'create').mockResolvedValue({} as any);

    await service.borrowBook('b1', 'stu-1', 14);

    expect(prisma.book.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { available_copies: { decrement: 1 } }
    }));
  });
});