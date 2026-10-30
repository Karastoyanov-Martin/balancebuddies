// Writes research/ours.json so `node research/verify.mjs` can rebuild src/data/verification.json (npm run verify:data).
import { writeFileSync } from 'fs';
import { baselineData } from '../src/data';
// eslint-disable-next-line
it('dump', () => { writeFileSync('research/ours.json', JSON.stringify(baselineData())); });
