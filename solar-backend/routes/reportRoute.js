const express = require('express');
const pool = require('../models/db');
const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { report_date, report_data } = req.body;
    if (!report_date || !Array.isArray(report_data)) {
      return res.status(400).json({ error: 'report_date and report_data are required' });
    }

    // Remove duplicates within the same payload
    const uniqueDataMap = new Map();
    report_data.forEach(bid => {
      if (bid.listingId) {
        const key = `${bid.listingId}_${report_date}`;
        if (!uniqueDataMap.has(key)) uniqueDataMap.set(key, bid);
      }
    });
    const uniqueReportData = Array.from(uniqueDataMap.values());

    // Get existing listingIds for that date
    const existing = await pool.query(
      `SELECT report_data FROM reports WHERE report_date = $1`,
      [report_date]
    );

    const existingIds = new Set();
    existing.rows.forEach(row => {
      let data = row.report_data;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch { data = []; }
      }
      if (Array.isArray(data)) {
        data.forEach(bid => {
          if (bid.listingId) existingIds.add(String(bid.listingId));
        });
      }
    });

    // Filter out any bids that already exist for same listingId and date
    const newUniqueData = uniqueReportData.filter(
      bid => !existingIds.has(String(bid.listingId))
    );

    if (newUniqueData.length === 0) {
      return res.status(200).json({ message: 'No new records to save (duplicates skipped).' });
    }

    // Save only new unique bids
    const result = await pool.query(
      `INSERT INTO reports (report_date, report_data, created_at)
       VALUES ($1, $2, NOW())
       RETURNING *`,
      [report_date, JSON.stringify(newUniqueData)]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error saving report:', error);
    res.status(500).json({ error: 'Failed to save report' });
  }
});


router.get('/latest', async (req, res) => {
    const { date } = req.query;
  
  try {
    const result = await pool.query(
      `SELECT id, created_at, report_date, report_data 
       FROM reports 
       WHERE report_date = $1 
       ORDER BY created_at DESC`,
      [date]
    );
    
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { date } = req.query;
    
    const result = await pool.query(
      `SELECT * FROM reports 
       WHERE report_date = $1 
       ORDER BY report_data->>'fileName', created_at DESC`,
      [date]
    );
    
    const parsedReports = result.rows.map(report => ({
      ...report,
      report_data: typeof report.report_data === 'string'
        ? JSON.parse(report.report_data)
        : report.report_data
    }));
    
    res.json(parsedReports);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// router.get('/', async (req, res) => {
//   try {
//     const { date } = req.query;
    
//     const result = await pool.query(
//       'SELECT * FROM reports WHERE report_date = $1 ORDER BY created_at DESC',
//       [date]
//     );
    
//     res.json(result.rows);
//   } catch (err) {
//     console.error(err.message);
//     res.status(500).send('Server error');
//   }
// });

router.get('/revenue', async (req, res) => {
  try {
    // Get all reports
    const result = await pool.query('SELECT report_data FROM reports');
    let totalRevenue = 0;

    result.rows.forEach(row => {
      let reportData = row.report_data;
      if (typeof reportData === 'string') {
        try {
          reportData = JSON.parse(reportData);
        } catch {
          reportData = [];
        }
      }
      if (Array.isArray(reportData)) {
        totalRevenue += reportData.reduce(
          (sum, bid) => sum + (Number(bid.unitPrice) || 0),
          0
        );
      }
    });

    res.json({ totalRevenue });
  } catch (error) {
    console.error('Error calculating revenue:', error);
    res.status(500).json({ error: 'Failed to calculate revenue' });
  }
});

router.get('/active-customers', async (req, res) => {
  try {
    // Fetch all report_data from reports
    const result = await pool.query('SELECT report_data FROM reports');
    const fileNames = new Set();

    result.rows.forEach(row => {
      let reportData = row.report_data;
      if (typeof reportData === 'string') {
        try { reportData = JSON.parse(reportData); } catch { reportData = []; }
      }
      if (Array.isArray(reportData)) {
        reportData.forEach(bid => {
          if (bid.fileName) {
            fileNames.add(bid.fileName);
          }
        });
      }
    });

    res.json({ customers: Array.from(fileNames) });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

router.get('/highest', async (req, res) => {
  try {
    // Get all reports
    const result = await pool.query('SELECT report_data, created_at FROM reports');
    let highestBid = null;

    result.rows.forEach(row => {
      let reportData = row.report_data;
      if (typeof reportData === 'string') {
        try {
          reportData = JSON.parse(reportData);
        } catch {
          reportData = [];
        }
      }
      if (Array.isArray(reportData)) {
        reportData.forEach(bid => {
          const unitPrice = Number(bid.unitPrice);
          if (!isNaN(unitPrice)) {
            if (!highestBid || unitPrice > highestBid.amount) {
              highestBid = {
                amount: unitPrice,
                description: bid.description || null,
                date: row.created_at,
              };
            }
          }
        });
      }
    });

    if (!highestBid) return res.json({});
    res.json(highestBid);
  } catch (error) {
    console.error('Error fetching highest bid:', error);
    res.status(500).json({ error: 'Failed to fetch highest bid' });
  }
});

router.get('/monthly-stats', async (req, res) => {
  try {
    // Count reports per month for the last 12 months
    const reports = await pool.query(`
      SELECT 
        TO_CHAR(report_date, 'Mon') AS month,
        DATE_TRUNC('month', report_date) AS month_start,
        COUNT(*) AS count
      FROM reports
      GROUP BY month, month_start
      ORDER BY month_start DESC
      LIMIT 12
    `);

    res.json({
      submitted: reports.rows,
      awarded: reports.rows,
    });
  } catch (error) {
    console.error('Error fetching monthly stats:', error);
    res.status(500).json({ error: 'Failed to fetch monthly stats' });
  }
});

router.get('/recent-activities', async (req, res) => {
  try {
    // Get the latest 10 reports
    const result = await pool.query(
      `SELECT id, created_at, report_date, report_data 
       FROM reports 
       ORDER BY created_at DESC 
       LIMIT 10`
    );

    // Flatten activities from report_data
    const activities = [];
    result.rows.forEach(report => {
      let reportData = report.report_data;
      if (typeof reportData === 'string') {
        try { reportData = JSON.parse(reportData); } catch { reportData = []; }
      }
      if (Array.isArray(reportData)) {
        reportData.forEach(bid => {
          activities.push({
            type: 'bid',
            description: `Bid for ${bid.description || bid.sku || 'item'}`,
            date: report.created_at,
            fileName: bid.fileName,
          });
        });
      }
      // Add a report-level activity
      activities.push({
        type: 'report',
        description: `Processed report for ${report.report_date}`,
        date: report.created_at,
      });
    });

    // Sort by date descending and limit to 10
    activities.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(activities.slice(0, 10));
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    res.status(500).json({ error: 'Failed to fetch recent activities' });
  }
});

module.exports = router;