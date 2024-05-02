const express = require('express');
const mysql = require('mysql2/promise');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Multer configuration for image upload
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// MySQL Connection Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Middleware
app.use(express.json());

// Routes
// 1. Get all posts with sorting, pagination, filtering, and by tag
app.get('/posts', async (req, res) => {
    try {
      let { sortBy, order, keyword, tag, page, limit } = req.query;
      sortBy = sortBy || 'id';
      order = order || 'ASC';
      page = parseInt(page) || 1;
      limit = parseInt(limit) || 10;
  
      let query = `SELECT * FROM posts`;
  
      // Filtering by keyword
      if (keyword) {
        query += ` WHERE title LIKE '%${keyword}%' OR description LIKE '%${keyword}%'`;
      }
  
      // Filtering by tag
      if (tag) {
        if (keyword) {
          query += ` AND tag = '${tag}'`;
        } else {
          query += ` WHERE tag = '${tag}'`;
        }
      }
  
      // Sorting
      query += ` ORDER BY ${sortBy} ${order}`;
  
      // Pagination
      const offset = (page - 1) * limit;
      query += ` LIMIT ${limit} OFFSET ${offset}`;
  
      const [rows] = await pool.query(query);
      res.json(rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server Error' });
    }
  });
  
  // 2. Insert a post
  app.post('/posts', upload.single('image'), async (req, res) => {
    try {
      const { title, description, tag } = req.body;
      const image = req.file;
  
      if (!title || !description || !tag || !image) {
        return res.status(400).json({ error: 'Please provide title, description, tag, and image' });
      }
  
      // Upload image to Cloudinary
      const cloudinaryResponse = await cloudinary.uploader.upload(image.buffer.toString('base64'));
  
      const imageUrl = cloudinaryResponse.secure_url;
  
      // Insert post into database
      await pool.query('INSERT INTO posts (title, description, tag, image) VALUES (?, ?, ?, ?)', [title, description, tag, imageUrl]);
  
      res.json({ success: true, message: 'Post created successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server Error' });
    }
  });
  


// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
