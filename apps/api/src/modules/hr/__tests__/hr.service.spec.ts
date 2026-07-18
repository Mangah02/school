// apps/api/src/modules/hr/__tests__/hr.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { HrService } from '../hr.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { EncryptionService } from '../../../core/security/encryption.service';
import { BadRequestException } from '@nestjs/common';
import { tenantStorage } from '../../../core/tenant/tenant.context';

describe('HrService - PII Encryption & TSC Validation (7.9)', () => {
  let service: HrService;
  let prisma: PrismaService;
  let encryption: EncryptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HrService,
        { provide: PrismaService, useValue: {
          user: { findUnique: jest.fn() },
          staff: { count: jest.fn(), create: jest.fn() },
        }},
        { provide: EncryptionService, useValue: { 
          encrypt: jest.fn().mockReturnValue('encrypted_data'), 
          decrypt: jest.fn().mockReturnValue('decrypted_data') 
        }},
      ],
    }).compile();

    service = module.get<HrService>(HrService);
    prisma = module.get<PrismaService>(PrismaService);
    encryption = module.get<EncryptionService>(EncryptionService);
    tenantStorage.enterWith({ schoolId: 'sch-1', userId: 'user-1' });
  });

  it('should throw BadRequestException if TSC number is provided for a non-teacher', async () => {
    jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({ id: 'u1', role: { name: 'librarian' } } as any);

    const dto = { user_id: 'u1', tsc_number: 'TSC123', national_id: '12345678', date_of_birth: '1990-01-01', date_joined: '2023-01-01', first_name: 'John', last_name: 'Doe', gender: 'M', phone: '07', email: 'a@a.com', basic_salary: 50000, employment_type: 'PERMANENT' };
    
    await expect(service.createStaff(dto as any, 'admin-1')).rejects.toThrow(BadRequestException);
  });

  it('should encrypt PII (KRA, NSSF, Bank) before saving to database', async () => {
    jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({ id: 'u1', role: { name: 'teacher' } } as any);
    jest.spyOn(prisma.staff, 'count').mockResolvedValue(0);
    jest.spyOn(prisma.staff, 'create').mockResolvedValue({ id: 'staff-1' } as any);

    const dto = { 
      user_id: 'u1', tsc_number: 'TSC123', national_id: '12345678', 
      kra_pin: 'KRA123', nssf_number: 'NSSF123', bank_account: '1234567890',
      date_of_birth: '1990-01-01', date_joined: '2023-01-01', 
      first_name: 'John', last_name: 'Doe', gender: 'M', phone: '07', email: 'a@a.com', 
      basic_salary: 50000, employment_type: 'PERMANENT' 
    };
    
    await service.createStaff(dto as any, 'admin-1');

    expect(encryption.encrypt).toHaveBeenCalledWith('12345678'); // National ID
    expect(encryption.encrypt).toHaveBeenCalledWith('KRA123');
    expect(encryption.encrypt).toHaveBeenCalledWith('NSSF123');
    expect(encryption.encrypt).toHaveBeenCalledWith('1234567890');
    
    expect(prisma.staff.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        national_id: 'encrypted_data',
        kra_pin: 'encrypted_data',
      })
    }));
  });
});