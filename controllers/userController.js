const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/userModel");
const SurveyResponse = require("../models/surveyModel");
const short = require("short-uuid");
const {
  sendConfirmationEmail,
  forgetPasswordEmail,
} = require("../config/mailTransport");
const cloudinary = require("../config/cloudinary");

//=========================Register user=======================================
const registerController = async (req, res) => {
  try {
    const {
      fullName,
      email,
      password,
      password2,
    } = req.body;

    // Check if user with the same email already exists
    const existingUser = await User.findOne({
      email: email,
    });
    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }
    if (password !== password2) {
      return res.status(400).json({
        message: "The passwords do not match",
      });
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate confirmation code
    const confirmationCode = Math.floor(10000 + Math.random() * 90000); // generate 5 digits number
    console.log(confirmationCode);

    // Create and save a new user
    const user = await User.create({
      fullName,
      email,
      password: hashedPassword,
      confirmationCode: confirmationCode,
      status: "pending",
    });

    const userID = user._id.toString();
    sendConfirmationEmail(
      req.headers.host,
      user.firstName, 
      user.email,
      user.confirmationCode,
      userID
    );

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        fullName: user.fullName,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1hr",
      }
    );

    // Return a success response with the token
    return res.status(201).json({
      message: "User registered successfully",
      userId: userID,
      token: token,
    });
  } catch (error) {
    // Handling errors
    console.error("Error registering user: ", error);
    return res.status(500).json({
      message: "An error occurred during registration",
      error: error.message,
    });
  }
};

//================ Verify controller ===========================
const verifyController = async (req, res) => {
  try {
    const {userID} = req.params;
    const {confirmationCode} = req.body;
    const user = await User.findOne({
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
    res.status(500).json({message: "An error occurred while verifying", error: error.message});
  }
};

//================== LOGIN USER =======================
const loginController = async (req, res) => {
  const {email, password} = req.body;

  try {
    const foundUser = await User.findOne({
      email: email,
    });

    if (!foundUser) {
      return res.status(404).json({
        message: "Invalid Credentials - User not found",
      });
    }

    //check verification
    if (foundUser.status !== "Active") {
      return res.status(401).send({
        message: "Pending Account. Please Verify Your Email",
      });
    }

    const checkPassword = await bcrypt.compare(password, foundUser.password);

    if (!checkPassword) {
      return res.status(401).json({
        message: "Invalid Credentials - Wrong password",
      });
    } else {
      const token = jwt.sign(
        {
          userId: foundUser._id,
          email: foundUser.email,
          fullName: foundUser.fullName,
      
        },
        process.env.JWT_SECRET,
        {
          expiresIn: "1hr",
        }
      );

     // Extract the first name from the fullName
     const firstName = foundUser.fullName.split(' ')[0];

     return res.status(200).json({
       message: "Welcome to The Legacy",
       token: token,
       user: {
         id: foundUser._id,
         email: foundUser.email,
         firstName: firstName, // Include the first name
       },
     });
   }
  } catch (error) {
    console.error("Error logging in user: ", error);
    return res.status(500).json({
      message: "Error While Trying To Login, Try Again",
      error: error.message,
    });
  }
};

//================ FORGET PASSWORD ===============
const forgetPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Check if user with the given email exists
    const user = await User.findOne({ email });
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
      details: error.message,
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
    const user = await User.findOne({
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
      details: error.message,
    });
  }
};

//================= LOG OUT USER ======================
const logout = (req, res, next) => {
  req.logout(function (err) {
    if (err) {
      console.error("Error logging out user: ", err);
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
    const user = await User.findOne({email: userID});

    if (!user) {
      return res.status(404).json({message: "User not found"});
    }

    res.status(200).json({user});
  } catch (error) {
    console.error("Error fetching user profile: ", error);
    res.status(500).json({message: "Error while fetching profile", error: error.message});
  }
};

//================== EDIT USER================
const editProfile = async (req, res) => {
  try {
    const {userID} = req.params;
    const user = await User.findOne({
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
    console.error("Error updating user profile: ", error);
    res.status(500).json({message: "Error while updating profile", error: error.message});
  }
};

const submitSurvey = async (req, res) => {
  const { userId, responses } = req.body;

  try {
    // Validate userId exists
    const user = await User.findById(userId);
    if (!user) {
        return res.status(404).json({ error: 'User not found.' });
    }

    if (!userId || !responses || !Array.isArray(responses)) {
      return res.status(400).json({ error: 'Invalid request data' });
    }

    const surveyResponse = new SurveyResponse({ userId, responses });
    await surveyResponse.save();
    res.status(201).json({ message: 'Survey responses saved successfully!' });
  } catch (error) {
    console.error("Error submitting survey responses: ", error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};

const getUserSurveyResonse = async (req, res) => {
  try {
    const surveyResponses = await SurveyResponse.findOne({ userId: req.params.userId });
    if (!surveyResponses) {
      return res.status(404).json({ error: 'No survey responses found for this user' });
    }
    res.status(200).json(surveyResponses);
  } catch (error) {
    console.error("Error fetching survey responses: ", error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
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
  submitSurvey,
  getUserSurveyResonse,
};
