// apps/api/src/modules/hr/hr.service.ts
import { Injectable, BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common'; // ✅ Added UnauthorizedException
import { PrismaService } from '../../core/prisma/prisma.service';
import { EncryptionService } from '../../core/security/encryption.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { tenantStorage } from '../../core/tenant/tenant.context';

@Injectable()
export class HrService {
  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService,
  ) {}

  async createStaff(dto: CreateStaffDto, creatorUserId: string) {
    const context = tenantStorage.getStore();
    if (!context) throw new UnauthorizedException('Tenant context missing'); // ✅ Added guard

    // SRS 18.1: TSC number is ONLY applicable if the linked User's role is 'teacher'
    const user = await this.prisma.user.findUnique({ where: { id: dto.user_id }, include: { role: true } });
    if (!user) throw new BadRequestException('User not found');
    
    if (dto.tsc_number && user.role.name !== 'teacher') {
      throw new BadRequestException('TSC number can only be assigned to staff with the Teacher role');
    }
    if (!dto.tsc_number && user.role.name === 'teacher') {
      throw new BadRequestException('TSC number is mandatory for Teachers');
    }

    // Generate Employee ID: STF/YYYY/####
    const year = new Date().getFullYear();
    const staffCount = await this.prisma.staff.count({ where: { school_id: context.schoolId } });
    const employeeId = `STF/${year}/${String(staffCount + 1).padStart(4, '0')}`;

    // Encrypt PII (REQ-KDPA-008 / SRS 3.2)
    const encryptedNationalId = this.encryption.encrypt(dto.national_id);
    const encryptedKra = dto.kra_pin ? this.encryption.encrypt(dto.kra_pin) : null;
    const encryptedNssf = dto.nssf_number ? this.encryption.encrypt(dto.nssf_number) : null;
    const encryptedNhif = dto.nhif_number ? this.encryption.encrypt(dto.nhif_number) : null;
    const encryptedBank = dto.bank_account ? this.encryption.encrypt(dto.bank_account) : null;

    try {
      return await this.prisma.staff.create({
        data: {
          school_id: context.schoolId,
          user_id: dto.user_id,
          employee_id: employeeId,
          first_name: dto.first_name,
          last_name: dto.last_name,
          date_of_birth: new Date(dto.date_of_birth),
          gender: dto.gender,
          national_id: encryptedNationalId,
          phone: dto.phone,
          email: dto.email,
          tsc_number: dto.tsc_number,
          kra_pin: encryptedKra,
          nssf_number: encryptedNssf,
          nhif_number: encryptedNhif,
          bank_account: encryptedBank,
          basic_salary: dto.basic_salary,
          employment_type: dto.employment_type,
          date_joined: new Date(dto.date_joined),
        }
      });
    } catch (error: any) {
      if (error.code === 'P2002') throw new ConflictException('Employee ID or User already linked');
      throw error;
    }
  }

  async getStaffProfile(staffId: string) {
    const context = tenantStorage.getStore();
    if (!context) throw new UnauthorizedException('Tenant context missing'); // ✅ Added guard
    
    const staff = await this.prisma.staff.findFirst({
      where: { id: staffId, school_id: context.schoolId, is_deleted: false },
      include: { user: { select: { email: true, role: true } } }
    });
    if (!staff) throw new BadRequestException('Staff not found');

    // Decrypt PII for the response (Only HR/Admin should reach this endpoint)
    return {
      ...staff,
      national_id: this.encryption.decrypt(staff.national_id),
      kra_pin: staff.kra_pin ? this.encryption.decrypt(staff.kra_pin) : null,
      nssf_number: staff.nssf_number ? this.encryption.decrypt(staff.nssf_number) : null,
      nhif_number: staff.nhif_number ? this.encryption.decrypt(staff.nhif_number) : null,
      bank_account: staff.bank_account ? this.encryption.decrypt(staff.bank_account) : null,
    };
  }

    async getStaff(schoolId: string, role?: string) {
    return this.prisma.staff.findMany({
      where: {
        school_id: schoolId,
        is_deleted: false,
        // If a role is provided (e.g., 'teacher'), filter by the related User's role name
        user: role ? {
          role: {
            name: role,
          },
        } : undefined,
      },
      include: {
        user: {
          include: {
            role: true,
          },
        },
      },
      orderBy: { first_name: 'asc' },
    });
  }
}