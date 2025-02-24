const multer = require("multer");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Temporary folder
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only images are allowed."), false);
  }
};



const upload = multer({ storage, fileFilter });

const uploadFields = upload.fields([
  { name: "businessImages", maxCount: 10 },
  { name: "headstoneImage", maxCount: 10 },
]);
// Export upload logic for single or multiple files
module.exports = {
  uploadSingle: upload.single("profileImage"), // For single file upload
  uploadFields 
};
