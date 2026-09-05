const mongoose = require('mongoose');

// Curated "well-designed RN component" library for the Enhance step's RAG lookup.
// Lives in Mongo either way; Actian is queried for the actual nearest-neighbor
// search when configured, this collection is also the source of truth used to
// seed Actian (see scripts/seedPatterns.js) and the cosine fallback below.
const patternSchema = new mongoose.Schema({
  description: { type: String, required: true },
  style: { type: mongoose.Schema.Types.Mixed, required: true },
  vector: { type: [Number], default: undefined },
});

module.exports = mongoose.model('Pattern', patternSchema);
