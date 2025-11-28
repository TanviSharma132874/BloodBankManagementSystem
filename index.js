const express = require('express');
const mongoose = require('mongoose');
const app = express();

// FIX 1: Correct port for Render
const port = process.env.PORT || 2007;

// FIX 2: Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log("MongoDB Error:", err));

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');

// IMPORT MODELS
const Donor = require('./model/Donor');
const Recipient = require('./model/Recipient');
const Stock = require('./model/stock');
const User = require('./model/user');
const Camp = require('./model/Camp');

// ------------------ ROUTES ------------------

// Home page
app.get('/', async (req, res) => {
    const upcomingCamps = await Camp.find({
        status: 'upcoming',
        date: { $gte: new Date() }
    }).sort({ date: 1 }).limit(3);
    res.render('User/register', { upcomingCamps });
});

// Register
app.get('/register', async (req, res) => {
    const upcomingCamps = await Camp.find({
        status: 'upcoming',
        date: { $gte: new Date() }
    }).sort({ date: 1 }).limit(3);
    res.render('User/register', { upcomingCamps });
});

app.post('/register', async (req, res) => {
    const { name, email, password, role } = req.body;
    const user = new User({ name, email, password, role });
    await user.save();
    res.redirect('/login');
});

// Login
app.get('/login', async (req, res) => {
    const upcomingCamps = await Camp.find({
        status: 'upcoming',
        date: { $gte: new Date() }
    }).sort({ date: 1 }).limit(3);
    res.render('User/login', { upcomingCamps });
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const ADMIN_EMAIL = 'tanu@gmail.com';
    const ADMIN_PASSWORD = '123';

    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        return res.redirect('/adminDashboard');
    }

    const user = await User.findOne({ email, password });
    if (!user) return res.send('Invalid credentials');

    res.redirect(`/home?userId=${user._id}`);
});

// ------------------ ALL REMAINING ROUTES (unchanged) ------------------
// Put your remaining routes here exactly as they are — NO CHANGE NEEDED
// I won't repeat all to save space, but they stay the SAME.

// ------------------ START SERVER ------------------
app.listen(port, () => {
    console.log('Server running on port:', port);
});
