const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./src/models/user.model');

// Load environment variables
dotenv.config();

async function seedUsers() {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ssm";
    
    console.log("Connecting to MongoDB URI:", mongoUri);
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB.");

    const rolesToCreate = [
      { role: "user", email: "user@gmail.com", username: "test_user" },
      { role: "admin", email: "admin@mail.com", username: "test_admin" },
      { role: "SUPER_ADMIN", email: "super@mail.com", username: "test_superadmin" },
    ];

    for (const data of rolesToCreate) {
      // Check if user already exists
      let user = await User.findOne({ email: data.email });
      if (user) {
        // Update the user
        user.role = data.role;
        user.password = "password123";
        await user.save();
        console.log(`Updated existing user: ${data.email} with role: ${data.role} and password: password123`);
      } else {
        // Create new user
        user = await User.create({
          fullName: `Test ${data.role}`,
          email: data.email,
          username: data.username,
          phoneNumber: "1234567890",
          country: "US",
          timezone: "UTC",
          role: data.role,
          password: "password123"
        });
        console.log(`Created new user: ${data.email} with role: ${data.role} and password: password123`);
      }
    }

    console.log("\nDone! You can login with these accounts. Password for all is: password123");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding users:", error);
    process.exit(1);
  }
}

seedUsers();
