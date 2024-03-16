// index.js
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const crypto = require('crypto');


const PORT = process.env.PORT || 3000;


// Connect to MongoDB (replace 'mongodb://localhost:27017/mydatabase' with your MongoDB URI)
mongoose.connect('mongodb+srv://yuvraj:PQU5ZWQafjGZqkLi@mycluster.6rux1ja.mongodb.net/?retryWrites=true&w=majority&appName=mycluster', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Error connecting to MongoDB:', err));

// Define user schema and model
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});
const User = mongoose.model('authentication-data', userSchema);


// form data schema
const formDataSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'authentication-data', required: true }, // Link to User model
  latitude: { type: String, required: true },
  longitude: { type: String, required: true },
  image: { type: String, required: true },
  // Other fields...
});


// jwt token validation.

function authenticateToken(req, res, next) {
  const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized: Missing token' });
  }

  jwt.verify(token, secretKey, (err, decodedToken) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Forbidden: Invalid token' });
    }
    req.userId = decodedToken.userId; // Attach userId to request object
    next();
  });
}

// Create an Express app
const app = express();

// Middleware
app.use(bodyParser.json()); // Parse JSON requests

app.get('/', (req, res) => {
  res.send(`<h1>Private API Expo</h1><p>Server is running at http://localhost:${PORT}</p>`);
});

// Provide server information via an API endpoint
app.get('/server-info', (req, res) => {
  res.json({
    message: 'Private API Expo',
    serverAddress: `http://localhost:${PORT}`
  });
});

// Routes
app.post('/auth/user/signup', async (req, res) => {
  const { email, password } = req.body;
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    // Create new user
    const newUser = new User({ email, password: hashedPassword });
    await newUser.save();
    res.status(201).json({ success: true, message: 'User created successfully' });
  } catch (error) {
    console.error('Error signing up:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

const secretKey = crypto.randomBytes(32).toString('hex');


app.post('/auth/user/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    // Compare passwords
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    // Generate JWT token
    const token = jwt.sign({ email: user.email }, secretKey, { expiresIn: '1h' });
    res.json({ success: true, message: 'Login successful', token });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.post('/form',authenticateToken, async (req, res) => {
  const { userId, latitude, longitude, image } = req.body; // Include userId
  try {
    const newFormData = new FormData({ userId, latitude, longitude, image });
    await newFormData.save();
    res.status(200).json({ success: true, message: 'Form data saved successfully' });
  } catch (error) {
    console.error('Error saving form data:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});


app.get('/data',authenticateToken, async (req, res) => {
  const { userId } = req.query; // Assuming userId is passed as a query parameter
  try {
    const formData = await FormData.find({ userId });
    res.status(200).json(formData);
  } catch (error) {
    console.error('Error retrieving form data:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});






// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port  http://localhost:${PORT}`);
});
