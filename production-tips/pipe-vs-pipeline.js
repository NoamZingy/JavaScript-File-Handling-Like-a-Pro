
// ✅ pipeline():
//   - Recommended for production
//   - Automatically forwards errors from all streams
//   - Provides a final callback (success/failure)
//   - Prevents unhandled errors that could crash your app
//
// ❌ pipe():
//   - Manually chaining streams with .pipe()
//   - Does NOT automatically forward errors
//   - If you forget to attach error handlers, your app can crash
//   - Can be exploited (e.g. malicious input -> unhandled error -> DoS)
//
// Always prefer pipeline() when connecting multiple streams!

const fs = require('fs');
const { pipeline } = require('stream');
const zlib = require('zlib');

const inputFile = '../files/demo-input.txt';
const missingFile = 'missing-file.txt';


// Example 1: BAD - using pipe() without error handling
function demoPipe() {
  console.log('\n[DEMO] Using .pipe() (not recommended)');

  const rs = fs.createReadStream(inputFile);
  const gz = zlib.createGzip();
  const ws = fs.createWriteStream('out-pipe.gz');

  // Common mistake: no error handling here
  rs.pipe(gz).pipe(ws);

  console.log('[pipe] Streams chained. If an error occurs (e.g. file missing),');
  console.log('[pipe] it will not be caught and can crash the process.');
}


// Example 2: GOOD - using pipeline()

function demoPipeline() {
  console.log('\n[DEMO] Using pipeline() (recommended)');

  pipeline(
    fs.createReadStream(missingFile), 
    zlib.createGzip(),
    fs.createWriteStream('out-pipeline.gz'),
    (err) => {
      if (err) {
        console.error('[pipeline] Pipeline failed:', err.message);
      } else {
        console.log('[pipeline] Pipeline succeeded: out-pipeline.gz created');
      }
    }
  );
}

// Run both demos
demoPipe();
demoPipeline();

