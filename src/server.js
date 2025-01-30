const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const morgan = require("morgan");
const connectDB = require("./config/db");
const methodOverride = require("method-override");

dotenv.config();
connectDB();

const app = express();

// ✅ Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(methodOverride("_method"));

// ✅ Set EJS as view engine
app.set("view engine", "ejs");
app.set("views", "views");

// ✅ Import Routes (Check if paths exist)
try {
    const categoryRoutes = require("./routes/categoryRoutes");
    const subCategoryRoutes = require("./routes/subCategoryRoutes");
    const itemRoutes = require("./routes/itemRoutes");

    app.use("/api/v1/categories", categoryRoutes);
    app.use("/api/v1/subcategories", subCategoryRoutes);
    app.use("/api/v1/items", itemRoutes);
} catch (error) {
    console.error("❌ Error loading routes:", error);
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// ✅ Home Route (For Rendering Index Page)
app.get("/", (req, res) => {
    res.render("index", { message: "Welcome to the Menu Management System!" });
});

// ✅ Global Error Handler
app.use((err, req, res, next) => {
    console.error("❌ Server Error:", err.stack);
    res.status(err.status || 500).json({ message: err.message || "Server Error" });
});

// ✅ Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
