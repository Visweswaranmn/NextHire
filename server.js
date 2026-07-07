const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");

const app = express();

app.use(cors());
app.use(express.json());


// =============================
// TEST ROUTES
// =============================
app.get("/", (req, res) => {
  res.send("Backend working");
});

app.get("/test", (req, res) => {
  res.send("API working");
});


// =============================
// MONGODB CONNECTION
// =============================
mongoose.connect("mongodb://127.0.0.1:27017/jobportal")
  .then(() => console.log("MongoDB Connected"))
  .catch(error => console.log(error));


// =============================
// USER SCHEMA
// =============================
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: String
});

const User = mongoose.model("User", userSchema);


// =============================
// REGISTER API
// =============================
app.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // basic required-field validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    // prevent duplicate users
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      role
    });

    await user.save();

    res.json({ message: "User Registered Successfully" });

  } catch (error) {
    // duplicate key race condition (two simultaneous registrations, same email)
    if (error.code === 11000) {
      return res.json({ message: "User already exists" });
    }

    console.log(error);
    res.status(500).json({ message: "Registration failed" });
  }
});


// =============================
// LOGIN API
// =============================
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.json({ message: "User not found" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.json({ message: "Invalid password" });
    }

    // never send the password hash back to the client
    const safeUser = user.toObject();
    delete safeUser.password;

    res.json({
      message: "Login successful",
      user: safeUser
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Login failed" });
  }
});


// =============================
// SAVE JOB SCHEMA
// =============================
const savedJobSchema = new mongoose.Schema({
  title: String,
  company: String,
  location: String,
  userEmail: String
});

const SavedJob = mongoose.model("SavedJob", savedJobSchema);


// =============================
// SAVE JOB API
// =============================
app.post("/save-job", async (req, res) => {
  try {
    const { title, company, location, userEmail } = req.body;

    if (!title || !company) {
      return res.status(400).json({ message: "Title and company are required" });
    }

    const job = new SavedJob({
      title,
      company,
      location,
      userEmail
    });

    await job.save();

    res.json({ message: "Job saved successfully" });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to save job" });
  }
});


// =============================
// JOB POST SCHEMA
// =============================
const jobPostSchema = new mongoose.Schema({
  title: String,
  company: String,
  location: String,
  salary: String
});

const JobPost = mongoose.model("JobPost", jobPostSchema);


// =============================
// POST JOB API (public — used by the "Post a Job" page)
// =============================
app.post("/post-job", async (req, res) => {
  try {
    const { title, company, location, salary } = req.body;

    if (!title || !company || !location) {
      return res.status(400).json({ message: "Title, company and location are required" });
    }

    const job = new JobPost({
      title,
      company,
      location,
      salary
    });

    await job.save();

    res.json({ message: "Job posted successfully" });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to post job" });
  }
});


// =============================
// ADMIN PANEL POST JOB API (Employer role required)
// =============================
app.post("/admin/post-job", async (req, res) => {
  try {
    const { title, company, location, salary, email } = req.body;

    if (!title || !company || !location) {
      return res.status(400).json({ message: "Title, company and location are required" });
    }

    if (!email) {
      return res.status(401).json({ message: "You must be logged in to do this" });
    }

    const requester = await User.findOne({ email });

    if (!requester || requester.role !== "Employer") {
      return res.status(403).json({ message: "Admin access is restricted to Employer accounts" });
    }

    const job = new JobPost({
      title,
      company,
      location,
      salary
    });

    await job.save();

    res.json({ message: "Job posted successfully" });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to post job" });
  }
});


// =============================
// GET JOBS API
// =============================
app.get("/jobs", async (req, res) => {
  try {
    const jobs = await JobPost.find();
    res.json(jobs);

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to fetch jobs" });
  }
});


// =============================
// START SERVER
// =============================
app.listen(5000, () => {
  console.log("Server running on port 5000");
});
