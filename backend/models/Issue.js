const mongoose = require("mongoose");

const issueSchema = new mongoose.Schema(
  {
    paperId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Paper",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "unevaluated_page",       // Page has content, zero annotation boxes
        "blur_penalized",         // Page blurred + got red zero
        "missing_page",           // Gap in page number sequence
        "anomalous_zero",         // Substantial content + 0 marks
        "wrong_sheet",            // Roll number mismatch on cover
        "repeat_stamp",           // REPEAT ANS+ detected
        "supplement_missing",     // PTO/Contd detected, low page count
        "arithmetic_error",       // Blue box total ≠ sum of sub-marks
        "mark_mismatch",          // Detected mark ≠ recorded mark
      ],
      required: true,
    },
    severity: {
      type: String,
      enum: ["critical", "high", "medium", "low"],
      required: true,
    },
    pageNumber: { type: Number, required: true },
    questionCode: { type: String, default: "" },
    detectedMark: { type: Number, default: null },
    expectedMark: { type: Number, default: null },
    blurScore: { type: Number, default: null },
    contentDensity: { type: Number, default: null },
    details: { type: String, default: "" },
    // Coordinates for frontend viewer overlay
    boundingBox: {
      x: Number,
      y: Number,
      width: Number,
      height: Number,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Issue", issueSchema);
