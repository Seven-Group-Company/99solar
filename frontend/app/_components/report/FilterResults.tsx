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

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  // const exportToExcel = () => {
  //   const worksheet = XLSX.utils.json_to_sheet(
  //     bids.map(bid => ({
  //       'Listing Id': bid.listingId,
  //       'OEM': bid.oem,
  //       'SKU': bid.sku,
  //       'Description': bid.description,
  //       'Disposition': bid.disposition,
  //       'Quantity': bid.quantity,
  //       'Unit Awarded Price': bid.commissionAmount
  //         ? bid.unitPrice + (bid.commissionAmount ?? null)
  //         : bid.unitPrice,
  //       'File Name': bid.fileName,
  //     }))
  //   );
    
  //   const workbook = XLSX.utils.book_new();
  //   XLSX.utils.book_append_sheet(workbook, worksheet, 'Filtered Bids');
    
  //   const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  //   const blob = new Blob([excelBuffer], { 
  //     type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  //   });
    
  //   saveAs(blob, `Filtered_Bids_${date}.xlsx`);
  // };

  const exportToCSV = () => {
    const csvData = bids.map(bid => ({
      'Listing Id': bid.listingId,
      'OEM': bid.oem,
      'SKU': bid.sku,
      'Description': bid.description,
      'Disposition': bid.disposition,
      'Quantity': bid.quantity,
'Unit Awarded Price':
  typeof bid.unitPrice === 'number' && typeof bid.commissionAmount === 'number'
    ? bid.unitPrice + bid.commissionAmount
    : null,
      'File Name': bid.fileName,
    }));

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
        
        <div className="flex gap-2">
          {/* <Button
            variant="contained"
            color="success"
            onClick={exportToExcel}
          >
            Export to Excel
          </Button> */}
          <Button
            variant="outlined"
            color="primary"
            onClick={exportToCSV}
          >
            Export to CSV
          </Button>
        </div>
      </div>
      
      <div className="overflow-y-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Listing Id
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                OEM
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Unit Price ($)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Commission ($)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Final Price ($)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantity
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {bids
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((bid, index) => {
                // Only calculate finalPrice if unitPrice is a number
                const hasPrice = typeof bid.unitPrice === 'number' && !isNaN(bid.unitPrice);
                const hasCommission = typeof bid.commissionAmount === 'number' && hasPrice;
                const finalPrice = hasPrice && hasCommission
                  ? bid.unitPrice + (bid.commissionAmount ?? 0)
                  : null;
          
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
                      {finalPrice !== null ? `$${finalPrice.toFixed(2)}` : ''}
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