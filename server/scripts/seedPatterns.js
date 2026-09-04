// One-time seed for the Enhance step's RAG pattern library (build plan Phase 5a).
// Writes to Mongo (source of truth + cosine fallback) and, if configured, to
// Actian too. Run with: node scripts/seedPatterns.js
require('dotenv').config();
const mongoose = require('mongoose');
const Pattern = require('../src/models/Pattern');
const { embedText } = require('../src/lib/gemini');
const actian = require('../src/lib/actian');

const PATTERNS = [
  { description: 'A login form with a text field and a button.', style: { primaryColor: '#4F46E5', borderRadius: 12 } },
  { description: 'A signup screen with multiple text fields and a submit button.', style: { primaryColor: '#4F46E5', borderRadius: 12 } },
  { description: 'A settings screen with several switches and labels.', style: { primaryColor: '#0EA5E9', borderRadius: 8 } },
  { description: 'A profile screen with an image, some text, and a button.', style: { primaryColor: '#F97316', borderRadius: 20 } },
  { description: 'A card layout with an image and a text label.', style: { primaryColor: '#10B981', borderRadius: 16 } },
  { description: 'A list of items each with text and a button.', style: { primaryColor: '#6366F1', borderRadius: 10 } },
  { description: 'A search screen with a text field and a few buttons.', style: { primaryColor: '#EC4899', borderRadius: 24 } },
  { description: 'A dashboard with images, text, and toggle switches.', style: { primaryColor: '#14B8A6', borderRadius: 8 } },
  { description: 'A simple confirmation screen with text and a single button.', style: { primaryColor: '#3B82F6', borderRadius: 14 } },
  { description: 'A gallery screen with several images and labels.', style: { primaryColor: '#8B5CF6', borderRadius: 16 } },
];

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('connected, seeding', PATTERNS.length, 'patterns');

  for (let i = 0; i < PATTERNS.length; i++) {
    const p = PATTERNS[i];
    const vector = await embedText(p.description);
    await Pattern.findOneAndUpdate(
      { description: p.description },
      { description: p.description, style: p.style, vector },
      { upsert: true }
    );
    console.log('mongo:', p.description);

    try {
      // Actian point ids must be an integer or UUID string, not free text -
      // a stable 1-based index works since PATTERNS is a fixed list.
      await actian.upsertPattern({ id: i + 1, description: p.description, style: p.style });
      console.log('actian:', p.description);
    } catch (err) {
      console.log('actian skipped (not configured or failed):', err.message);
    }
  }

  await mongoose.disconnect();
  console.log('done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
