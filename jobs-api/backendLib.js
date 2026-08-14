'use strict';

const path = require('path');
const Module = require('module');

const BACKEND_ROOT = path.resolve(__dirname, '..', 'backend');
const JOBS_NM = path.join(__dirname, 'node_modules');
const BACKEND_NM = path.join(BACKEND_ROOT, 'node_modules');

process.env.NODE_PATH = [JOBS_NM, BACKEND_NM, process.env.NODE_PATH || '']
  .filter(Boolean)
  .join(path.delimiter);
Module._initPaths();

function fromBackend(rel) {
  return require(path.join(BACKEND_ROOT, rel));
}

module.exports = { BACKEND_ROOT, fromBackend };
