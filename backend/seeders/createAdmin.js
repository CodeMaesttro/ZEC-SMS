const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const createAdminUser = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/school_management', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: 'admin@school.com' });
    
    if (existingAdmin) {
      console.log('Admin user already exists!');
      console.log('Email: admin@school.com');
      console.log('You can use this account to login.');
      process.exit(0);
    }

    // Create admin user
    const adminUser = await User.create({
      firstName: 'System',
      lastName: 'Administrator',
      email: 'admin@school.com',
      password: 'admin123',
      role: 'Admin',
      phone: '+1234567890',
      address: 'School Administration Office',
      gender: 'Other',
      isActive: true,
      isEmailVerified: true,
      employeeId: 'ADM001',
      joiningDate: new Date()
    });

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: admin@school.com');
    console.log('🔑 Password: admin123');
    console.log('👤 Role: Admin');
    console.log('');
    console.log('You can now login to the application using these credentials.');

    // Create a few more sample users for testing
    const sampleUsers = [
      {
        firstName: 'John',
        lastName: 'Teacher',
        email: 'teacher@school.com',
        password: 'teacher123',
        role: 'Teacher',
        phone: '+1234567891',
        isActive: true,
        isEmailVerified: true,
        employeeId: 'TCH001',
        joiningDate: new Date(),
        qualification: 'M.Ed',
        experience: '5 years'
      },
      {
        firstName: 'Jane',
        lastName: 'Student',
        email: 'student@school.com',
        password: 'student123',
        role: 'Student',
        phone: '+1234567892',
        isActive: true,
        isEmailVerified: true,
        dateOfBirth: new Date('2005-01-15'),
        gender: 'Female'
      },
      {
        firstName: 'Robert',
        lastName: 'Parent',
        email: 'parent@school.com',
        password: 'parent123',
        role: 'Parent',
        phone: '+1234567893',
        isActive: true,
        isEmailVerified: true,
        gender: 'Male'
      }
    ];

    for (const userData of sampleUsers) {
      const existingUser = await User.findOne({ email: userData.email });
      if (!existingUser) {
        await User.create(userData);
        console.log(`✅ Created ${userData.role}: ${userData.email} (password: ${userData.password.replace(/./g, '*')})`);
      }
    }

    console.log('');
    console.log('🎉 Database seeded successfully!');
    console.log('You can now login with any of the created accounts.');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the seeder
createAdminUser();