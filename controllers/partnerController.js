const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Partner = require("../models/partnerModel");
const Business = require("../models/businessModel");
const mongoose = require("mongoose");

const short = require("short-uuid");
const {
  sendConfirmationEmail,
  forgetPasswordEmail,
} = require("../config/mailTransport");
const cloudinary = require("../config/cloudinary");

//=========================Register user=======================================
const registerController = async (req, res) => {
  try {
    const { fullName, email, password, password2, businessId } = req.body;

    // Validate businessId
    if (!mongoose.Types.ObjectId.isValid(businessId)) {
      return res.status(400).json({ message: 'Invalid business ID' });
    }

    // Check if business exists
    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }

    // Check if user with the same email already exists
    const existingUser = await Partner.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    if (password !== password2) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    const confirmationCode = Math.floor(10000 + Math.random() * 90000); // generate 5 digits number
    console.log(confirmationCode);

    // Create the partner
    const partner = await Partner.create({
      fullName,
      email,
      password: hashedPassword,
      confirmationCode: confirmationCode,
      businessId: business._id, // Link to the business
    });

    const userID = partner._id.toString();
    sendConfirmationEmail(
      req.headers.host,
      partner.firstName,
      partner.email,
      partner.confirmationCode,
      userID
    );

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: partner._id,
        email: partner.email,
        fullName: partner.fullName,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1hr" }
    );

    return res.status(201).json({
      message: 'User registered successfully',
      userId: partner._id,
      businessId: partner.businessId,
      token: token,
    });
  } catch (error) {
    console.error('Error registering partner:', error);
    return res.status(500).json({ message: 'An error occurred during registration' });
  }
};
  

//================ Verify controller ===========================
const verifyController = async (req, res) => {
  try {
    const {userID} = req.params;
    const {confirmationCode} = req.body;
    const user = await Partner.findOne({
      _id: userID,
    });
    console.log(user, userID);

    if (!user) {
      return res.status(404).send({message: "User Not Found."});
    }

    if (confirmationCode === user.confirmationCode) {
      user.status = "Active";
      await user.save();

      return res.status(200).json({message: "User successfully verified"});
    }
    return res.status(401).json({message: "Invalid Code"});
  } catch (error) {
    console.error("Error verifying user: ", error);
    res.status(500).json({message: "An error occurred while verifying"});
  }
};

//================== LOGIN USER =======================
const loginController = async (req, res) => {
    const { email, password } = req.body;
  
    try {
      // Find the partner and populate the business details
      const foundPartner = await Partner.findOne({ email }).populate("businessId");
  
      if (!foundPartner) {
        return res.status(404).json({
          message: "Invalid Credentials - User not found", // In production, use 'Invalid Credentials'
        });
      }
  
      // Check account status
      if (foundPartner.status !== "Active") {
        return res.status(401).json({
          message: "Pending Account. Please Verify Your Email",
        });
      }
  
      // Verify the password
      const checkPassword = await bcrypt.compare(password, foundPartner.password);
      if (!checkPassword) {
        return res.status(401).json({
          message: "Invalid Credentials - Wrong password", // In production, use 'Invalid Credentials'
        });
      }
  
      // Generate JWT token
      const token = jwt.sign(
        {
          userId: foundPartner._id,
          email: foundPartner.email,
          fullName: foundPartner.fullName,
        },
        process.env.JWT_SECRET,
        { expiresIn: "1hr" }
      );
  
      // Extract the first name from fullName
      const firstName = foundPartner.fullName.split(" ")[0];
  
      // Respond with token and user details, including business
      return res.status(200).json({
        message: "Welcome to The Legacy",
        token: token,
        user: {
          id: foundPartner._id,
          email: foundPartner.email,
          firstName: firstName, // Include the first name
          business: foundPartner.businessId, // Includes populated business details
        },
      });
    } catch (error) {
      console.error("Error during login:", error);
      return res.status(500).json({
        message: "Error While Trying To Login, Try Again",
      });
    }
  };
  
//================ FORGET PASSWORD ===============
const forgetPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Check if user with the given email exists
    const user = await Partner.findOne({ email });
    if (!user) {
      return res.status(404).json({
        error: `User with email '${email}' is not found`,
      });
    }

    // Generate 4-digit reset code
    const resetToken = Math.floor(1000 + Math.random() * 9000); // e.g., 1234

    // Save the reset code and expiration time in the user model
    user.resetPasswordCode = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour from now
    await user.save();

    forgetPasswordEmail(req.headers.host, user.firstName, email, resetToken);



    // Return a success response
    return res.status(200).json({
      message: 'Password reset code sent to your email.',
    });
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return res.status(500).json({
      error: 'An error occurred while sending the password reset email.',
    });
  }
};

//==================== RESET PASSWORD =====================
const resetPassword = async (req, res) => {
  try {
    const { code } = req.params; // Reset code passed in URL params
    const { password, confirmPassword } = req.body;

    // Ensure both passwords are provided
    if (!password || !confirmPassword) {
      return res.status(400).json({
        error: "Both password and confirm password are required.",
      });
    }

    // Ensure passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({
        error: "Passwords do not match.",
      });
    }

    // Find the user by the reset code and ensure it is not expired
    const user = await Partner.findOne({
      resetPasswordCode: code,
      resetPasswordExpires: { $gt: Date.now() },
    });

    // If no user is found or the reset code is expired
    if (!user) {
      return res.status(400).json({
        error: "Invalid or expired reset code.",
      });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user's password and clear reset code fields
    user.password = hashedPassword;
    user.resetPasswordCode = undefined;
    user.resetPasswordExpires = undefined;

    // Save changes
    await user.save();

    // Return a success response
    return res.status(200).json({
      message: "Password reset successful!",
    });
  } catch (error) {
    console.error("Error resetting password", error);
    res.status(500).json({
      error: "An error occurred while resetting the password.",
    });
  }
};

//================= LOG OUT USER ======================
const logout = (req, res, next) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
  });

  return res.json({
    message: "user logged out",
  });
};
//================ GET USER ====================
const getProfile = async (req, res) => {
  console.log(req.user);
  const userID = req.user.email;
  console.log(userID);

  try {
    const user = await Partner.findOne({email: userID});

    if (!user) {
      return res.status(404).json({message: "User not found"});
    }

    res.status(200).json({user});
  } catch (error) {
    res.status(500).json({message: "Error while fetching profile"});
  }
};

//================== EDIT USER================
const editProfile = async (req, res) => {

  try {
    const {userID} = req.params;
    const user = await Partner.findOne({
      _id: userID,
    });
    if (!user) {
      return res.status(404).json({message: "User not found"});
    }

    user.fullName = req.body.fullName || user.fullName;
    
    if (req.file) {
      // If a file is present, upload the new profile photo to cloudinary
      const uploadResult = await cloudinary.uploader.upload(req.file.path);
      user.profileImage = uploadResult.secure_url; // Assign the new profile photo URL
    }


    await user.save();

    res.status(200).json({message: "Profile Updated Successfully", user});
  } catch (error) {
    res.status(500).json({message: "Error while updating profile"});
  }
};

module.exports = {
  loginController,
  registerController,
  verifyController,
  forgetPassword,
  resetPassword,
  logout,
  getProfile,
  editProfile,
};
