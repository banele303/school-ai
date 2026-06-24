import fs from 'fs';
import path from 'path';

const workspace = 'c:/Users/Mr Ness/Documents/Ai/school ai';

function inspectFile(filename) {
  const filePath = path.join(workspace, filename);
  if (!fs.existsSync(filePath)) {
    console.log(`${filename} does not exist.`);
    return;
  }
  const buffer = fs.readFileSync(filePath);
  console.log(`\n--- Inspecting ${filename} (size: ${buffer.length} bytes) ---`);
  console.log(`First 20 bytes (hex):`, buffer.subarray(0, 20).toString('hex'));
  
  // Try UTF-16LE
  try {
    const utf16Str = buffer.toString('utf16le');
    console.log(`As UTF-16LE (first 100 chars):`, utf16Str.slice(0, 100));
  } catch (e) {
    console.log(`Failed to read as UTF-16LE:`, e.message);
  }

  // Try UTF-8
  try {
    const utf8Str = buffer.toString('utf8');
    console.log(`As UTF-8 (first 100 chars):`, utf8Str.slice(0, 100));
  } catch (e) {
    console.log(`Failed to read as UTF-8:`, e.message);
  }
}

inspectFile('b64_key.txt');
inspectFile('_jwks.txt');
inspectFile('_pk.txt');
inspectFile('_secret.txt');
inspectFile('temp_key.txt');
inspectFile('private_key.pem');
