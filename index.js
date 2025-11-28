const express = require('express');
const mongoose = require('mongoose');

const port = process.env.PORT || 2007;

const app = express();
app.use(express.static('public'));
const db = require('./config/database');


const Donor = require('./model/Donor');
const Recipient = require('./model/Recipient');
const Stock = require('./model/stock');
const User = require('./model/user');
const Camp = require('./model/Camp');

app.set('view engine', 'ejs');

app.use(express.urlencoded({ extended: true }));

app.get('/', async (req, res) => {
    const upcomingCamps = await Camp.find({ 
        status: 'upcoming', 
        date: { $gte: new Date() } 
    }).sort({ date: 1 }).limit(3);
    res.render('User/register', { upcomingCamps });
});
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
app.get('/login', async (req, res) => {
    const upcomingCamps = await Camp.find({ 
        status: 'upcoming', 
        date: { $gte: new Date() } 
    }).sort({ date: 1 }).limit(3);
    res.render('User/login', { upcomingCamps });
});

app.post('/login', async (req, res)=>{
    const { email, password } = req.body;
    const ADMIN_EMAIL = 'tanu@gmail.com';
    const ADMIN_PASSWORD = '123';

    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        // Static admin login
        res.redirect('/adminDashboard');
    } else {
        const user = await User.findOne({ email, password });
        if (user) {
            // Pass user id in query string for /home
            res.redirect(`/home?userId=${user._id}`);
        } else {
            res.send('Invalid credentials');
        }
    }
});

// Donor Registration (User)
app.get('/donorForm', (req, res) => {
    res.render('User/donorForm');
});
app.post('/donorForm', async (req, res) => {
    const { name, age, gender, bloodGroup, contact, email, address, donatedAT } = req.body;
    const donor = new Donor({ name, age, gender, bloodGroup, contact, email, address, donatedAT });
    await donor.save();
    // Automatically add 1 unit to stock for donor's blood group
    let stock = await Stock.findOne({ bloodGroup });
    if (stock) {
        stock.units += 1;
        await stock.save();
    } else {
        stock = new Stock({ bloodGroup, units: 1 });
        await stock.save();
    }
    res.redirect('/home');
});

// Recipient Registration (User)
app.get('/requestForm', (req, res) => {
    res.render('User/requestForm');
});
app.post('/requestForm', async (req, res) => {
    const { name, age, gender, bloodGroupNeeded, unitsNeeded, contact, hospital } = req.body;
    const recipient = new Recipient({ name, age, gender, bloodGroupNeeded, unitsNeeded, contact, hospital, status: 'pending' });
    await recipient.save();
    // Show pending message to user
    let message = 'Your request is pending admin approval.';
    res.render('User/requestStatus', { message });
});
app.post('/request', async (req, res) => {
    const { name, age, gender, bloodGroupNeeded, unitsNeeded, contact, hospital } = req.body;
    const recipient = new Recipient({ name, age, gender, bloodGroupNeeded, unitsNeeded, contact, hospital });
    await recipient.save();
    res.redirect('/home');
});



// Admin Login
app.get('/adminLogin', (req, res) => {
    res.render('admin/login');
});
app.post('/adminLogin', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email, password, role: 'admin' });
    if (user) {
        res.redirect('/adminDashboard');
    } else {
        res.send('Invalid admin credentials');
    }
});

// Admin Dashboard
app.get('/adminDashboard', async (req, res) => {
    const donors = await Donor.find({});
    const recipients = await Recipient.find({});
    const stock = await Stock.find({});
    const camps = await Camp.find({ status: 'upcoming', date: { $gte: new Date() } });
    const totalDonors = donors.length;
    const availableUnits = stock.reduce((sum, item) => sum + (item.units || 0), 0);
    const pendingRequests = await Recipient.countDocuments({ status: 'pending' });
    const upcomingCamps = camps.length;
    res.render('admin/dashboard', { donors, recipients, stock, totalDonors, availableUnits, pendingRequests, upcomingCamps });
});
// Recipients List (Admin)
app.get('/admin/recipients', async (req, res) => {
    const recipients = await Recipient.find({});
    res.render('admin/recipients', { recipients });
});

// Donor List (Admin)
app.get('/admin/donors', async (req, res) => {
    const donors = await Donor.find({});
    res.render('admin/donorlist', { donors });
});
app.get('/admin/donors', async (req, res) => {
    const donors = await Donor.find({});
    res.render('admin/donorlist', { donors });
});
app.post('/admin/donors', async (req, res) => {
    const { name, age, gender, bloodGroup, contact, email, address, donatedAT } = req.body;
    const donor = new Donor({ name, age, gender, bloodGroup, contact, email, address, donatedAT });
    await donor.save();
    res.redirect('/admin/donors');
});

// Stock List (Admin)
app.get('/admin/stock', async (req, res) => {
    const stock = await Stock.find({});
    res.render('admin/stock', { stock });
});
app.get('/stockList', async (req, res) => {
    const stock = await Stock.find({});
    res.render('admin/stock', { stock });
});

// Add Stock (Admin)
app.get('/addStock', (req, res) => {
    res.render('admin/addStock');
});
app.post('/admin/stock', async (req, res) => {
    const { bloodGroup, units } = req.body;
    let stock = await Stock.findOne({ bloodGroup });
    const unitsNum = parseInt(units);
    if (stock) {
        stock.units += unitsNum;
        await stock.save();
    } else {
        stock = new Stock({ bloodGroup, units: unitsNum });
        await stock.save();
    }
    res.redirect('/stockList');
});

// Admin: View and manage blood requests
app.get('/admin/requests', async (req, res) => {
    const requests = await Recipient.find({});
    res.render('admin/requests', { requests });
});

app.post('/admin/requests/:id/approve', async (req, res) => {
    const requestId = req.params.id;
    const request = await Recipient.findById(requestId);
    let message = '';
    if (request && request.status === 'pending') {
        let stock = await Stock.findOne({ bloodGroup: request.bloodGroupNeeded });
        if (stock && stock.units >= request.unitsNeeded) {
            stock.units -= request.unitsNeeded;
            await stock.save();
            request.status = 'approved';
            await request.save();
            message = 'Request approved and stock updated.';
        } else {
            message = 'Not enough stock to approve this request.';
        }
    } else {
        message = 'Request is not pending or does not exist.';
    }
    // Pass message to requests page
    const requests = await Recipient.find({});
    res.render('admin/requests', { requests, message });
});

app.post('/admin/requests/:id/reject', async (req, res) => {
    const requestId = req.params.id;
    const request = await Recipient.findById(requestId);
    let message = '';
    if (request && request.status === 'pending') {
        request.status = 'rejected';
        await request.save();
        message = 'Request rejected.';
    } else {
        message = 'Request is not pending or does not exist.';
    }
    const requests = await Recipient.find({});
    res.render('admin/requests', { requests, message });
});

// Home page route
app.get('/home', async (req, res) => {
    const userId = req.query.userId;
    if (userId) {
        const user = await User.findById(userId);
        // Find requests by user email (assuming email is unique)
        const requests = await Recipient.find({ email: user.email });
        res.render('User/home', { user, requests });
    } else {
        res.render('User/home');
    }
});
app.post('/home', (req, res) => {
    res.render('User/home');
});

// Admin logout
app.post('/admin/logout', (req, res) => {
    res.render('admin/logout');
});

// Camp Management Routes
// View all camps (Admin)
app.get('/admin/camps', async (req, res) => {
    const camps = await Camp.find({}).sort({ date: 1 });
    res.render('admin/camps', { camps });
});

// Add camp form (Admin)
app.get('/admin/camps/add', (req, res) => {
    res.render('admin/addCamp');
});

// Create new camp (Admin)
app.post('/admin/camps', async (req, res) => {
    const { name, location, date, time, organizer, contact, description } = req.body;
    const camp = new Camp({ name, location, date, time, organizer, contact, description });
    await camp.save();
    res.redirect('/admin/camps');
});

// Delete camp (Admin)
app.post('/admin/camps/:id/delete', async (req, res) => {
    await Camp.findByIdAndDelete(req.params.id);
    res.redirect('/admin/camps');
});

// Add sample camps for testing
app.get('/admin/camps/sample', async (req, res) => {
    const sampleCamps = [
        {
            name: 'City Hospital Blood Drive',
            location: 'City Hospital, Main Street',
            date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
            time: '9:00 AM - 4:00 PM',
            organizer: 'City Hospital',
            contact: '+1-555-0123',
            description: 'Annual blood donation camp to help patients in need.'
        },
        {
            name: 'Community Center Blood Camp',
            location: 'Community Center, Park Avenue',
            date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
            time: '10:00 AM - 3:00 PM',
            organizer: 'Red Cross Society',
            contact: '+1-555-0456',
            description: 'Community blood donation drive for local hospitals.'
        },
        {
            name: 'University Blood Donation Drive',
            location: 'State University Campus',
            date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days from now
            time: '8:00 AM - 5:00 PM',
            organizer: 'Student Health Services',
            contact: '+1-555-0789',
            description: 'Student-organized blood donation drive for the community.'
        }
    ];
    
    await Camp.insertMany(sampleCamps);
    res.redirect('/admin/camps');
});

// View upcoming camps with details (Admin)
app.get('/admin/upcoming-camps', async (req, res) => {
    const upcomingCamps = await Camp.find({ 
        status: 'upcoming', 
        date: { $gte: new Date() } 
    }).sort({ date: 1 });
    res.render('admin/upcomingCamps', { upcomingCamps });
});

app.listen(port, () => {
    console.log('Server started at Port:' + port);
});