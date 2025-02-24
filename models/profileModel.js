const mongoose = require("mongoose");

const profileSchema = mongoose.Schema({
    user:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    address:{
        type: [{name:String,phoneNo: String,location: String}]
    }
})

const ProfileModel = mongoose.model("Profile", profileSchema);

module.exports = ProfileModel;