const express = require('express');
const pool = require('../models/db');
const router = express.Router();

router.post('/', async (req, res) => {
   try {
    const { listingIds, date } = req.body;
    if (!listingIds || !Array.isArray(listingIds) || !date) {
      return res.status(400).json(
        { error: 'listingIds array and date are required' }
      );
    }

    // Get reports for the specified date
    const result = await pool.query(
      `SELECT report_data FROM reports WHERE report_date = $1`,
      [date]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(
        { error: 'No reports found for the specified date' }
      );
    }

    // Extract all bids from all reports for the date
    const allBids = result.rows.flatMap(row => {
      let reportData = row.report_data;
      if (typeof reportData === 'string') {
        try {
          reportData = JSON.parse(reportData);
        } catch {
          reportData = [];
        }
      }
      return Array.isArray(reportData) ? reportData : [];
    });

    // Filter bids by listingIds
    const filteredBids = allBids.filter(bid =>
      listingIds.includes(bid.listingId)
    );

    return res.json({ bids: filteredBids });
  } catch (error) {
    console.error('Filter error:', error);
    return res.status(500).json(
      { error: 'Failed to filter bids' }
    );
  }
});

module.exports = router;