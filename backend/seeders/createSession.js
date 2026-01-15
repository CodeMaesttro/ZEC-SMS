const mongoose = require('mongoose');
const Session = require('../models/Session');
const User = require('../models/User');
require('dotenv').config();

const createDefaultSession = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/school_management', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Check if any session exists
    const existingSession = await Session.findOne();
    
    if (existingSession) {
      console.log('Session already exists!');
      console.log('Session Name:', existingSession.name);
      console.log('Active:', existingSession.isActive);
      process.exit(0);
    }

    // Find admin user to set as creator
    const adminUser = await User.findOne({ role: 'Admin' });
    
    if (!adminUser) {
      console.log('❌ No admin user found. Please run createAdmin.js first.');
      process.exit(1);
    }

    // Create current academic session (2024-2025)
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    
    const session = await Session.create({
      name: `${currentYear}-${nextYear}`,
      startDate: new Date(`${currentYear}-04-01`), // April 1st
      endDate: new Date(`${nextYear}-03-31`),     // March 31st next year
      isActive: true,
      description: `Academic Session ${currentYear}-${nextYear}`,
      createdBy: adminUser._id
    });

    console.log('✅ Default session created successfully!');
    console.log('📅 Session Name:', session.name);
    console.log('📅 Start Date:', session.startDate.toDateString());
    console.log('📅 End Date:', session.endDate.toDateString());
    console.log('✅ Active:', session.isActive);
    console.log('');
    console.log('The application now has a default academic session.');

  } catch (error) {
    console.error('❌ Error creating session:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the seeder
createDefaultSession();