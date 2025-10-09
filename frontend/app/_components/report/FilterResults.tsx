'use client';

import { useState } from 'react';
import { Button, Card, TablePagination } from '@mui/material';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

interface BidData {
  listingId: string;
  oem: string;
  sku: string;
  description: string;
  disposition: string;
  quantity: number;
  unitPrice: number;
  fileName: string;
  commissionAmount?: number | null;
}

interface FilterResultsProps {
  bids: BidData[];
  date: string;
}

export const FilterResults = ({ bids, date }: FilterResultsProps) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleChangePage = (_: unknown, newPage: number) => setPage(newPage);
  const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  // Example: extract price from uploaded file name or external source
function extractPriceFromFile(fileName: string): number | null {
  // Example: if filename contains price e.g. "Lot82377_45.32.csv"
  const match = fileName.match(/(\d+(\.\d+)?)/);
  return match ? parseFloat(match[0]) : null;
}


const exportToCSV = () => {
  const csvData = bids
    .map(bid => {
      // Use uploaded file price when unitPrice is 0 or null
      const baseUnitPrice =
        bid.unitPrice && bid.unitPrice > 0
          ? bid.unitPrice
          : extractPriceFromFile(bid.fileName); // fallback logic

      const unitAwardedPrice =
        typeof baseUnitPrice === 'number' && typeof bid.commissionAmount === 'number'
          ? baseUnitPrice + bid.commissionAmount
          : baseUnitPrice ?? null;

      return {
        'Listing Id': bid.listingId,
        'OEM': bid.oem,
        'SKU': bid.sku,
        'Description': bid.description,
        'Disposition': bid.disposition,
        'Quantity': bid.quantity,
        'Unit Awarded Price': unitAwardedPrice,
        'File Name': bid.fileName,
      };
    })
    .filter(row => row['Unit Awarded Price'] && row['Unit Awarded Price'] !== 0);

  const worksheet = XLSX.utils.json_to_sheet(csvData);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, `Filtered_Bids_${date}.csv`);
};


  return (
    <Card className="p-6 shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">
          Filtered Results ({bids.length} Bids)
        </h2>
        <Button variant="outlined" color="primary" onClick={exportToCSV}>
          Export to CSV
        </Button>
      </div>

      <div className="overflow-y-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Listing Id</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">OEM</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Price ($)</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commission ($)</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Final Price ($)</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {bids
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((bid, index) => {
                const hasPrice = typeof bid.unitPrice === 'number' && !isNaN(bid.unitPrice);
                const hasCommission = typeof bid.commissionAmount === 'number' && hasPrice;
                const finalPrice =
                  hasPrice && hasCommission ? bid.unitPrice + (bid.commissionAmount ?? 0) : null;

                return (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 text-sm text-gray-900">{bid.listingId}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{bid.oem}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{bid.description}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {hasPrice ? `$${bid.unitPrice.toFixed(2)}` : ''}
                    </td>
                    <td className="px-4 py-3 text-sm text-red-600">
                      {hasCommission ? `$${bid.commissionAmount!.toFixed(2)}` : ''}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-green-600">
                      {finalPrice !== null && finalPrice > 0 ? `$${finalPrice.toFixed(2)}` : ''}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{bid.quantity}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <TablePagination
        component="div"
        count={bids.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[5, 10, 25, 50]}
        className="border-t"
      />
    </Card>
  );
};
