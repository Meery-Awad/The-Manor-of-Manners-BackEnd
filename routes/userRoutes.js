const express = require("express");
const { registerUser, loginUser, updateUser, uploadVideoLink } = require("../controllers/userController");
const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.put("/:id", updateUser);
router.post("/editUserCourses", uploadVideoLink);

module.exports = router;
