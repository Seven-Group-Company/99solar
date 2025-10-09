'use client';

import { Button, CircularProgress, TextField, IconButton, Tooltip } from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import DeleteIcon from '@mui/icons-material/Delete';
import { BidData } from '@/types/types';

export interface SavedReport {
  id: number;
  created_at: string;
  report_date: string;
  report_data: BidData[];
}

interface ReportHistoryProps {
  historyDate: string;
  savedReports: SavedReport[];
  loadingHistory: boolean;
  onDateChange: (date: string) => void;
  onRefresh: () => void;
  onLoadReport: (report: SavedReport) => void;
  onDelete: (id: number) => void;
  onLoadAll: (reports: SavedReport[]) => void;
}

export const ReportHistory = ({
  historyDate,
  savedReports,
  loadingHistory,
  onDateChange,
  onRefresh,
  onLoadReport,
  onDelete,
  onLoadAll,
}: ReportHistoryProps) => (
  <div className="p-6 shadow-lg">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xl font-semibold text-gray-800">Report History</h2>
      <div className="flex items-center space-x-2">
        <TextField
          label="Select Date"
          type="date"
          value={historyDate}
          onChange={(e) => onDateChange(e.target.value)}
          InputLabelProps={{ shrink: true }}
          className="w-40"
        />
        <Button
          variant="outlined"
          color="primary"
          startIcon={<HistoryIcon />}
          onClick={onRefresh}
          disabled={loadingHistory}
        >
          {loadingHistory ? <CircularProgress size={24} /> : 'Refresh'}
        </Button>
      </div>
    </div>

    {savedReports.length > 0 ? (
      <>
        <div className="mb-4 flex justify-end">
          <Button variant="contained" color="secondary" onClick={() => onLoadAll(savedReports)}>
            Load All
          </Button>
        </div>

        <div className="overflow-y-auto max-h-80">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Saved At
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Report Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {savedReports.map((report) => (
                <tr key={report.id}>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {new Date(report.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(report.report_date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {report.report_data.length} bids
                  </td>
                  <td className="px-4 py-3 text-sm flex items-center space-x-2">
                    <Button variant="outlined" size="small" onClick={() => onLoadReport(report)}>
                      Load
                    </Button>
                    <Tooltip title="Delete report">
                      <IconButton color="error" onClick={() => onDelete(report.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    ) : (
      <div className="text-center py-8 text-gray-500">No saved reports found for selected date</div>
    )}
  </div>
);
