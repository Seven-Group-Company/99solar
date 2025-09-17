"use client";

import { useState } from 'react';
import { 
  Button, 
  TablePagination, 
  TextField
} from '@mui/material';
import EventNoteIcon from '@mui/icons-material/EventNote';
import PaidIcon from '@mui/icons-material/Paid';
import { applyCommission } from '@/utils/commission';

interface BidData {
  listingId: string;
  oem: string;
  sku: string;
  description: string;
  disposition: string;
  quantity: number;
  unitPrice: number;
  commissionAmount?: number;
  fileName: string;
}

interface ResultsPreviewProps {
  results: BidData[];
  commissionApplied: boolean;
  onApplyCommission: () => void;
  commissionAmount: number; 
  setCommissionAmount: (amount: number) => void;
  onSaveReport: () => void;
  onGenerateReport: () => void;
  processing: boolean;
}

export const ResultsPreview = ({
  results,
  commissionApplied,
  setCommissionAmount,
  commissionAmount,
  onApplyCommission,
  onSaveReport,
  onGenerateReport,
  processing
}: ResultsPreviewProps) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  return (
    <div className="p-6 shadow-lg mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">
          ({results.length} Highest Bids)
          {commissionApplied && <span className="ml-2 text-sm text-green-600">(Commission Applied)</span>}
        </h2>

                  <div className="mt-4">
                  <TextField
                    label="Commission Amount ($)"
                    value={commissionAmount}
                    onChange={(e) => setCommissionAmount(Number(e.target.value))}
                    variant="outlined"
                    size="small"
                  />
                </div>
        
        <div className="flex gap-2">
          <Button
            variant="contained"
            color="info"
            startIcon={<PaidIcon />}
            onClick={onApplyCommission}
            disabled={commissionApplied || results.length === 0}
          >
            Apply ${commissionAmount} Commission {/* Update button text */}
          </Button>
          
          <Button
            variant="contained"
            color="primary"
            startIcon={<EventNoteIcon />}
            onClick={onSaveReport}
            disabled={processing}
          >
            Save Report
          </Button>
          
          <Button
            variant="contained"
            color="success"
            onClick={onGenerateReport}
            disabled={processing || results.length === 0}
          >
            Download Report
          </Button>
        </div>
      </div>
      
      <div className="overflow-y-auto">
        <table className="min-w-full divide-y divide-gray-200">
<thead className="bg-gray-50">
  <tr>
    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Listing ID</th>
    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">OEM</th>
    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bid ($)</th>
    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commission ($)</th>
    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
  </tr>
</thead>
<tbody className="bg-white divide-y divide-gray-200">
  {results
    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
    .map((item, index) => (
    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
      <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">{item.listingId}</td>
      <td className="px-4 py-3 text-sm text-gray-500">{item.oem}</td>
      <td className="px-4 py-3 text-sm font-medium text-green-600">
        ${commissionApplied ? applyCommission(item.unitPrice) : item.unitPrice.toFixed(2)}
        {commissionApplied && <span className="ml-1 text-xs text-gray-500">(after commission)</span>}
      </td>
      <td className="px-4 py-3 text-sm text-red-600">
        ${item.commissionAmount || 0}
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">{item.quantity}</td>
    </tr>
  ))}
</tbody>
        </table>
      </div>
      
      <TablePagination
        component="div"
        count={results.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[5, 10, 25, 50]}
        className="border-t"
      />
    </div>
  );
};