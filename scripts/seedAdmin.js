const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/user.model');

const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/binjwa_smm';

async function seedAdmin() {
  try {
    await mongoose.connect(dbUri);
    console.log('Connected to DB');

    const email = 'admin@example.com';
    const password = 'AdminPassword123!';

    let adminUser = await User.findOne({ email });
    if (!adminUser) {
      adminUser = await User.create({
        username: 'TestAdmin',
        email: email,
        password: password,
        role: 'ADMIN',
        status: 'ACTIVE'
      });
      console.log('Created new Admin user.');
    } else {
      console.log('Admin user already exists.');
      // Optional: Reset password to be sure
      adminUser.password = password;
      adminUser.role = 'ADMIN';
      await adminUser.save();
      console.log('Reset password for existing Admin user.');
    }

    console.log('\n--- CREDENTIALS ---');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log('-------------------\n');

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seedAdmin();
