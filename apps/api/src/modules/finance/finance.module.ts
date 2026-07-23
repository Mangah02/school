// apps/api/src/modules/finance/finance.module.ts
import { Module } from '@nestjs/common';
import { FinanceController } from './finance.controller';
import { InvoicingService } from './invoicing.service';
import { FeeStructureService } from './fee-structure.service'; // ✅ Import it
import { ExpenseService } from './expense.service';           // ✅ Import other services you have
import { MpesaService } from './mpesa.service';               // ✅ Import other services you have
import { WaiverService } from './waiver.service';             // ✅ Import other services you have
import { ReconciliationService } from './reconciliation.service'; // ✅ Import other services you have
import { JournalService } from './journal.service';           // ✅ Import other services you have
import { ReconciliationController } from './reconciliation.controller';
import { WaiverController } from './waiver.controller';



@Module({
  controllers: [FinanceController, ReconciliationController, WaiverController],
  providers: [
    InvoicingService,
    FeeStructureService, // ✅ MUST be listed here for FinanceController to inject it
    ExpenseService,
    MpesaService,
    WaiverService,
    ReconciliationService,
    JournalService,
  ],
})
export class FinanceModule {}