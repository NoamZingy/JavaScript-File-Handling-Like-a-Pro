

const fs = require('fs');
const path = require('path');
const unzipper = require('unzipper');
const { pipeline } = require('stream/promises');

const zipPath = path.join(__dirname, '../files/demo.zip');
const outDir = path.join(__dirname, 'extracted');

// quick checks
if (!fs.existsSync(zipPath)) {
  console.error('Zip not found:', zipPath);
  process.exit(1);
}
fs.mkdirSync(outDir, { recursive: true });

// simple safeJoin to prevent path traversal
function safeJoin(base, entryPath) {
  const p = path.join(base, path.normalize(entryPath).replace(/^([/\\])+/, ''));
  if (!path.resolve(p).startsWith(path.resolve(base) + path.sep) && path.resolve(p) !== path.resolve(base)) {
    throw new Error('Path traversal detected: ' + entryPath);
  }
  return p;
}

(async () => {
  try {
    const parse = unzipper.Parse();        // streaming parser
    const pending = [];                    // promises for per-entry writes

    // handle entries
    parse.on('entry', (entry) => {
      const entryPath = entry.path;
      const type = entry.type; // 'Directory' or 'File'
      try {
        const target = safeJoin(outDir, entryPath);
        if (type === 'Directory' || entryPath.endsWith('/')) {
          fs.mkdirSync(target, { recursive: true });
          entry.autodrain();
          console.log('[dir] created', target);
          return;
        }
        // ensure parent exists
        fs.mkdirSync(path.dirname(target), { recursive: true });

        // pipeline the entry -> file, push promise to pending
        const p = pipeline(entry, fs.createWriteStream(target));
        pending.push(p);
        p.then(() => console.log('[file] wrote', target))
         .catch((err) => console.error('[file] failed', target, err.message));
      } catch (err) {
        console.error('[entry] handling error for', entryPath, err.message);
        try { entry.autodrain(); } catch {}
      }
    });

    // run top-level pipeline: read zip -> parse
    await pipeline(fs.createReadStream(zipPath), parse);

    // wait for all per-entry writes to finish
    await Promise.all(pending);
    console.log('Done: all entries extracted to', outDir);
  } catch (err) {
    console.error('Unzip failed:', err);
    process.exitCode = 1;
  }
})();
