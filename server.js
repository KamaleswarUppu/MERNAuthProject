const express = require('express');
const dotenv = require('dotenv');
const bodyparser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');
const ejs = require('ejs');
const Detail = require('./model/Detail'); // Ensure this is correct
const session = require('express-session');
const mongodbstore = require('connect-mongodb-session')(session);
const bcryptjs = require('bcryptjs');
const open = require('open');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(bodyparser.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Store for Sessions
const store = new mongodbstore({
    uri: process.env.MONGO_URI,
    collection: "hari"
});

// Session Configuration
app.use(session({
    secret: "this is secret",
    resave: false,
    saveUninitialized: false,
    store: store
}));

// Set up EJS
app.set('view engine', 'ejs');

// Serve Static Files
app.use(express.static('public'));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI).then(() => console.log("MongoDB connection success"))
  .catch((e) => console.error(e));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server connected successfully at ${PORT}`);
    open(`http://localhost:${PORT}`);
});
app.get('/', (req, res) => {
    res.render('login');
});


// Rendering Webpages
app.get('/signup', (req, res) => {
    res.render("register");
});

app.get('/login', (req, res) => {
    res.render("login");
});

app.get('/dashboard', checkAuth, (req, res) => {
    res.render("welcome");
});

// Signup Route
app.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    try {
        let existingUser = await Detail.findOne({ email });

        if (existingUser) {
            console.log("User already exists!");
            return res.redirect('/login');
        }

        const hashedPassword = await bcryptjs.hash(password, 12);

        let newUser = new Detail({
            name,
            email,
            password: hashedPassword
        });

        await newUser.save();
        req.session.personal = newUser.name;
        req.session.isAuthenticated = true;

        res.redirect('/dashboard'); // Redirect to dashboard after signup
    } catch (error) {
        console.error(error);
        res.status(502).json({ message: "Some error occurred" });
    }
});

// Login Route
app.post('/user-login', async (req, res) => {
    const { email, password } = req.body;

    try {
        let user = await Detail.findOne({ email });

        if (!user) {
            console.log("User not found!");
            return res.redirect('/signup');
        }

        const isPasswordValid = await bcryptjs.compare(password, user.password);

        if (!isPasswordValid) {
            console.log("Invalid password!");
            return res.redirect('/login'); // Redirect to login if password is wrong
        }

        req.session.isAuthenticated = true;
        req.session.personal = user.name;

        res.redirect('/dashboard');
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// Middleware for Authentication
function checkAuth(req, res, next) {
    if (req.session.isAuthenticated) {
        return next();
    }
    res.redirect('/login'); // Redirect to login if not authenticated
}

// Logout Route
app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Error logging out");
        }
        res.redirect('/login');
    });
});
