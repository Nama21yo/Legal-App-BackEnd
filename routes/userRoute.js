const express = require("express");
const router = express.Router();
const requireToken = require("../middlewares/verifyToken");
const { generateJWT } = require("../utils/utils");
const passport = require("passport");
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
  submitSurvey,
  getUserSurveyResonse
} = require("../controllers/userController");
const verifyToken = require("../middlewares/verifyToken");


 
router.post("/register", registerController);
router.post("/login", loginController);
router.post("/confirm/:userID", verifyController);
router.get("/profile", verifyToken, getProfile);
router.put("/edit-user/:userID",verifyToken, uploadSingle,editProfile);
router.post("/forget-password", forgetPassword);
router.post("/reset-password/:token", resetPassword);
router.get("/logout", logout);
router.post('/survey/submit-survey', submitSurvey);
router.get('/survey/:userId', getUserSurveyResonse);

router.get("/failed",(req,res)=>{
  return res.status(401).json({msg:"failed to authorized using google"});
})


router.get("/success", (req,res) => {
  const token =  generateJWT(req.user._id,req.user.role);
  return res.redirect(`http://localhost:8081/home?token=${token}`)
})


router.get("/google",passport.authenticate("google", { scope: ['email','profile'] }))
router.get("/google/callback", passport.authenticate("google",{
  failureRedirect: '/api/user/failed',
  successRedirect: "/api/user/success"
}))

module.exports = router;