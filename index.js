// index.js

const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const dotenv = require('dotenv');


// Specify the path to the .env file
dotenv.config();


const crypto = require('crypto');


const PORT = process.env.PORT || 3000;
const mongodbstring = process.env.MONGO_URL;
const secretKey = process.env.SECRET_KEY;
console.log(secretKey);




const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads'); // Save uploaded files to the 'uploads' directory
  },
  filename: function (req, file, cb) {
    // Rename files to avoid conflicts and maintain file extensions
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });



// Connect to MongoDB (replace 'mongodb://localhost:27017/mydatabase' with your MongoDB URI)
mongoose.connect(mongodbstring, { useNewUrlParser: true, useUnifiedTopology: true })
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

const FormData = mongoose.model('FormData', formDataSchema);

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
app.use('/uploads', express.static('uploads'));

// Middleware
app.use(bodyParser.json()); // Parse JSON requests

app.get('/', (req, res) => {
  res.send(`<h1>Private API Expo</h1><p>Server is running at ${PORT}</p>`);
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
    const token = jwt.sign({ email: user.email, userId: user._id  }, secretKey, { expiresIn: '1h' });
    res.json({ success: true, message: 'Login successful', userId: user._id,token });

  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.post('/form',authenticateToken,upload.single('image'), async (req, res) => {
  console.log(req.body);
  console.log(req.file);
  
  const { userId, latitude, longitude } = req.body; // Include userId
  const imagepath = req.file.path;
  try {
   

    console.log(userId);
    console.log(latitude);
    console.log(longitude);
    console.log(imagepath);
    const newFormData = new FormData({ userId, latitude, longitude, image:imagepath });
    await newFormData.save();
    res.status(200).json({ success: true, message: 'Form data saved successfully' });
  } catch (error) {
    console.error('Error saving form data:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});


app.get('/data',authenticateToken, async (req, res) => {
  const { userId } = req; // Assuming userId is passed as a query parameter
  console.log(userId);
  // const imageuri = 'http://192.168.177.197:3000/uploads/image-1710614012275.jpeg';
  try {
    const formData = await FormData.find({ userId });
    const formattedData = formData.map(item => ({
     
      latitude: item.latitude,
      longitude: item.longitude,
      imageUrl: `http://192.168.177.197:3000/${item.image}`, // Change this URL according to your server setup
      // Include other fields as needed
    }));
    console.log(formattedData);
    res.status(200).json(formattedData);
  } catch (error) {
    console.error('Error retrieving form data:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});






// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port  ${PORT}`);
});
