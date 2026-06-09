const crypto = require("crypto");
const Event = require("../models/Event");

async function createEvent(paperId, eventType, eventData = {}) {
  // Get last event for this paper to chain hashes
  const lastEvent = await Event.findOne({ paperId }).sort({ sequence: -1 });

  const previousHash = lastEvent ? lastEvent.hash : "0";
  const sequence = lastEvent ? lastEvent.sequence + 1 : 1;

  // Create hash: SHA256(previousHash + eventType + eventData + timestamp)
  const timestamp = new Date().toISOString();
  const payload = `${previousHash}:${eventType}:${JSON.stringify(eventData)}:${timestamp}`;
  const hash = crypto.createHash("sha256").update(payload).digest("hex");

  const event = await Event.create({
    paperId,
    eventType,
    eventData,
    hash,
    previousHash,
    sequence,
  });

  return event;
}

async function verifyChain(paperId) {
  const events = await Event.find({ paperId }).sort({ sequence: 1 });

  for (let i = 1; i < events.length; i++) {
    if (events[i].previousHash !== events[i - 1].hash) {
      return { valid: false, brokenAt: events[i].sequence };
    }
  }

  return { valid: true, totalEvents: events.length };
}

module.exports = { createEvent, verifyChain };
