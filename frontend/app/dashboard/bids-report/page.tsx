'use client';

import { useState, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Card } from '@mui/material';
import { applyCommission } from '@/utils/commission';
import { BidData, SavedReport } from '@/types/types';
import { FileUploader } from '@/app/_components/report/FileUploader';
import { ResultsPreview } from '@/app/_components/report/ResultsPreview';
import { ReportHistory } from '@/app/_components/report/ReportHistory';
import { SnackbarAlert } from '@/app/_components/report/SnackbarAlert';

export default function BidReportGenerator() {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info',
  });
  const [results, setResults] = useState<BidData[]>([]);
  const [commissionApplied, setCommissionApplied] = useState(false);
  const [historyDate, setHistoryDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [commissionAmount, setCommissionAmount] = useState(4); 

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
      setCommissionApplied(false);
    }
  };

  const parseExcel = useCallback(async (file: File): Promise<BidData[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result as ArrayBuffer;
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          const jsonData: (string | number | undefined)[][] = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1, 
            range: 1 
          });
          
          const parsedData: BidData[] = jsonData
            .filter(row => row.length >= 7)
            .map(row => ({
              listingId: String(row[0]),
              oem: String(row[1] || ''),
              sku: String(row[2] || ''),
              description: String(row[3] || ''),
              disposition: String(row[4] || ''),
              quantity: Number(row[5]) || 0,
              unitPrice: Number(row[6]) || 0,
              fileName: file.name,
              commissionAmount: 0,
            }))
            .filter(item => item.unitPrice > 0);
          
          resolve(parsedData);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('File reading failed'));
      reader.readAsArrayBuffer(file);
    });
  }, []);

const handleApplyCommission = useCallback(() => {
  setResults(prevResults => 
    prevResults.map(item => ({
      ...item,
      unitPrice: applyCommission(item.unitPrice, commissionAmount),
      commissionAmount: commissionAmount // Add this line to update the commission amount
    }))
  );
  setCommissionApplied(true);
  setSnackbar({
    open: true,
    message: `Commission of $${commissionAmount} subtracted from all bids`,
    severity: 'success'
  });
}, [commissionAmount]);

  const processFiles = async () => {
    if (files.length === 0) {
      showSnackbar('Please select at least one file', 'warning');
      return;
    }

    setProcessing(true);
    
    try {
      const allData = await Promise.all(files.map(parseExcel));
      const combinedData = allData.flat();
      
      const aggregated = combinedData.reduce((acc: Record<string, BidData>, item) => {
        const existing = acc[item.listingId];
        
        if (!existing || item.unitPrice > existing.unitPrice) {
          acc[item.listingId] = item;
        }
        
        return acc;
      }, {});
      
      const highestBids = Object.values(aggregated);
      setResults(highestBids);
      setCommissionApplied(false);
      
      showSnackbar(
        `Processed ${files.length} files. Found ${highestBids.length} highest bids.`,
        'success'
      );
    } catch (error) {
      console.error('Processing error:', error);
      showSnackbar(
        'Failed to process files. Please check file formats.',
        'error'
      );
    } finally {
      setProcessing(false);
    }
  };

  const generateReport = () => {
    if (results.length === 0) {
      showSnackbar('No data to generate report', 'warning');
      return;
    }

    try {
      const reportData = results.map(item => ({
        'Listing Id': item.listingId,
        'OEM': item.oem,
        'SKU': item.sku,
        'Description': item.description,
        'Disposition': item.disposition,
        'Quantity': item.quantity,
      'Unit_Offer_Price': commissionApplied 
        ? applyCommission(item.unitPrice, commissionAmount) 
        : item.unitPrice,
      'Sales Customer': item.fileName,
    }));

      const worksheet = XLSX.utils.json_to_sheet(reportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Highest Bids');
      
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      saveAs(blob, `Highest_Bids_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
      
    } catch (error) {
      console.error('Report generation error:', error);
      showSnackbar('Failed to generate report', 'error');
    }
  };

const saveReportToBackend = async () => {
  if (results.length === 0) {
    showSnackbar('No data to save', 'warning');
    return;
  }

  try {
    const reportData = {
      report_date: historyDate,
      report_data: results // Use the current results state which should include commissionAmount
    };

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const response = await fetch(`${apiUrl}/api/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reportData),
    });

    if (!response.ok) throw new Error('Failed to save report');

    showSnackbar('Report saved successfully!', 'success');
    loadReportsFromBackend();
  } catch (error) {
    console.error('Save error:', error);
    showSnackbar('Failed to save report', 'error');
  }
};

  const loadReportsFromBackend = useCallback(async () => {
    try {
      setLoadingHistory(true);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(`${apiUrl}/api/reports?date=${historyDate}`);

      if (!response.ok) throw new Error('Failed to load reports');
      
      const data = await response.json();
      setSavedReports(data);
    } catch (error) {
      console.error('Load error:', error);
      showSnackbar('Failed to load reports', 'error');
    } finally {
      setLoadingHistory(false);
    }
  }, [historyDate]);

const loadReportData = (report: SavedReport) => {
  // Ensure commissionAmount is properly set when loading from DB
  const reportDataWithCommission = report.report_data.map((item: BidData) => ({
    ...item,
    commissionAmount: item.commissionAmount || 0
  }));
  
  setResults(reportDataWithCommission);
  
  // Check if any commission was applied
  const hasCommission = reportDataWithCommission.some(item => item.commissionAmount > 0);
  setCommissionApplied(hasCommission);
  
  showSnackbar(
    `Report from ${new Date(report.created_at).toLocaleString()} loaded`,
    'success'
  );
};

  const showSnackbar = (
    message: string, 
    severity: 'success' | 'error' | 'warning' | 'info'
  ) => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  useEffect(() => {
    if (historyDate) {
      loadReportsFromBackend();
    }
  }, [historyDate, loadReportsFromBackend]);

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Bid Report Generator</h1>
      
      <Card className="p-6 mb-6 shadow-lg">
        <FileUploader 
          files={files}
          processing={processing}
          onFileChange={handleFileChange}
          onClearFiles={() => setFiles([])}
          onProcessFiles={processFiles}
        />

          {/* <div className="mt-4">
          <TextField
            label="Commission Amount ($)"
            type="number"
            value={commissionAmount}
            onChange={(e) => setCommissionAmount(Number(e.target.value))}
            variant="outlined"
            size="small"
          />
        </div> */}
      </Card>

      {results.length > 0 && (
        <ResultsPreview 
          results={results}
          commissionApplied={commissionApplied}
          commissionAmount={commissionAmount}
          setCommissionAmount={setCommissionAmount}
          onApplyCommission={handleApplyCommission}
          onSaveReport={saveReportToBackend}
          onGenerateReport={generateReport}
          processing={processing}
        />
      )}

      <ReportHistory 
        historyDate={historyDate}
        savedReports={savedReports}
        loadingHistory={loadingHistory}
        onDateChange={setHistoryDate}
        onRefresh={loadReportsFromBackend}
        onLoadReport={loadReportData}
      />

      <SnackbarAlert 
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={handleCloseSnackbar}
      />
    </div>
  );
}