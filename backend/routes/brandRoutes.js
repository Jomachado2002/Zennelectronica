'use strict';

const express = require('express');
const router = express.Router();
const authToken = require('../middleware/authToken');
const {
  listAdminBrandsController,
  syncBrandsController,
  createBrandController,
  updateBrandController,
  deleteBrandController,
  uploadBrandLogoController,
  deleteBrandLogoController,
  publicLogoMapController,
  publicBrandByNameController
} = require('../controller/brand/brandController');

router.get('/brands/logo-map', publicLogoMapController);
router.get('/brands/by-name/:name', publicBrandByNameController);

router.get('/admin/brands', authToken, listAdminBrandsController);
router.post('/admin/brands/sync', authToken, syncBrandsController);
router.post('/admin/brands', authToken, createBrandController);
router.put('/admin/brands/:id', authToken, updateBrandController);
router.delete('/admin/brands/:id', authToken, deleteBrandController);
router.post('/admin/brands/:id/logo', authToken, uploadBrandLogoController);
router.delete('/admin/brands/:id/logo', authToken, deleteBrandLogoController);

module.exports = router;
