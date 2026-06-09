require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");

const app = express();

// Ensure upload/processed dirs exist
["./uploads", "./processed"].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Middleware
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());
app.use("/processed", express.static(path.join(__dirname, "processed")));

// Routes
app.use("/api/papers", require("./routes/papers"));
app.use("/api/analysis", require("./routes/analysis"));
app.use("/api/audit", require("./routes/audit"));

// MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Inkless backend running on port ${PORT}`));
