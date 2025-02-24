const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const {uploadSingle} = require("../config/multer");
const {
  registerController,
  loginController,
  verifyController,
  forgetPassword,
  resetPassword,
  logout,
  getProfile,
  editProfile,
} = require("../controllers/adminController");



 
router.post("/register", registerController);
router.post("/login",  loginController);
router.post("/login",  loginController);
router.post("/confirm/:userID", verifyController);
router.get("/profile",verifyToken, getProfile);
router.put("/edit-user/:userID",verifyToken, uploadSingle,editProfile);
router.post("/forget-password", forgetPassword);
router.post("/reset-password/:token", resetPassword);
router.get("/logout", logout);



module.exports = router;