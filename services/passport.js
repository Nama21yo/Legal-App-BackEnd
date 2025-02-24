const User = require("../models/userModel");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20");
const ProfileModel = require("../models/profileModel");
require("dotenv").config();

// Helper function to generate a unique confirmation code
const generateConfirmationCode = async () => {
    let confirmationCode;
    let codeExists = true;

    // Keep generating until we get a unique confirmation code
    while (codeExists) {
        confirmationCode = Math.floor(10000 + Math.random() * 90000); // Generate 5-digit number
        const existingCode = await User.findOne({ confirmationCode }); // Check if the code already exists in the database
        codeExists = existingCode ? true : false; // If code exists, keep generating
    }

    return confirmationCode;
};

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById({ _id: id });
        if (!user) {
            done(null, null);
        }
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

module.exports = passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: "http://localhost:3000/api/user/google/callback",
            passReqToCallback: true,
            scope: ["profile", "email"],
        },
        async (_req, _accessToken, _refreshToken, profile, done) => {
            try {
                // Log the email to ensure we're checking the right one
                console.log("Checking user with email: ", profile.email);

                // Check if user already exists based on email
                const user = await User.findOne({ email: profile.emails[0].value });

                if (user) {
                    // If user exists, log them in and redirect
                    console.log("User already exists, logging in.");
                    return done(null, user._id.toString());
                }

                // If user does not exist, create a new user
                const { name, email, picture } = profile._json;

                // Generate a unique confirmation code
                const confirmationCode = await generateConfirmationCode();

                const newUser = await User.create({
                    fullName: name,
                    email,
                    provider: "Google",
                    avatar: picture,
                    verified: true,
                    confirmationCode, // Assign confirmationCode here
                });

                await ProfileModel.create({ user: newUser._id });

                // Proceed to login the new user
                console.log("New user created, logging in.");
                return done(null, newUser._id.toString());
            } catch (error) {
                console.error("Error during Google OAuth: ", error);
                done(error, null);
            }
        }
    )
);
