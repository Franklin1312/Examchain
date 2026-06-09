const express = require("express");
const router = express.Router();
const Issue = require("../models/Issue");
const Event = require("../models/Event");

// GET /api/analysis/:paperId/issues
router.get("/:paperId/issues", async (req, res) => {
  try {
    const issues = await Issue.find({ paperId: req.params.paperId }).sort({
      severity: 1,
    });
    res.json(issues);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
