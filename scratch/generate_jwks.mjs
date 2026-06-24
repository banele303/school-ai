import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const workspace = 'c:/Users/Mr Ness/Documents/Ai/school ai';
const pkPath = path.join(workspace, 'private_key.pem');

if (!fs.existsSync(pkPath)) {
  console.error("private_key.pem does not exist!");
  process.exit(1);
}

const privateKeyPem = fs.readFileSync(pkPath, 'utf8');
const privateKeyObj = crypto.createPrivateKey(privateKeyPem);
const publicKeyObj = crypto.createPublicKey(privateKeyObj);
const jwk = publicKeyObj.export({ format: 'jwk' });

const jwksObj = {
  keys: [
    {
      use: 'sig',
      alg: 'RS256',
      ...jwk
    }
  ]
};

console.log("Generated JWKS:");
console.log(JSON.stringify(jwksObj, null, 2));
