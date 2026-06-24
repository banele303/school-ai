import fs from 'fs';
import path from 'path';

const workspace = 'c:/Users/Mr Ness/Documents/Ai/school ai';

function readUtf16File(filename) {
  const filePath = path.join(workspace, filename);
  if (!fs.existsSync(filePath)) {
    console.log(`${filename} does not exist.`);
    return;
  }
  const buffer = fs.readFileSync(filePath);
  const str = buffer.toString('utf16le');
  console.log(`\n--- Contents of ${filename} ---`);
  console.log(str);
}

readUtf16File('current_env.txt');
readUtf16File('env_list.txt');
