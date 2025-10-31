const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const PORT = 3001;
const largeFilePath = '../../files/largeFile.zip'
// const smallFilePath = '../../files/smallFile.pdf'

function getMemoryUsage() {
  const mem = process.memoryUsage();
  return {
    timestamp: Date.now(),
    rss: (mem.rss / 1024 / 1024).toFixed(2),
    heapUsed: (mem.heapUsed / 1024 / 1024).toFixed(2),
    external: (mem.external / 1024 / 1024).toFixed(2),
  };
}

// 🔁 Naive file read in a loop
setInterval(() => {
  try {
    const data = fs.readFileSync(largeFilePath);
  console.log(`Naive read done, size: ${data.length / 1024 / 1024} MB`);
  } catch (err) {
    console.error("Error reading file:", err);
  }
}, 2000);

wss.on("connection", (ws) => {
  console.log("Client connected to large-naive");

  const interval = setInterval(() => {
    ws.send(JSON.stringify({ type: "naive", ...getMemoryUsage() }));
  }, 1000);

  ws.on("close", () => clearInterval(interval));
});

server.listen(PORT, () => {
  console.log(`Large Naive WebSocket server running at ws://localhost:${PORT}`);
});
