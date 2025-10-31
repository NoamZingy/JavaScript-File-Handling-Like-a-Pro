/**
 * backpressure-demo.js
 *
 
 *
 * Modes:
 * - bad    : Producer pushes data quickly; consumer writes slowly; code DOES NOT pause the readable.
 *            The writable's internal buffer will grow and memory usage will increase.
 *
 * - manual : Same producer & consumer, but the readable is paused when writable.write() returns false,
 *            and resumed on 'drain'. Memory usage should remain stable.
 *

 */

const { Readable, Writable } = require('stream');

const MODE = process.argv[2] || 'bad';
const CHUNK_SIZE = 256 * 1024; // 64 KB chunks
const TOTAL_CHUNKS = 5000;    // total chunks produced (adjust to cause more/less pressure)
const SLOW_MS = 50;           // consumer processing delay per chunk (increase to make consumer slower)

function humanMem(mem) {
  return `${Math.round(mem / 1024 / 1024)} MB`;
}

// A fast producer: emits many chunks quickly (simulates fs.createReadStream on a very fast disk)
class FastProducer extends Readable {
  constructor(totalChunks, chunkSize) {
    super();
    this.sent = 0;
    this.total = totalChunks;
    this.chunkSize = chunkSize;
  }
  _read() {
    // push as many chunks synchronously as possible to simulate a fast producer.
    // but don't push forever; stop at total.
    while (this.sent < this.total) {
      const ok = this.push(Buffer.alloc(this.chunkSize, 'x'));
      this.sent++;
      // If push returns false, the stream's internal buffer is full; break to let consumer catch up.
      // But in the "bad" demo we will circumvent using event-style reading, so this shows the internal mechanism.
      if (!ok) {
        // normally Readable would stop pushing immediately; we still return to allow consumer to drain.
        return;
      }
    }
    // no more data
    this.push(null);
  }
}

// A slow consumer (Writable) — simulates a slow disk/network/DB writing with a delay per chunk
class SlowConsumer extends Writable {
  constructor(slowMs) {
    super();
    this.slowMs = slowMs;
    this.received = 0;
  }
  _write(chunk, encoding, callback) {
    this.received++;
    // Simulate async slow write using setTimeout
    setTimeout(() => {
      // pretend data has been persisted
      callback();
    }, this.slowMs);
  }
}

// Memory monitor
function startMemLog(prefix = '') {
  const id = setInterval(() => {
    const m = process.memoryUsage();
    console.log(
      `${prefix}mem rss=${humanMem(m.rss)} heapUsed=${humanMem(m.heapUsed)} external=${humanMem(m.external)}`
    );
  }, 1000);
  return () => clearInterval(id);
}

async function runBad() {
  console.log('MODE: bad — user code will write() without checking return value / pause. Expect memory growth.');
  const prod = new FastProducer(TOTAL_CHUNKS, CHUNK_SIZE);
  const cons = new SlowConsumer(SLOW_MS);

  // Instead of using .pipe() or handling backpressure, we read 'data' and call write() blindly.
  prod.on('data', (chunk) => {
    // BAD: we ignore the boolean return of write()
    cons.write(chunk);
    // no pause/resume; producer will keep emitting as long as its internal mechanism allows
  });

  prod.on('end', () => {
    console.log('[bad] producer ended — ending writable after a delay');
    // ensure writable finishes remaining work
    cons.end(() => console.log('[bad] consumer finished'));
  });

  prod.on('error', (err) => console.error('[bad] producer error', err));
  cons.on('error', (err) => console.error('[bad] consumer error', err));
}

async function runManual() {
  console.log('MODE: manual — user code checks write() return value and pauses/resumes accordingly. Expect stable memory.');
  const prod = new FastProducer(TOTAL_CHUNKS, CHUNK_SIZE);
  const cons = new SlowConsumer(SLOW_MS);

  prod.on('data', (chunk) => {
    const ok = cons.write(chunk);
    if (!ok) {
      // writable's buffer is full — pause the producer until the consumer drains
      prod.pause();
      cons.once('drain', () => {
        prod.resume();
      });
    }
  });

  prod.on('end', () => {
    console.log('[manual] producer ended — ending writable after a delay');
    cons.end(() => console.log('[manual] consumer finished'));
  });

  prod.on('error', (err) => console.error('[manual] producer error', err));
  cons.on('error', (err) => console.error('[manual] consumer error', err));
}

// Main
(async () => {
  console.log(`Starting backpressure demo — mode=${MODE}`);
  console.log(`Chunk size: ${CHUNK_SIZE} bytes, total chunks: ${TOTAL_CHUNKS}, consumer delay: ${SLOW_MS} ms`);
  const stopMem = startMemLog(`[${MODE}] `);

  if (MODE === 'bad') {
    await runBad();
  } else if (MODE === 'manual') {
    await runManual();
  } 

  // Stop after a while so demo ends
  setTimeout(() => {
    stopMem();
    console.log('Demo timeout reached; exiting.');
    process.exit(0);
  }, 15000);
})();
