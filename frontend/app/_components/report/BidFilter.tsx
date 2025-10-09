'use client';

import { useState } from 'react';
import { Button, Card, TextField } from '@mui/material';
import { FileUploader } from '@/app/_components/report/FileUploader';
import { FilterResults } from '@/app/_components/report/FilterResults';
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
  commissionAmount?: number;
}

export const BidFilter = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [filterDate, setFilterDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [filteredBids, setFilteredBids] = useState<BidData[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      // Avoid duplicate files by name
      const uniqueFiles = newFiles.filter(
        file => !files.some(f => f.name === file.name)
      );
      setFiles(prev => [...prev, ...uniqueFiles]);
    }
  };

  const parseFile = async (file: File): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          let jsonData: Record<string, unknown>[];

          const workbook = file.name.endsWith('.csv')
            ? XLSX.read(data as string, { type: 'string' })
            : XLSX.read(data as ArrayBuffer, { type: 'array' });

          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          jsonData = XLSX.utils.sheet_to_json(worksheet);

          // Extract valid listing IDs
          const listingIds = Array.from(
            new Set(
              jsonData
                .map(row => row['Listing Id'] || row['ListingId'] || row['listingId'])
                .filter(Boolean)
                .map(id => String(id).trim())
            )
          );

          resolve(listingIds);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('File reading failed'));
      file.name.endsWith('.csv') ? reader.readAsText(file) : reader.readAsArrayBuffer(file);
    });
  };

  const filterBids = async () => {
    if (files.length === 0) {
      alert('Please select at least one file');
      return;
    }

    setLoading(true);

    try {
      // Extract listing IDs from all uploaded files
      const allListingIds = await Promise.all(files.map(parseFile));
      const listingIds = Array.from(new Set(allListingIds.flat()));

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/filter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingIds, date: filterDate }),
      });

      if (!response.ok) throw new Error('Failed to filter bids');
      const data = await response.json();

      // Remove duplicate bids with same listingId for the same date
      const uniqueBids = Array.from(
        new Map(
          (data.bids as BidData[]).map(bid => [`${bid.listingId}_${filterDate}`, bid])
        ).values()
      );

      setFilteredBids(uniqueBids);
    } catch (error) {
      console.error('Filter error:', error);
      alert('Failed to filter bids. Please check file formats and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 shadow-lg">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Filter Bids by Listing ID
        </h2>

        <FileUploader
          files={files}
          processing={loading}
          onFileChange={handleFileChange}
          onClearFiles={() => setFiles([])}
          onProcessFiles={filterBids}
          accept=".csv,.xlsx,.xls"
        />

        <div className="mt-4">
          <TextField
            label="Report Date"
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            variant="outlined"
            size="small"
            InputLabelProps={{ shrink: true }}
          />
        </div>

        <Button
          variant="contained"
          color="primary"
          onClick={filterBids}
          disabled={loading || files.length === 0}
          className="mt-4"
        >
          {loading ? 'Filtering...' : 'Filter Bids'}
        </Button>
      </Card>

      {filteredBids.length > 0 && (
        <FilterResults
          bids={filteredBids}
          date={filterDate}
        />
      )}
    </div>
  );
};
