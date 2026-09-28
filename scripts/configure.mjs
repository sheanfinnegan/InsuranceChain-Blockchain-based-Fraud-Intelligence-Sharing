import fs from 'node:fs';
import { randomBytes } from 'node:crypto';
if (!fs.existsSync('.env.local')) {
  const db = randomBytes(18).toString('hex'),
    s3 = randomBytes(24).toString('hex');
  fs.writeFileSync(
    '.env.local',
    `DATABASE_URL=postgresql://insurance:${db}@127.0.0.1:15432/insurancechain\nPOSTGRES_PASSWORD=${db}\nCOUCHDB_PASSWORD=${randomBytes(18).toString('hex')}\nS3_ENDPOINT=http://127.0.0.1:19000\nS3_ACCESS_KEY=insurancechain\nS3_SECRET_KEY=${s3}\nFABRIC_CRYPTO_PATH=.runtime/crypto\nDEMO_PASSWORD=InsuranceChain!2026\n`,
  );
}
const env = fs.readFileSync('.env.local', 'utf8');
if (!/^FABRIC_OJK_ENDPOINT=/m.test(env))
  fs.appendFileSync('.env.local', '\nFABRIC_OJK_ENDPOINT=localhost:14051\n');
console.log('Local configuration ready.');
