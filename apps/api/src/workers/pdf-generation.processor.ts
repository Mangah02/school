// apps/api/src/workers/pdf-generation.processor.ts
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import * as puppeteer from 'puppeteer';
import { StorageService } from '../core/storage/storage.service'; // MinIO wrapper

@Processor('pdf-generation')
export class PdfGenerationProcessor {
  private readonly logger = new Logger(PdfGenerationProcessor.name);

  constructor(private storageService: StorageService) {}

  @Process('generate-report-card')
  async handleReportCardGeneration(job: Job) {
    this.logger.log(`Generating report card for student ${job.data.student_id} (Job ${job.id})`);
    
    let browser: puppeteer.Browser | null = null;
    try {
      // Launch headless browser (using Docker-compatible flags)
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });

      const page = await browser.newPage();
      
      // Generate HTML from template (Using a simple template string here, 
      // in production use Handlebars/React-PDF with school branding)
      const html = this.generateHtmlTemplate(job.data);
      
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      // Generate PDF buffer
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' }
      });

      // Upload to MinIO
      const fileName = `reports/${job.data.school_id}/${job.data.exam_id}/${job.data.student_id}.pdf`;
      const url = await this.storageService.uploadBuffer(fileName, pdfBuffer, 'application/pdf');

      // Update student record or notification system with the new PDF URL
      // await this.prisma.reportCard.create(...)

      return { success: true, pdf_url: url };

    } catch (error) {
      this.logger.error(`Failed to generate report card for ${job.data.student_id}: ${error.message}`);
      throw error; // Bull will retry based on job config
    } finally {
      if (browser) await browser.close();
    }
  }

  private generateHtmlTemplate(data: any): string {
    // Simplified HTML for demonstration. 
    // In production, load a dynamic HTML template from DB/MinIO based on school settings.
    const rows = data.results.map((r: any) => `
      <tr>
        <td>${r.subject.name}</td>
        <td>${r.marks_obtained} / ${r.max_marks}</td>
        <td>${r.is_cbc_assessment ? r.cbc_rating : r.grade}</td>
        <td>${r.remarks || '-'}</td>
      </tr>
    `).join('');

    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .header { text-align: center; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>School Name</h1>
            <h2>Academic Report Card</h2>
          </div>
          <p><strong>Student:</strong> ${data.student_name} | <strong>Adm No:</strong> ${data.admission_number}</p>
          <table>
            <thead>
              <tr>
                <th>Subject</th>
                <th>Marks</th>
                <th>Grade / Rating</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </body>
      </html>
    `;
  }
}