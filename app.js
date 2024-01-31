// Load environment variables from the .env file
require("dotenv").config();

// Import necessary libraries and modules
const createError = require("http-errors");  // Module for creating HTTP errors
const express = require("express");  // Express.js is a web application framework for Node.js
const path = require("path");  // Node.js module for working with file paths
const cookieParser = require("cookie-parser");  // Middleware for parsing cookies
const logger = require("morgan");  // HTTP request logger middleware
const mongoose = require("mongoose");  // Mongoose is an ODM library for MongoDB
const session = require("express-session");  // Session middleware for Express
const passport = require("passport");  // Authentication middleware
const flash = require("connect-flash");  // Middleware for handling flash messages
const Category = require("./models/category");  // Import Category model
const MongoStore = require("connect-mongo")(session);  // MongoDB session store
const connectDB = require("./config/db");  // Database connection configuration

// Create an instance of the Express application
const app = express();

// Configure passport for authentication
require("./config/passport");

// Connect to the MongoDB database
connectDB();

// Set up view engine
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Define admin routes
const adminRouter = require("./routes/admin");
app.use("/admin", adminRouter);

// Configure middleware and static file serving
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// Configure session handling
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({
      mongooseConnection: mongoose.connection,
    }),
    cookie: { maxAge: 60 * 1000 * 60 * 3 }, // Session expires after 3 hours
  })
);

// Configure flash messages and passport authentication
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

// Set global variables across routes
app.use(async (req, res, next) => {
  try {
    res.locals.login = req.isAuthenticated();
    res.locals.session = req.session;
    res.locals.currentUser = req.user;
    const categories = await Category.find({}).sort({ title: 1 }).exec();
    res.locals.categories = categories;
    next();
  } catch (error) {
    console.log(error);
    res.redirect("/");
  }
});

// Add breadcrumbs to the request object
const getBreadcrumbs = function (url) {
  var rtn = [{ name: "Home", url: "/" }],
    acc = "",
    arr = url.substring(1).split("/");

  for (i = 0; i < arr.length; i++) {
    acc = i !== arr.length - 1 ? acc + "/" + arr[i] : null;
    rtn[i + 1] = {
      name: arr[i].charAt(0).toUpperCase() + arr[i].slice(1),
      url: acc,
    };
  }
  return rtn;
};

// Middleware to add breadcrumbs to the request object
app.use(function (req, res, next) {
  req.breadcrumbs = getBreadcrumbs(req.originalUrl);
  next();
});

// Configure routes for different modules
const indexRouter = require("./routes/index");
const productsRouter = require("./routes/products");
const usersRouter = require("./routes/user");
const pagesRouter = require("./routes/pages");
app.use("/products", productsRouter);
app.use("/user", usersRouter);
app.use("/pages", pagesRouter);
app.use("/", indexRouter);

// Catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// Error handler
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // Render the error page
  res.status(err.status || 500);
  res.render("error");
});

// Set the port for the server
var port = process.env.PORT || 3000;
app.set("port", port);

// Start the server and listen on the specified port
app.listen(port, () => {
  console.log("Server running at port " + port);
});

// Export the app for external use
module.exports = app;
