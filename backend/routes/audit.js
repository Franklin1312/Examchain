const express = require("express");
const router = express.Router();
const Event = require("../models/Event");
const { verifyChain } = require("../utils/hashChain");

// GET /api/audit/:paperId
router.get("/:paperId", async (req, res) => {
  try {
    const events = await Event.find({ paperId: req.params.paperId }).sort({
      sequence: 1,
    });
    const verification = await verifyChain(req.params.paperId);
    res.json({ events, verification });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
