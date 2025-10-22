'use client';

import { useState, useCallback, useEffect } from 'react';
import { saveAs } from 'file-saver';
import { Card, IconButton, CircularProgress } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { parseCSV, generateXLSX } from '@/utils/csvParser';
import { DateSelector } from '@/app/_components/awarding/DateSelector';
import { FileUploader } from '@/app/_components/awarding/FileUploader';
import { ReportPreview } from '@/app/_components/awarding/ReportPreview';
import { SnackbarAlert } from '../components/SnackbarAlert';

interface ReportData {
  listingId: string;
  oem: string;
  sku: string;
  description: string;
  disposition: string;
  quantity: number;
  unitPrice: number;
  unitAwardedPrice?: number;
  fileName: string;
}

interface SavedReport {
  id: number;
  created_at: string;
  report_date: string;
  report_data: ReportData[];
}

interface AwardedBid {
  listingId: string;
  oem: string;
  sku: string;
  prop65Warning: string;
  description: string;
  disposition: string;
  quantity: number;
  unitAwardedPrice: number;
  fileName: string;
}

export default function Awarding() {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info',
  });
  const [historyDate, setHistoryDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [sourceFileReports, setSourceFileReports] = useState<Record<string, AwardedBid[]>>({});

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1000';

  const showSnackbar = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const handleCloseSnackbar = useCallback(() => {
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);

  // ✅ Load saved reports for selected date
  const loadSavedReports = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const response = await fetch(`${apiUrl}/api/reports/latest?date=${historyDate}`);
      if (!response.ok) throw new Error('Failed to load reports');
      const data: SavedReport[] = await response.json();
      setSavedReports(data);
      showSnackbar(`Loaded ${data.length} report(s) for ${new Date(historyDate).toLocaleDateString()}`, 'success');
    } catch (error) {
      console.error(error);
      showSnackbar('Error loading reports', 'error');
    } finally {
      setLoadingHistory(false);
    }
  }, [historyDate, showSnackbar, apiUrl]);

  // ✅ Delete report from database
  const handleDeleteReport = useCallback(async (reportId: number) => {
    if (!confirm('Are you sure you want to delete this report?')) return;

    try {
      const response = await fetch(`${apiUrl}/api/reports/${reportId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Delete failed');
      setSavedReports(prev => prev.filter(r => r.id !== reportId));
      showSnackbar('Report deleted successfully', 'success');
    } catch (error) {
      console.error(error);
      showSnackbar('Failed to delete report', 'error');
    }
  }, [apiUrl, showSnackbar]);

  // ✅ Process awarded CSVs
  const processAwardedFiles = useCallback(async () => {
    if (files.length === 0) {
      showSnackbar('Please select at least one awarded CSV file', 'warning');
      return;
    }

    if (savedReports.length === 0) {
      showSnackbar('No saved reports found. Load reports first.', 'warning');
      return;
    }

    setProcessing(true);

    try {
      const awardedDataMap: Record<string, AwardedBid> = {};

      for (const file of files) {
        const awardedItems = await parseCSV(file);
        awardedItems.forEach((item: Record<string, unknown>) => {
          const listingId = String(item['Listing Id']);
          awardedDataMap[listingId] = {
            listingId,
            oem: String(item['OEM'] || ''),
            sku: String(item['SKU'] || ''),
            prop65Warning: String(item['Prop65 Warning'] || ''),
            description: String(item['Description'] || ''),
            disposition: String(item['Disposition'] || ''),
            quantity: Number(item['Quantity']) || 0,
            unitAwardedPrice: Number(item['Unit Awarded Price']) || 0,
            fileName: file.name,
          };
        });
      }

      const sourceFileData: Record<string, AwardedBid[]> = {};
      const internalBids: AwardedBid[] = [];

      savedReports.forEach(report => {
        report.report_data.forEach(item => {
          const awardedItem = awardedDataMap[item.listingId];
          if (awardedItem) {
            if (!awardedItem.unitAwardedPrice || awardedItem.unitAwardedPrice <= 0) {
              internalBids.push({ ...awardedItem, fileName: 'Internal' });
            } else {
              if (!sourceFileData[item.fileName]) sourceFileData[item.fileName] = [];
              sourceFileData[item.fileName].push({ ...awardedItem });
            }
          } else {
            internalBids.push({
              listingId: item.listingId,
              oem: item.oem,
              sku: item.sku,
              prop65Warning: '',
              description: item.description,
              disposition: item.disposition,
              quantity: item.quantity,
              unitAwardedPrice: 0,
              fileName: 'Internal',
            });
          }
        });
      });

      if (internalBids.length > 0) {
        sourceFileData['Internal'] = internalBids;
      }

      setSourceFileReports(sourceFileData);
      showSnackbar(`Processed ${files.length} file(s) successfully`, 'success');
    } catch (error) {
      console.error('Processing error:', error);
      showSnackbar('Failed to process files', 'error');
    } finally {
      setProcessing(false);
    }
  }, [files, savedReports, showSnackbar]);

  // ✅ Generate reports for each source file
  const generateSourceFileReports = useCallback(() => {
    if (Object.keys(sourceFileReports).length === 0) {
      showSnackbar('No source file data to export', 'warning');
      return;
    }

    try {
      Object.entries(sourceFileReports).forEach(([sourceFile, data]) => {
        const formattedData = data.map(item => ({
          'Listing ID': item.listingId,
          'OEM': item.oem,
          'SKU': item.sku,
          'Description': item.description,
          'Disposition': item.disposition,
          'Quantity': item.quantity,
          'Unit Awarded Price ($)': item.unitAwardedPrice,
          'Sales Customer': sourceFile,
        }));

        const { blob, fileName } = generateXLSX(formattedData, sourceFile, historyDate);
        saveAs(blob, fileName);
      });

      showSnackbar('Reports generated successfully', 'success');
    } catch (error) {
      console.error('Generation error:', error);
      showSnackbar('Error generating reports', 'error');
    }
  }, [sourceFileReports, historyDate, showSnackbar]);

  // ✅ Auto-load data when date changes
  useEffect(() => {
    loadSavedReports();
  }, [loadSavedReports]);

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Awarded Bids Processor</h1>

      <Card className="p-6 mb-6 shadow-lg">
        <DateSelector
          date={historyDate}
          loading={loadingHistory}
          onDateChange={setHistoryDate}
          onLoadReports={loadSavedReports}
        />

        {loadingHistory ? (
          <div className="flex items-center gap-3 text-gray-600 mt-4">
            <CircularProgress size={24} />
            <span>Loading reports...</span>
          </div>
        ) : (
          savedReports.length > 0 && (
            <div className="mt-4 space-y-2">
              <h2 className="font-semibold text-gray-700">Loaded Reports:</h2>
              {savedReports.map(report => (
                <div
                  key={report.id}
                  className="flex justify-between items-center border rounded p-2 bg-gray-50 hover:bg-gray-100"
                >
                  <span>{new Date(report.created_at).toLocaleString()} — {report.report_data.length} items</span>
                  <IconButton color="error" onClick={() => handleDeleteReport(report.id)}>
                    <DeleteIcon />
                  </IconButton>
                </div>
              ))}
            </div>
          )
        )}

        <FileUploader
          files={files}
          processing={processing}
          onFileChange={(e) => e.target.files && setFiles(Array.from(e.target.files))}
          onProcessFiles={processAwardedFiles}
          onClearFiles={() => setFiles([])}
        />
      </Card>

      {Object.keys(sourceFileReports).length > 0 && (
        <ReportPreview
          sourceFileReports={sourceFileReports}
          processing={processing}
          onGenerateReports={generateSourceFileReports}
        />
      )}

      <SnackbarAlert
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={handleCloseSnackbar}
      />
    </div>
  );
}