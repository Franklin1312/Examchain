const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const Paper = require("../models/Paper");
const Issue = require("../models/Issue");
const Event = require("../models/Event");
const { createEvent } = require("../utils/hashChain");
const { runAnalysisPipeline } = require("../controllers/analysisController");

// POST /api/papers/upload
router.post("/upload", upload.single("answerSheet"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file uploaded" });
    }

    const paper = await Paper.create({
      studentName: req.body.studentName || "Unknown",
      rollNumber: req.body.rollNumber || "",
      subject: req.body.subject || "",
      answerSheetPath: req.file.path,
      status: "uploaded",
    });

    // Log upload event in hash chain
    await createEvent(paper._id, "uploaded", {
      filename: req.file.originalname,
      size: req.file.size,
      path: req.file.path,
    });

    // Start analysis pipeline asynchronously
    runAnalysisPipeline(paper._id).catch((err) =>
      console.error("Pipeline error:", err)
    );

    res.status(201).json({
      success: true,
      paperId: paper._id,
      message: "Upload successful. Analysis started.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/papers/:id — get paper with issues and events
router.get("/:id", async (req, res) => {
  try {
    const paper = await Paper.findById(req.params.id);
    if (!paper) return res.status(404).json({ error: "Paper not found" });

    const issues = await Issue.find({ paperId: paper._id }).sort({
      severity: 1,
      pageNumber: 1,
    });
    const events = await Event.find({ paperId: paper._id }).sort({
      sequence: 1,
    });

    res.json({ paper, issues, events });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/papers/:id/status — lightweight status poll
router.get("/:id/status", async (req, res) => {
  try {
    const paper = await Paper.findById(req.params.id).select(
      "status trustScore errorMessage"
    );
    if (!paper) return res.status(404).json({ error: "Not found" });
    res.json(paper);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
