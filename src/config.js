const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const connect = mongoose.connect("mongodb://localhost:27017/Idea_A");

connect.then(() => {
    console.log("Database connected successfully");
})
.catch(() => {
    console.log("Databases cannot be connected");
});

const LoginSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true // Username should be unique
    },
    password: {
        type: String,
        required: true
    },
    traversalString: {
        type: String,
        required: true // Optional field to store the traversal string
    }
});

// Middleware to hash the password before saving
LoginSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
        const saltRounds = 10;
        this.password = await bcrypt.hash(this.password, saltRounds);
    }
    next();
});


const collection = new mongoose.model("my_ideas", LoginSchema);

module.exports = collection;