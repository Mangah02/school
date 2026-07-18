// apps/api/src/modules/ai/ai.controller.ts 
import { Controller, Get } from '@nestjs/common';
import { AiQuotaService } from './ai-quota.service';
import { Permissions } from '../../core/guards/permissions.decorator';
import { ApiTags } from '@nestjs/swagger';
import { tenantStorage } from '../../core/tenant/tenant.context';

@ApiTags('AI Governance')
@Controller('ai')
export class AiController {
  constructor(private readonly quotaService: AiQuotaService) {}

  @Get('quota')
  @Permissions('ai:quota:view') // Only Admin/DPO can view AI spend
  async getQuotaStatus() {
    const context = tenantStorage.getStore();
    // Mock an estimated cost of 0 just to check current state
    const result = await this.quotaService.checkAndEnforceQuota(context.schoolId, 0);
    return {
      monthly_cap_kes: 5000,
      current_spend_kes: result.currentSpend,
      remaining_kes: 5000 - result.currentSpend,
      is_degraded: result.allowedProvider === 'OLLAMA'
    };
  }
}