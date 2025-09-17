const { Course, User } = require("../data");
const dotenv = require("dotenv");
dotenv.config({ path: "../.env" });
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const axios = require("axios");

// Create Stripe checkout session
const WORLD_PAY_API = "https://api.worldpay.com/v1/orders";
const API_KEY = process.env.WORLDPAY_API_KEY;
exports.createCheckoutSession = async (req, res) => {
  try {
    const { courseName, price, courseId } = req.body;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: courseName,
            },
            unit_amount: price * 100,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `http://localhost:3000/Success?courseId=${courseId}`,
      cancel_url: "http://localhost:3000/cancel",
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Error creating checkout session:", err);
    res.status(500).json({ error: err.message });
  }
};
// exports.createCheckoutSession = async (req, res) => {
//   try {
//     const { courseName, price, courseId, userName } = req.body;

//     const data = {
//       amount: price, // بالـ smallest currency unit حسب Worldpay (مثلاً سنت)
//       currencyCode: "USD",
//       orderDescription: courseName,
//       paymentMethod: "CARD",
//       name: userName, // يمكن تعديله حسب بيانات المستخدم
//       returnUrl: `http://localhost:3000/payment-success?courseId=${courseId}`, // بعد الدفع
//     };

//     const response = await axios.post(WORLD_PAY_API, data, {
//       auth: { username: API_KEY, password: "" },
//     });

//     // Worldpay يرجع رابط الدفع في response.data.redirectUrl
//     res.json({ url: response.data.redirectUrl });
//   } catch (err) {
//     console.error("Error creating Worldpay session:", err.response?.data || err.message);
//     res.status(500).json({ error: "Failed to create payment session" });
//   }
// };
// Update user course status (booking / watched)
exports.updateUserCourseStatus = async (req, res) => {
  try {
    const { courseId, userId, key } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ success: false, message: "Course not found" });

    // تعديل حالة الكورس داخل الـ array
const courseIndex = user.courses.findIndex(c => c._id?.toString() === courseId);

    if (courseIndex !== -1) {

      user.courses[courseIndex].status = key === '1' ? 'booking' : 'watched';

    } else {
      const courseData = {
        ...course.toObject(), // ينقل كل الحقول من الـ course
        status: key === '1' ? 'booking' : 'watched',
      };

      user.courses.push(courseData);

    }

    await user.save();

    const array = key === '1' ? course.bookedUsers : course.joinedUsers;
    const alreadyUserAdded = array.some(u => u._id?.toString() === userId);
    
    if (!alreadyUserAdded) {
      array.push(user);
      await course.save();
    }
    
    const course1 = course;
    res.json({ success: true, course1, user });
  } catch (err) {
    console.error("Error updating booked users:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};