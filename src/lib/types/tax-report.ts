// ─── Annual Tax Estimation Report Types (matches /api/reports/tax-annual response) ───

export interface MonthlyTaxBreakdown {
  month: number;         // 1..12
  month_name: string;    // e.g. "Januari"
  gross_revenue: number; // Omset bruto (Rp)
  tax_rate: number;      // e.g. 0.005 (0.5%)
  tax_payable: number;   // Pajak terutang (Rp)
}

export interface AnnualTaxReportData {
  tax_year: number;                           // e.g. 2026
  entity_type: string;                        // e.g. "CV"
  tax_type: string;                           // e.g. "PPh Final UMKM (PP 55/2022)"
  total_annual_revenue: number;               // Total omset tahunan (Rp)
  total_tax_payable: number;                  // Total pajak terutang (Rp)
  is_exceeds_threshold: boolean;              // false = di bawah Rp 4.8 M
  monthly_breakdowns: MonthlyTaxBreakdown[];  // 12 bulan
}

export interface AnnualTaxReportResponse {
  code?: number;
  status?: string;
  message?: string;
  data: AnnualTaxReportData;
}
