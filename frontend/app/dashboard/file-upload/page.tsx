'use client';

import { useState, useCallback } from 'react';
import { FileUp, FileText, FileX2, Loader2, CheckCircle2, Download, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { toast } from '../components/ui/use-toast';
import axios from 'axios';


interface ProcessedFile {
  originalName: string;
  processedName: string;
  downloadLink: string;
  size?: string;
  downloading?: boolean;
}

interface ProcessingError {
  filename: string;
  error: string;
}

export default function FileManagementPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  const [errors, setErrors] = useState<ProcessingError[]>([]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
    }
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleClearAll = useCallback(() => {
    setFiles([]);
    setProcessedFiles([]);
    setErrors([]);
    setProgress(0);
  }, []);

  const handleSubmit = async () => {
    if (files.length === 0) {
      toast({
        title: 'No files selected',
        description: 'Please select at least one file to process',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setProcessedFiles([]);
    setErrors([]);

    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/files/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.data) {
        throw new Error('No response data from the API');
      }

      const result = response.data;
      const updatedProcessedFiles = (result.processedFiles || []).map((file: ProcessedFile) => ({
        ...file,
        downloadLink: `${process.env.NEXT_PUBLIC_API_URL}/api/files/downloads/${file.downloadLink}`,
      }));
      setProcessedFiles(updatedProcessedFiles);

      if (result.errors?.length > 0) {
        setErrors(result.errors);
        toast({
          title: 'Processing completed with errors',
          description: `${result.errors.length} file(s) failed to process`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Processing successful',
          description: `${result.processedFiles.length} file(s) processed`,
        });
      }

      // Simulate progress
      const totalSteps = 10;
      for (let i = 1; i <= totalSteps; i++) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setProgress((i / totalSteps) * 100);
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      toast({
        title: 'Processing failed',
        description: 'An error occurred while processing your files',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async (file: ProcessedFile) => {
    try {
      // Show loading state
      setProcessedFiles(prev => prev.map(f => 
        f.processedName === file.processedName ? { ...f, downloading: true } : f
      ));
  
      // Construct the correct download URL
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1000';
      const downloadUrl = `${apiBaseUrl}/api/files/download/${file.processedName}`;
  
      // Fetch the file
      const response = await axios.get(downloadUrl, {
        responseType: 'blob',
      });
  
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.originalName.replace('.csv', '.xlsx'));
      document.body.appendChild(link);
      link.click();
  
      // Clean up
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
  
      toast({
        title: 'Download started',
        description: `${file.originalName} is being downloaded`,
      });
  
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      // Remove loading state
      setProcessedFiles(prev => prev.map(f => 
        f.processedName === file.processedName ? { ...f, downloading: false } : f
      ));
    }
  };

  const handleDownloadAll = async () => {
    if (processedFiles.length === 0) return;
  
    try {
      setProcessedFiles(prev => prev.map(file => ({ ...file, downloading: true })));
      
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1000';
      const JSZip = (await import('jszip')).default;
      const { default: saveAs } = await import('file-saver'); // Note the 'default' here
      
      const zip = new JSZip();
      const folder = zip.folder("processed-files");
  
      const downloadPromises = processedFiles.map(async (file) => {
        try {
          const response = await axios.get(
            `${apiBaseUrl}/api/files/download/${file.processedName}`,
            { 
              responseType: 'blob',
              validateStatus: (status) => status === 200
            }
          );
          
          const fileName = file.originalName.replace('.csv', '.xlsx');
          if (folder) {
            folder.file(fileName, response.data);
          }
        } catch (error) {
          console.error(`Failed to download ${file.processedName}:`, error);
          throw error; // Re-throw to handle in the outer catch
        }
      });
  
      await Promise.all(downloadPromises);
  
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `processed-files-${new Date().toISOString().slice(0, 10)}.zip`);
  
      toast({
        title: 'Download complete',
        description: `All ${processedFiles.length} files have been zipped`,
      });
    } catch (error) {
      console.error('Error creating zip file:', error);
      toast({
        title: 'Download failed',
        description: error instanceof Error ? error.message : 'Could not create zip file',
        variant: 'destructive',
      });
      
      // Fallback to individual downloads
      if (processedFiles.length > 0) {
        toast({
          title: 'Attempting individual downloads',
          description: 'Trying to download files one by one',
        });
        processedFiles.forEach(file => handleDownload(file));
      }
    } finally {
      setProcessedFiles(prev => prev.map(file => ({ ...file, downloading: false })));
    }
  };

  // Format file size for display
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <FileText className="w-6 h-6" />
            Verizon CSV Processor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Upload Area */}
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center transition-colors hover:border-primary">
            <div className="flex flex-col items-center justify-center gap-3">
              <FileUp className="w-10 h-10 text-gray-400 dark:text-gray-500" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Drag & drop files here, or click to browse
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Supports CSV files up to 10MB
                </p>
              </div>
              <input
                type="file"
                id="file-upload"
                multiple
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                disabled={isProcessing}
              />
              <Button asChild variant="outline" className="mt-2">
                <label htmlFor="file-upload" className="cursor-pointer flex items-center gap-2">
                  <FileUp className="w-4 h-4" />
                  Select Files
                </label>
              </Button>
            </div>
          </div>

          {/* Selected Files */}
          {files.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Selected Files ({files.length})</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  disabled={isProcessing}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear All
                </Button>
              </div>
              <div className="border rounded-lg divide-y dark:divide-gray-800">
                {files.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-blue-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveFile(index)}
                      disabled={isProcessing}
                      className="text-red-500 hover:text-red-600"
                    >
                      <FileX2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Progress Indicator */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processing files...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Processed Files */}
          {processedFiles.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium">Processed Files ({processedFiles.length})</h3>
              <Button
  variant="outline"
  size="sm"
  onClick={handleDownloadAll}
  disabled={processedFiles.some(f => f.downloading)}
>
  {processedFiles.some(f => f.downloading) ? (
    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
  ) : (
    <Download className="w-4 h-4 mr-2" />
  )}
  Download All
</Button>
              <div className="border rounded-lg divide-y dark:divide-gray-800">
                {processedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                  >
                    <CheckCircle2 className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{file.originalName}</p>
                      {file.size && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Processed: {file.size}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(file)}
                      disabled={file.downloading ?? false} // Replace (file as any).downloading
                      className="ml-3"
                    >
                      {file.downloading ? ( // Replace (file as any).downloading
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 mr-2" />
                      )}
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium text-red-600 dark:text-red-500">
                Processing Errors ({errors.length})
              </h3>
              <div className="border border-red-200 dark:border-red-900 rounded-lg divide-y dark:divide-red-900/50 bg-red-50 dark:bg-red-900/10">
                {errors.map((error, index) => (
                  <div
                    key={index}
                    className="p-3 text-sm text-red-600 dark:text-red-400"
                  >
                    {error.filename ? (
                      <p>
                        <span className="font-medium">{error.filename}:</span> {error.error}
                      </p>
                    ) : (
                      <p>{error.error}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handleClearAll}
              disabled={files.length === 0 || isProcessing}
            >
              Clear All
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={files.length === 0 || isProcessing}
              className="min-w-[120px]"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Process Files'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}