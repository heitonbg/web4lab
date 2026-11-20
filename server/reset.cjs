const { copyFileSync } = require('node:fs');
const { join } = require('node:path');

if (require.main === module) reset();

function reset() {
  copyFileSync(join(__dirname, 'db.seed.json'), join(__dirname, '..', 'db.json'));
  console.log('db.json восстановлен из server/db.seed.json');
}

module.exports = reset;
