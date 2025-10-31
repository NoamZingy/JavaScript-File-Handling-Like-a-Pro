
// highWaterMark is a buffer size threshold for streams in Node.js.

// It tells Node: “this is the max amount of data I’m comfortable keeping in memory before applying backpressure.”

// It doesn’t limit total data, just how much can be queued before slowing down.

// Default values

// For Readable streams → default highWaterMark = 64 KB (for binary data).

// For Writable streams → default highWaterMark = 16 KB.

// For object mode streams (when objectMode: true) → default is 16 objects.

const fs = require('fs');

const input = '../files/demo-input.txt';
const output = 'demo-slow-out.txt';

console.log('Starting manual backpressure demo...');

const rs = fs.createReadStream(input); // small chunks for demo
const ws = fs.createWriteStream(output);

// Simulate slower writable by delaying the drain handling with a transformation-like behavior is more complex.
// For demo we just demonstrate pause/resume when write() returns false.
rs.on('data', (chunk) => {
  const ok = ws.write(chunk);
  console.log(`[manual-backpressure] wrote ${chunk.length} bytes -> write returned ${ok}`);
  if (!ok) {
    console.log('[manual-backpressure] buffer full, pausing readable');
    rs.pause();
    ws.once('drain', () => {
      console.log('[manual-backpressure] drain event -> resuming readable');
      rs.resume();
    });
  }
});

rs.on('end', () => {
  console.log('[manual-backpressure] readable ended; ending writable');
  ws.end();
});

rs.on('error', (err) => console.error('[manual-backpressure] read error:', err));
ws.on('error', (err) => console.error('[manual-backpressure] write error:', err));
ws.on('finish', () => console.log('[manual-backpressure] write finished'));
