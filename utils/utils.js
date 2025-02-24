const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const encryptPassword = async (password) => {
    const salt = await bcrypt.genSalt(10)
    return bcrypt.hash(password, salt);
}

const comparePassword = async (password, dbPassword = "") => {
    return bcrypt.compare(password, dbPassword);
}


const generateJWT = (userId, role = '', expires = process.env.JWT_EXPIRES) => {
    const token = jwt.sign({ userId, role }, process.env.JWT_SECRET, {  expiresIn: '24h' });
    return token;
}

const verifyToken = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET);
}


const generateOtp = () => {
    const otp = Math.floor(Math.random() * 9000) + 1000; // Generates a number between 1000 and 9999
    return otp;
}

function generateRoomId(userA, userB) {
    return [userA, userB].sort().join('_'); // Sort to ensure consistent roomId generation
}


module.exports = { encryptPassword, comparePassword, generateJWT, verifyToken, generateOtp, generateRoomId }