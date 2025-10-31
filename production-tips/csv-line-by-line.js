// csv-line-by-line.js
// Demo: Naive vs Streaming CSV processing
// Shows memory usage and stopping early (when finding id=10)

const fs = require("fs");
const readline = require("readline");

// Utility to log memory usage nicely
function logMemory(label) {
  const mem = process.memoryUsage();
  console.log(
    `[${label}] rss=${(mem.rss / 1024 / 1024).toFixed(1)} MB ` +
    `heapUsed=${(mem.heapUsed / 1024 / 1024).toFixed(1)} MB ` +
    `external=${(mem.external / 1024 / 1024).toFixed(1)} MB`
  );
}

// -------------------------------------------------------
// ❌ Naive approach with fs.readFile
// -------------------------------------------------------
function naiveCSVRead(filePath) {
  console.log("\n=== Naive read (fs.readFile) ===");
  console.time("naive");

  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) throw err;

    logMemory("naive-before-split");

    // Splits everything into memory
    const lines = data.split("\n");

    // Example: stop once we find id=10
    for (const line of lines) {
      if (line.startsWith("10,")) {
        console.log("Found target:", line);
        break;
      }
    }

    console.log(`Total lines loaded into memory: ${lines.length}`);
    logMemory("naive-after-split");
    console.timeEnd("naive");
  });
}

// -------------------------------------------------------
// ✅ Streaming approach (fs.createReadStream + readline)
// -------------------------------------------------------
async function streamCSVRead(filePath) {
  console.log("\n=== Streaming read (line by line) ===");
  console.time("stream");

  const fileStream = fs.createReadStream(filePath, { encoding: "utf8" });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let lineCount = 0;

  for await (const line of rl) {
    lineCount++;
    if (line.startsWith("10,")) {
      console.log("Found target:", line);
      break; // ✅ stop early, without reading whole file
    }
  }

  console.log(`Processed ${lineCount} lines (stopped early).`);
  logMemory("stream-end");
  console.timeEnd("stream");
}

// -------------------------------------------------------
// Run both
// -------------------------------------------------------
// const FILE_PATH = "../files/small.csv"; 
// const FILE_PATH = "../files/large.csv"; 
const FILE_PATH = "../files/one_gb.csv"; 


naiveCSVRead(FILE_PATH);
streamCSVRead(FILE_PATH);
