import * as XLSX from 'xlsx';

export const parseCSV = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result as string;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('File reading failed'));
    reader.readAsBinaryString(file);
  });
};

export const generateXLSX = (data: any[], sourceFileName: string, date: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Awarded Bids');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  // 🧹 Clean and extract meaningful parts from the original filename
  const baseName = sourceFileName
    .replace(/\.[^/.]+$/, '') // remove .csv/.xlsx extension
    .replace(/^Awarded_Bids[_-]?/i, '') // remove prefix
    .trim();

  // 🔍 Try to detect customer name and lot number
  const match = baseName.match(/([A-Za-z\s]+)[\s_-]*VLot\d+/i);
  let customer = '' ;
  let lotPart = baseName;

  if (match) {
    customer = match[1].trim().toUpperCase();
    lotPart = baseName.match(/VLot\d+/)?.[0] || baseName;
  }

  // 🏷️ Build final name
  const formattedDate = date.replace(/-/g, '');
  const fileName = `${customer} Award Ft- ${lotPart}.xlsx_${formattedDate}.xlsx`;

  return { blob, fileName };
};