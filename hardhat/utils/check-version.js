"use strict";
const semver = require('semver');
const { engines } = require('../package');


const version = engines.node;
if (!semver.satisfies(process.version, version)) {
  console.log('============================================ ERROR ====================================\n');
  console.log(`Required node version ${version} not satisfied with current version ${process.version}.`);
  console.log('\n=======================================================================================');
  process.exit(1);
}
