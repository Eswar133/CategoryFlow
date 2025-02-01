require('dotenv').config(); // Load environment variables
const express = require('express');
const mongoose = require('mongoose');
const ejs = require('ejs');
const methodOverride = require('method-override');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');

const app = express();

// Database connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost/menu-management';
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log('MongoDB Connection Error:', err));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Routes
const categoryRoutes = require('./routes/categoryRoutes');
const subCategoryRoutes = require('./routes/subCategoryRoutes');
const itemRoutes = require('./routes/itemRoutes');

app.use('/categories', categoryRoutes);
app.use('/subcategories', subCategoryRoutes);
app.use('/items', itemRoutes);

// Home Route
app.get('/', (req, res) => {
  res.redirect('/categories');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));