// server.js

// Import dependencies
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config();

// Create an instance of Express
const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON data
app.use(express.json());
app.use(cors()); // This will allow all origins by default

// Create MySQL connection pool (change these values based on your RDS setup)
const db = mysql.createPool({
  host: process.env.DB_HOST, // RDS endpoint (e.g., mydb-instance.cxjgd9wmbpxz.us-east-1.rds.amazonaws.com)
  user: process.env.DB_USER, // RDS master username (e.g., admin)
  password: process.env.DB_PASSWORD, // RDS master password
  database: process.env.DB_NAME, // Database name (e.g., UsersBlogs)
});

// Test MySQL connection
db.getConnection((err) => {
  if (err) {
    console.error('Error connecting to the database:', err.stack);
    return;
  }
  console.log('Connected to the database');
});

app.get('/', (req, res) => {
  res.send('Hello, World!');
});


app.post('/login', (req, res) => {
    const { username, email, password } = req.body;
  
    // Log incoming request data
    console.log('Login request data:', req.body);
  
    // Validation
    if (!username && !email) {
      return res.status(400).json({ message: 'Username or email is required.' });
    }
    if (!password) {
      return res.status(400).json({ message: 'Password is required.' });
    }
  
    // Determine which identifier (username or email) to check
    const query = username 
      ? 'SELECT * FROM users WHERE username = ?' 
      : 'SELECT * FROM users WHERE email = ?';
  
    const identifier = username || email;  // Use either username or email based on the input
  
    // Log the query for debugging
    console.log('Running query:', query, [identifier]);
  
    // Check if the user exists based on the provided identifier (username or email)
    db.query(query, [identifier], (err, result) => {
      if (err) {
        console.error('Error checking user:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }
      if (result.length === 0) {
        return res.status(404).json({ message: 'User not found.' });
      }
  
      // User found, now compare passwords
      const user = result[0];  // Assuming the result is an array of users (should only be 1)
      if (user.password !== password) {
        return res.status(401).json({ message: 'Incorrect password.' });
      }
  
      // If login is successful, send a success message
      console.log('Login successful:', user);
      res.status(200).json({ message: 'Login successful', userId: user.user_id, username: user.username });
    });
});

// Signup route to create a new user
app.post('/signup', (req, res) => {
  const { username, email, password } = req.body;

  // Log incoming request data
  console.log('Signup request data:', req.body);

  // Validation
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Username, email, and password are required.' });
  }

  // Check for existing username
  const checkUsernameQuery = 'SELECT * FROM users WHERE username = ?';
  console.log('Running query:', checkUsernameQuery, [username]); // Log the query
  db.query(checkUsernameQuery, [username], (err, result) => {
    if (err) {
      console.error('Error checking for existing username:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    if (result.length > 0) {
      return res.status(400).json({ message: 'Username already exists.' });
    }

    // Check for existing email
    const checkEmailQuery = 'SELECT * FROM users WHERE email = ?';
    console.log('Running query:', checkEmailQuery, [email]); // Log the query
    db.query(checkEmailQuery, [email], (err, result) => {
      if (err) {
        console.error('Error checking for existing email:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }
      if (result.length > 0) {
        return res.status(400).json({ message: 'Email already exists.' });
      }

      // If username and email are unique, proceed with user creation
      const query = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
      console.log('Running query:', query, [username, email, password]); // Log the query
      db.query(query, [username, email, password], (err, result) => {
        if (err) {
          console.error('Error inserting user into database:', err);
          return res.status(500).json({ message: 'Internal server error' });
        }

        console.log('User created successfully:', result);
        res.status(201).json({ message: 'User created successfully', userId: result.insertId });
      });
    });
  });
});

// Route to create a new blog for a user
app.post('/blogs', (req, res) => {
  const { user_id, title, content } = req.body;

  // Log incoming request data
  console.log('Blog creation request data:', req.body);

  // Validation
  if (!user_id || !title || !content) {
    return res.status(400).json({ message: 'User ID, title, and content are required.' });
  }

  // Check if the user exists
  const checkUserQuery = 'SELECT * FROM users WHERE user_id = ?'; // Ensure user_id is 'id'
  console.log('Running query:', checkUserQuery, [user_id]); // Log the query
  db.query(checkUserQuery, [user_id], (err, result) => {
    if (err) {
      console.error('Error checking user existence:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    if (result.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Insert the new blog for the user
    const insertBlogQuery = 'INSERT INTO blogs (user_id, title, content) VALUES (?, ?, ?)';
    console.log('Running query:', insertBlogQuery, [user_id, title, content]); // Log the query
    db.query(insertBlogQuery, [user_id, title, content], (err, result) => {
      if (err) {
        console.error('Error inserting blog into database:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }

      console.log('Blog created successfully:', result);
      res.status(201).json({ message: 'Blog created successfully', blogId: result.insertId });
    });
  });
});

// Route to get all blogs of a specific user
app.get('/blogs/:userId', (req, res) => {
  const { userId } = req.params;

  // Log incoming request data
  console.log('Fetching blogs for user ID:', userId);

  // Query to get all blogs by a specific user
  const getBlogsQuery = 'SELECT * FROM blogs WHERE user_id = ?';
  console.log('Running query:', getBlogsQuery, [userId]); // Log the query
  db.query(getBlogsQuery, [userId], (err, result) => {
    if (err) {
      console.error('Error retrieving blogs:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    if (result.length === 0) {
      return res.status(404).json({ message: 'No blogs found for this user.' });
    }

    console.log('Blogs retrieved successfully:', result);
    res.status(200).json({ blogs: result });
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
