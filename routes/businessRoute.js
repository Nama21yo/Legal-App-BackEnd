const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/verifyToken');
const {uploadFields} = require('../config/multer');

const { 
    createBusinessController, 
    deleteBusinessController, 
    updateBusinessController, 
    getBusinessesController,
    contactedBusinessController,
    getContactedBusinessesController,
    checkBusinessContactStatus,
    deleteBusinessImagesController,
    getRecentBusinessController
 } = require('../controllers/businessController');


router.post('/', uploadFields, createBusinessController)  
router.get('/:category', getBusinessesController);
router.put('/:id', uploadFields, updateBusinessController);
router.delete('/:id', verifyToken, deleteBusinessController);
router.post('/create-contact', contactedBusinessController)
router.get('/:userId', getContactedBusinessesController)
router.get('/contact-status/:userId/:businessId', checkBusinessContactStatus);
router.delete('/:id/images', deleteBusinessImagesController);
router.get('/recent', getRecentBusinessController)

module.exports = router;