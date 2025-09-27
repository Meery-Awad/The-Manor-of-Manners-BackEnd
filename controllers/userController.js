const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User, Course } = require("../data");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");
const SECRET_KEY = process.env.JWT_SECRET;

// Cloudinary config

// cloudinary.config({
//   cloud_name: 'dvaq8nyqk',
//   api_key: '652612457517966',
//   api_secret: 'YzPJAP_SFhH6HS4gv03MYqjdZVE',
// });

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

// Multer Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    let folder = "uploads";
    let resource_type = "auto"; // Cloudinary يحدد النوع تلقائياً (image/video)
    
    if (file.mimetype.startsWith("image/")) folder = "user_images";
    if (file.mimetype.startsWith("video/")) folder = "course_videos";

    return { folder, resource_type };
  },
});

const upload = multer({ storage });

exports.registerUser = async (req, res) => {
  try {
   
    await upload.single("img")(req, res, async function (err) {
      if (err) {
        console.error("Upload error:", err);
        return res.status(500).json({ message: "Image upload error" });
      }

      const { name, email, password, confirmPassword, date, time, endtime, courses } = req.body;

      const existingUser = await User.findOne({ email });
      if (existingUser) return res.status(400).json({ message: "User already exists" });

      if (password.length < 8)
        return res.status(400).json({ message: "Password must be at least 8 characters long" });

      if (password !== confirmPassword)
        return res.status(400).json({ message: "Passwords do not match" });

      // upload img on cloudinary
      const imgUrl = req.file ? req.file.path : null;

      const newUser = new User({
        name,
        email,
        password, 
        img: imgUrl,
        date,
        time,
        endtime,
        courses
      });

      await newUser.save();
      res.json({ message: "User created successfully", user: newUser });
    });
  } catch (err) {
    console.error("Error adding user:", err);
    res.status(500).json({ message: "Server error" });
  }
};


exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    // const validPass = await bcrypt.compare(password, user.password);
    if (password != user.password) return res.status(400).json({ message: "Invalid password" });

    const token = jwt.sign({ id: user._id, email: user.email }, SECRET_KEY, { expiresIn: "1h" });

    res.json({
      id: user._id,
      email: user.email,
      name: user.name,
      password: user.password,
      confirmPassword: user.confirmPassword,
      img: user.img,
      courses: user.courses,
      token,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateUser = async (req, res) => {

  try {
    const { id } = req.params;
    const { name, email, password, confirmPassword, img } = req.body;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (name) user.name = name;
    if (email) user.email = email;
    if (img) user.img = img;

    if (password) {
      if (password !== confirmPassword) return res.status(400).json({ message: "Passwords do not match" });
      // const hashedPassword = await bcrypt.hash(password, 10);
      // user.password = hashedPassword;
    }

    await user.save();
    res.json({ message: "Profile updated successfully", user });
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.uploadVideoLink = [
  upload.single("video"),

  async (req, res) => {
    // const courses = await Course.find();
    //  const users = await User.find();
    // console.log("Courses:", courses.map(c => c.toObject()));
    // console.log("Users:", users.map(u => u.toObject()));
    try {
      const { courseId } = req.body;

      if (!req.file) {
        console.log("❌ No file uploaded");
        return res.status(400).json({ message: "No file uploaded" });
      }
      const videoUrl = req.file.path;
   
      const course = await Course.findById(courseId);
      if (!course) return res.status(404).json({ message: "Course not found" });
      course.link = videoUrl;
      course.save()

      const joinedUsersId = course.joinedUsers.map(u => u.userId);

      const users = await User.find({ _id: { $in: joinedUsersId } });

      for (const user of users) {
        const courseIndex = user.courses.findIndex(c => c._id.toString() === courseId);

        if (courseIndex !== -1) {
          user.courses[courseIndex].link = videoUrl;

          await user.save();

        }
      }
      await course.save();

      res.json({ success: true, url: videoUrl });
    } catch (err) {
      console.error("Error uploading video link:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
];


