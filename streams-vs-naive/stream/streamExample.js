const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const largeFilePath = '../../files/largeFile.zip'
// const smallFilePath = '../../files/smallFile.pdf'
const PORT = 3002;

function getMemoryUsage() {
  const mem = process.memoryUsage();
  return {
    timestamp: Date.now(),
    rss: (mem.rss / 1024 / 1024).toFixed(2),
    heapUsed: (mem.heapUsed / 1024 / 1024).toFixed(2),
    external: (mem.external / 1024 / 1024).toFixed(2),
  };
}

// 🔁 Stream file read in a loop
setInterval(async () => {
  try {
    const stream = fs.createReadStream(largeFilePath);
    let length = 0;
    for await (const chunk of stream) {
      length += chunk.length;
    }
    console.log(`Stream read: ${length} chars`);
  } catch (err) {
    console.error("Error streaming file:", err);
  }
}, 2000);

wss.on("connection", (ws) => {
  console.log("Client connected to large-stream");

  const interval = setInterval(() => {
    ws.send(JSON.stringify({ type: "stream", ...getMemoryUsage() }));
  }, 1000);

  ws.on("close", () => clearInterval(interval));
});

server.listen(PORT, () => {
  console.log(`Large Stream WebSocket server running at ws://localhost:${PORT}`);
});
