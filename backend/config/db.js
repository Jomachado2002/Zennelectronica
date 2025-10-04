const mongoose = require("mongoose");

async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
    } catch (err) {
    }
}

module.exports = connectDB;
