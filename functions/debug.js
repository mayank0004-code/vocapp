const wtfnode = require('wtfnode');
console.log('Requiring firebase-functions...');
require('firebase-functions/v2/https');
console.log('Required! Waiting 3 seconds to dump event loop...');

setTimeout(() => {
  console.log('Dumping event loop...');
  wtfnode.dump();
  process.exit(0);
}, 3000);
