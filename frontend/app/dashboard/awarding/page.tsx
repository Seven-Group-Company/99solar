'use client';

import { useState, useCallback, useEffect } from 'react';
import { saveAs } from 'file-saver';
import { Card } from '@mui/material';
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

  const showSnackbar = useCallback((
    message: string, 
    severity: 'success' | 'error' | 'warning' | 'info'
  ) => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  }, []);

  const handleCloseSnackbar = useCallback(() => {
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);

  // Load saved reports from backend
  const loadSavedReports = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1000';
      const response = await fetch(`${apiUrl}/api/reports/latest?date=${historyDate}`);

      if (!response.ok) throw new Error('Failed to load reports');
      
      const data: SavedReport[] = await response.json();
      setSavedReports(data);
      
      showSnackbar(
        `Loaded ${data.length} reports for ${new Date(historyDate).toLocaleDateString()}`,
        'success'
      );
    } catch (error) {
      console.error('Load error:', error);
      showSnackbar('Failed to load reports', 'error');
    } finally {
      setLoadingHistory(false);
    }
  }, [historyDate, showSnackbar]);

  // Process awarded CSV files
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
      // Process all files and create a map of awarded data
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
            fileName: file.name
          };
        });
      }
      
      // Create a map to group by source file
      const sourceFileData: Record<string, AwardedBid[]> = {};
      
      // Process all saved reports
      savedReports.forEach(report => {
        report.report_data.forEach(item => {
          const awardedItem = awardedDataMap[item.listingId];
          
          if (awardedItem) {
            const sourceFile = item.fileName;
            
            if (!sourceFileData[sourceFile]) {
              sourceFileData[sourceFile] = [];
            }
            
            sourceFileData[sourceFile].push({
              listingId: item.listingId,
              oem: item.oem,
              sku: item.sku,
              prop65Warning: awardedItem.prop65Warning ?? '',
              description: item.description,
              disposition: item.disposition,
              quantity: item.quantity,
              unitAwardedPrice: awardedItem.unitAwardedPrice,
              fileName: item.fileName
            });
          }
        });
      });
      
      setSourceFileReports(sourceFileData);
      
      showSnackbar(
        `Processed ${files.length} files. Found ${Object.keys(sourceFileData).length} source files with matching bids.`,
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
  }, [files, savedReports, showSnackbar]);

  // Generate XLSX reports for each source file
  const generateSourceFileReports = useCallback(() => {
    if (Object.keys(sourceFileReports).length === 0) {
      showSnackbar('No source file data to generate reports', 'warning');
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

      showSnackbar(
        `Generated ${Object.keys(sourceFileReports).length} source file reports`,
        'success'
      );
    } catch (error) {
      console.error('Report generation error:', error);
      showSnackbar('Failed to generate reports', 'error');
    }
  }, [sourceFileReports, historyDate, showSnackbar]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  // Initialize by loading saved reports on date change
  useEffect(() => {
    if (historyDate) {
      loadSavedReports();
    }
  }, [historyDate, loadSavedReports]);

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
        
        <FileUploader 
          files={files}
          processing={processing}
          onFileChange={handleFileChange}
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