import test from 'node:test';
import assert from 'node:assert/strict';
import {generationWorkerReady} from '../server/generation-worker-runtime.js';

test('generation worker is fail-closed until DB, studio, polling and provider key are configured',()=>{
 const pool={};
 assert.equal(generationWorkerReady({},pool).ready,false);
 assert.equal(generationWorkerReady({AI_STUDIO_ENABLED:'true',AI_STUDIO_BACKGROUND_POLLING:'true'},pool).reason,'NO_AI_PROVIDER_KEY');
 assert.deepEqual(generationWorkerReady({AI_STUDIO_ENABLED:'true',AI_STUDIO_BACKGROUND_POLLING:'true',BYTEPLUS_API_KEY:'fixture'},pool),{ready:true,reason:null});
 assert.equal(generationWorkerReady({AI_STUDIO_ENABLED:'true',AI_STUDIO_BACKGROUND_POLLING:'false',BYTEPLUS_API_KEY:'fixture'},pool).reason,'BACKGROUND_POLLING_DISABLED');
});
