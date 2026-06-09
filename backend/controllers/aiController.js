const https = require("https");
const Issue = require("../models/Issue");
const Paper = require("../models/Paper");

// Uses OpenRouter's OpenAI-compatible API with a free model
async function callOpenRouter(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: "nvidia/nemotron-3-ultra-550b-a55b:free",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    });

    const options = {
      hostname: "openrouter.ai",
      path: "/api/v1/chat/completions",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "http://localhost:3000", // Required by OpenRouter
        "X-Title": "Inkless Audit System",
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);

          // Log full response for debugging
          if (parsed.error) {
            console.error("OpenRouter error response:", JSON.stringify(parsed.error));
            return reject(new Error(`OpenRouter: ${parsed.error.message || JSON.stringify(parsed.error)}`));
          }

          const text = parsed.choices?.[0]?.message?.content;
          if (!text) {
            return reject(new Error("Empty response from OpenRouter"));
          }

          resolve(text.trim());
        } catch (e) {
          reject(new Error(`Failed to parse OpenRouter response: ${e.message}`));
        }
      });
    });

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("OpenRouter request timed out"));
    });
    
    req.setTimeout(15000); // 15 second timeout
    req.write(body);
    req.end();
  });
}

async function generateAIAdvice(paperId) {
  const paper = await Paper.findById(paperId);
  const issues = await Issue.find({ paperId }).sort({ severity: 1 });

  if (issues.length === 0) {
    return "No significant issues were detected in this answer sheet. The evaluation appears to have been conducted properly. Re-evaluation is not recommended at this time.";
  }

  const issuesSummary = issues
    .map(
      (i) =>
        `- [${i.severity.toUpperCase()}] Page ${i.page_number}: ${i.type.replace(/_/g, " ")} — ${i.details}`
    )
    .join("\n");

  const prompt = `You are an expert educational auditor reviewing a CBSE Class 12 answer sheet evaluation audit.

Student: ${paper.studentName || "Unknown"}
Subject: ${paper.subject || "Unknown"}
Trust Score: ${paper.trustScore}/100
Total Issues Found: ${issues.length}

Issues Detected:
${issuesSummary}

Write a professional 3-4 sentence audit recommendation for the student. Be specific about which pages and questions had issues. State clearly whether re-evaluation is recommended and why. Use precise, factual language — this may be submitted to CBSE as evidence. Do not use bullet points. Write in plain paragraphs only.`;

  try {
    return await callOpenRouter(prompt);
  } catch (err) {
    console.error("OpenRouter API error:", err);
    return `${issues.length} issue(s) were detected during automated analysis, including ${issues.filter((i) => i.severity === "critical").length} critical issue(s). Manual review and re-evaluation is recommended.`;
  }
}

module.exports = { generateAIAdvice };
