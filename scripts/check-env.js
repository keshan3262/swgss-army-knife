const { readFileSync } = require('node:fs');
const { parse } = require('dotenv');
const path = require('node:path');
let envSchema;

try {
  envSchema = require('../dist/config/env.schema').envSchema;

  if (!envSchema) {
    throw new Error('Could not load env schema');
  }
} catch {
  console.log('Could not load env schema, please try rebuilding the project');
  process.exit(1);
}

const schemaKeys = Object.keys(envSchema.shape).sort();
const fileKeys = Object.keys(parse(readFileSync(path.join(__dirname, '..', '.env.example')))).sort();

const missing = schemaKeys.filter((k) => !fileKeys.includes(k));
const extra = fileKeys.filter((k) => !schemaKeys.includes(k));

if (missing.length || extra.length) {
  if (missing.length) console.error(`✗ Missing in .env.example: ${missing.join(', ')}`);
  if (extra.length) console.error(`✗ Extra in .env.example (missing in schema): ${extra.join(', ')}`);
  process.exit(1);
}
console.log(`✓ .env.example is synchronized with the schema (${schemaKeys.length} variables)`);
