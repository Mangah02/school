// apps/api/src/modules/finance/fee-structure.service.ts
import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common'; // ✅ Added UnauthorizedException
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateFeeStructureDto } from './dto/create-fee-structure.dto';
import { tenantStorage } from '../../core/tenant/tenant.context';

@Injectable()
export class FeeStructureService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateFeeStructureDto) {
    const context = tenantStorage.getStore();
    if (!context) throw new UnauthorizedException('Tenant context missing'); // ✅ Added guard clause
    
    // Calculate total amount from categories
    const totalAmount = dto.categories.reduce((sum, cat) => sum + cat.amount, 0);

    try {
      return await this.prisma.feeStructure.create({
        data: {
          school_id: context.schoolId,
          academic_year_id: dto.academic_year_id,
          term_id: dto.term_id,
          class_id: dto.class_id,
          name: dto.name,
          total_amount: totalAmount,
          categories: {
            create: dto.categories
          }
        },
        include: { categories: true }
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('A fee structure already exists for this class, term, and year');
      }
      throw error;
    }
  }
}