'use strict';

const express = require('express');
const adminAuth = require('../middleware/adminAuth');
const controller = require('../controller/product/reelJobController');

const router = express.Router();

router.use(adminAuth);
router.get('/trials', controller.listTrials);
router.get('/', controller.listJobs);
router.post('/', controller.createJob);
router.get('/:id/stream', controller.streamJob);
router.get('/:id', controller.getJob);

module.exports = router;
