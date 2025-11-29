const mongoose = require('mongoose');

// Use MongoDB URI from Railway environment variable
const uri = process.env.MONGO_URI;

mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const db = mongoose.connection;

db.on('connected', () => {
    console.log("Database connected successfully");
});

db.on('error', (err) => {
    console.log("MongoDB connection error: " + err);
});

module.exports = db;
