export interface BidData {
  listingId: string;
  oem: string;
  sku: string;
  description: string;
  disposition: string;
  quantity: number;
  unitPrice: number | null;
  fileName: string;
  commissionAmount?: number;
}

export interface SavedReport {
  id: number;
  report_date: string;
  report_data: BidData[];
  created_at: string;
}