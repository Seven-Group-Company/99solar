import { ChangeEvent } from 'react';
import { Button, CircularProgress } from '@mui/material';
import PublishIcon from '@mui/icons-material/Publish';
import DescriptionIcon from '@mui/icons-material/Description';

interface FileUploaderProps {
  files: File[];
  processing: boolean;
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onClearFiles: () => void;
  onProcessFiles: () => void;
  accept?: string;
}

export const FileUploader = ({
  files,
  processing,
  onFileChange,
  onClearFiles,
  onProcessFiles,
}: FileUploaderProps) => (
  <div>
    <div className="mb-6">
      <label className="block text-lg font-medium text-gray-700 mb-3">
        Upload Excel Files
      </label>
      <div className="flex items-center justify-center w-full">
        <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <PublishIcon className="w-12 h-12 text-gray-400 mb-3" />
            <p className="mb-2 text-sm text-gray-500">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500">
              files upload (multiple allowed)
            </p>
          </div>
          <input 
            type="file" 
            className="hidden"
            accept=".xlsx,.xls,.csv"
            multiple
            onChange={onFileChange}
          />
        </label>
      </div>
    </div>
    
    {files.length > 0 && (
      <div className="mt-4">
        <h3 className="font-medium text-gray-700 mb-2">Selected Files:</h3>
        <div className="max-h-40 overflow-y-auto border rounded-lg p-2 bg-gray-50">
          {files.map((file, index) => (
            <div key={index} className="flex items-center py-2 border-b last:border-b-0">
              <DescriptionIcon className="text-gray-500 mr-2" />
              <span className="text-sm truncate">{file.name}</span>
              <span className="text-xs text-gray-500 ml-auto">
                {(file.size / 1024).toFixed(1)} KB
              </span>
            </div>
          ))}
        </div>
      </div>
    )}
    
    <div className="flex flex-wrap gap-3 mt-6">
      <Button
        variant="contained"
        color="primary"
        onClick={onProcessFiles}
        disabled={processing || files.length === 0}
        className="min-w-[150px]"
      >
        {processing ? <CircularProgress size={24} /> : 'Process Files'}
      </Button>
      
      <Button
        variant="outlined"
        color="secondary"
        onClick={onClearFiles}
        disabled={processing}
      >
        Clear Files
      </Button>
    </div>
  </div>
);