#!/usr/bin/env node
/**
 * Count guests by actual number of guest objects (featured_guests.length per event),
 * not by the guest_count field.
 * Writes result JSON to guest-count-results/ (one file per run, timestamped).
 *
 * Usage: node count-guests-by-objects.mjs [path-to.json]
 *   If no path given, reads from stdin.
 *   Supports: direct { events } or luma-reg.json style { "https://api...": { body: { events } } }
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = join(__dirname, 'guest-count-results');

function getEvents(data) {
  if (Array.isArray(data.events)) {
    return data.events;
  }
  // luma-reg.json style: first key that has .body.events
  if (typeof data === 'object' && data !== null) {
    for (const v of Object.values(data)) {
      if (v && typeof v === 'object' && Array.isArray(v.body?.events)) {
        return v.body.events;
      }
    }
  }
  return null;
}

function countGuests(events) {
  let byCounter = 0;
  let byObjects = 0;
  const perEvent = [];

  for (const ev of events) {
    const gc = ev.guest_count ?? 0;
    const objs = Array.isArray(ev.featured_guests) ? ev.featured_guests.length : 0;
    byCounter += gc;
    byObjects += objs;
    perEvent.push({
      api_id: ev.api_id,
      name: ev.event?.name ?? ev.name ?? ev.api_id,
      guest_count: gc,
      featured_guests_count: objs,
    });
  }

  return { byCounter, byObjects, perEvent };
}

async function main() {
  let raw;
  const path = process.argv[2];

  if (path) {
    raw = readFileSync(path, 'utf8');
  } else {
    raw = await new Promise((resolve, reject) => {
      const chunks = [];
      process.stdin.on('data', (c) => chunks.push(c));
      process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      process.stdin.on('error', reject);
    });
  }

  const data = JSON.parse(raw);
  const events = getEvents(data);

  if (!events || !events.length) {
    console.error('No events array found in JSON.');
    process.exit(1);
  }

  const { byCounter, byObjects, perEvent } = countGuests(events);

  const result = {
    run_at: new Date().toISOString(),
    summary: {
      events_count: events.length,
      guests_by_counter: byCounter,
      guests_by_objects: byObjects,
    },
    events: perEvent.map((row) => ({
      api_id: row.api_id,
      name: row.name || null,
      guest_count: row.guest_count,
      featured_guests_count: row.featured_guests_count,
    })),
  };

  mkdirSync(RESULTS_DIR, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = join(RESULTS_DIR, `guest-count-${ts}.json`);
  writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');
  console.log('Result saved:', outPath);
  console.log('');

  console.log('Events:', events.length);
  console.log('Guests by counter (guest_count sum):', byCounter);
  console.log('Guests by objects (featured_guests lengths sum):', byObjects);
  console.log('');
  console.log('Per event:');
  for (const row of perEvent) {
    console.log(`  ${row.api_id}  guest_count=${row.guest_count}  featured_guests=${row.featured_guests_count}  ${row.name || ''}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
