const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Session = require('../models/Session');
const Class = require('../models/Class');
const Section = require('../models/Section');
const Subject = require('../models/Subject');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const ExamType = require('../models/ExamType');
const FeeType = require('../models/FeeType');
const Library = require('../models/Library');
const Notice = require('../models/Notice');

// Connect to database
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/school_management', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Session.deleteMany({}),
      Class.deleteMany({}),
      Section.deleteMany({}),
      Subject.deleteMany({}),
      Student.deleteMany({}),
      Teacher.deleteMany({}),
      ExamType.deleteMany({}),
      FeeType.deleteMany({}),
      Library.deleteMany({}),
      Notice.deleteMany({})
    ]);

    console.log('🗑️  Cleared existing data');

    // Create Academic Session
    const session = await Session.create({
      name: '2024-2025',
      startDate: new Date('2024-04-01'),
      endDate: new Date('2025-03-31'),
      isActive: true,
      description: 'Academic Year 2024-2025',
      createdBy: new mongoose.Types.ObjectId()
    });

    console.log('📅 Created academic session');

    // Create Admin User
    const adminUser = await User.create({
      firstName: 'System',
      lastName: 'Administrator',
      email: 'admin@school.com',
      password: 'admin123',
      role: 'Admin',
      phone: '+1234567890',
      address: 'School Address',
      isActive: true,
      isEmailVerified: true
    });

    // Create Teacher Users
    const teacherUsers = await User.insertMany([
      {
        firstName: 'John',
        lastName: 'Smith',
        email: 'teacher@school.com',
        password: 'teacher123',
        role: 'Teacher',
        phone: '+1234567891',
        qualification: 'M.Sc Mathematics',
        experience: '5 years',
        isActive: true,
        isEmailVerified: true,
        createdBy: adminUser._id
      },
      {
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah.johnson@school.com',
        password: 'teacher123',
        role: 'Teacher',
        phone: '+1234567892',
        qualification: 'M.Sc Physics',
        experience: '8 years',
        isActive: true,
        isEmailVerified: true,
        createdBy: adminUser._id
      },
      {
        firstName: 'Michael',
        lastName: 'Brown',
        email: 'michael.brown@school.com',
        password: 'teacher123',
        role: 'Teacher',
        phone: '+1234567893',
        qualification: 'M.A English',
        experience: '6 years',
        isActive: true,
        isEmailVerified: true,
        createdBy: adminUser._id
      }
    ]);

    // Create Student Users
    const studentUsers = await User.insertMany([
      {
        firstName: 'Alice',
        lastName: 'Wilson',
        email: 'student@school.com',
        password: 'student123',
        role: 'Student',
        phone: '+1234567894',
        dateOfBirth: new Date('2008-05-15'),
        gender: 'Female',
        isActive: true,
        isEmailVerified: true,
        createdBy: adminUser._id
      },
      {
        firstName: 'Bob',
        lastName: 'Davis',
        email: 'bob.davis@school.com',
        password: 'student123',
        role: 'Student',
        phone: '+1234567895',
        dateOfBirth: new Date('2008-08-22'),
        gender: 'Male',
        isActive: true,
        isEmailVerified: true,
        createdBy: adminUser._id
      },
      {
        firstName: 'Carol',
        lastName: 'Miller',
        email: 'carol.miller@school.com',
        password: 'student123',
        role: 'Student',
        phone: '+1234567896',
        dateOfBirth: new Date('2008-12-10'),
        gender: 'Female',
        isActive: true,
        isEmailVerified: true,
        createdBy: adminUser._id
      }
    ]);

    // Create Parent Users
    const parentUsers = await User.insertMany([
      {
        firstName: 'Robert',
        lastName: 'Wilson',
        email: 'parent@school.com',
        password: 'parent123',
        role: 'Parent',
        phone: '+1234567897',
        isActive: true,
        isEmailVerified: true,
        createdBy: adminUser._id
      },
      {
        firstName: 'Linda',
        lastName: 'Davis',
        email: 'linda.davis@school.com',
        password: 'parent123',
        role: 'Parent',
        phone: '+1234567898',
        isActive: true,
        isEmailVerified: true,
        createdBy: adminUser._id
      }
    ]);

    console.log('👥 Created users');

    // Create Classes
    const classes = await Class.insertMany([
      {
        name: 'Grade 9',
        grade: 9,
        description: 'Ninth Grade',
        capacity: 40,
        session: session._id,
        createdBy: adminUser._id
      },
      {
        name: 'Grade 10',
        grade: 10,
        description: 'Tenth Grade',
        capacity: 40,
        session: session._id,
        createdBy: adminUser._id
      },
      {
        name: 'Grade 11',
        grade: 11,
        description: 'Eleventh Grade',
        capacity: 35,
        session: session._id,
        createdBy: adminUser._id
      },
      {
        name: 'Grade 12',
        grade: 12,
        description: 'Twelfth Grade',
        capacity: 35,
        session: session._id,
        createdBy: adminUser._id
      }
    ]);

    // Create Sections
    const sections = await Section.insertMany([
      {
        name: 'A',
        class: classes[0]._id,
        capacity: 40,
        room: 'Room 101',
        session: session._id,
        createdBy: adminUser._id
      },
      {
        name: 'B',
        class: classes[0]._id,
        capacity: 40,
        room: 'Room 102',
        session: session._id,
        createdBy: adminUser._id
      },
      {
        name: 'A',
        class: classes[1]._id,
        capacity: 40,
        room: 'Room 201',
        session: session._id,
        createdBy: adminUser._id
      },
      {
        name: 'B',
        class: classes[1]._id,
        capacity: 40,
        room: 'Room 202',
        session: session._id,
        createdBy: adminUser._id
      }
    ]);

    console.log('🏫 Created classes and sections');

    // Create Subjects
    const subjects = await Subject.insertMany([
      {
        name: 'Mathematics',
        code: 'MATH',
        description: 'Mathematics subject',
        classes: [classes[0]._id, classes[1]._id],
        teacher: teacherUsers[0]._id,
        type: 'Core',
        totalMarks: 100,
        passingMarks: 40,
        session: session._id,
        createdBy: adminUser._id
      },
      {
        name: 'Physics',
        code: 'PHY',
        description: 'Physics subject',
        classes: [classes[0]._id, classes[1]._id],
        teacher: teacherUsers[1]._id,
        type: 'Core',
        totalMarks: 100,
        passingMarks: 40,
        session: session._id,
        createdBy: adminUser._id
      },
      {
        name: 'English',
        code: 'ENG',
        description: 'English Language',
        classes: [classes[0]._id, classes[1]._id],
        teacher: teacherUsers[2]._id,
        type: 'Core',
        totalMarks: 100,
        passingMarks: 40,
        session: session._id,
        createdBy: adminUser._id
      },
      {
        name: 'Chemistry',
        code: 'CHEM',
        description: 'Chemistry subject',
        classes: [classes[0]._id, classes[1]._id],
        type: 'Core',
        totalMarks: 100,
        passingMarks: 40,
        session: session._id,
        createdBy: adminUser._id
      }
    ]);

    console.log('📚 Created subjects');

    // Create Teachers
    const teachers = await Teacher.insertMany([
      {
        user: teacherUsers[0]._id,
        employeeId: 'T2024001',
        department: 'Mathematics',
        designation: 'Senior Teacher',
        qualification: 'M.Sc Mathematics',
        experience: '5 years',
        joiningDate: new Date('2020-06-01'),
        salary: {
          basic: 50000,
          allowances: 10000,
          deductions: 2000
        },
        assignedSubjects: [{
          subject: subjects[0]._id,
          classes: [classes[0]._id, classes[1]._id]
        }],
        session: session._id,
        createdBy: adminUser._id
      },
      {
        user: teacherUsers[1]._id,
        employeeId: 'T2024002',
        department: 'Science',
        designation: 'Senior Teacher',
        qualification: 'M.Sc Physics',
        experience: '8 years',
        joiningDate: new Date('2018-06-01'),
        salary: {
          basic: 55000,
          allowances: 12000,
          deductions: 2500
        },
        assignedSubjects: [{
          subject: subjects[1]._id,
          classes: [classes[0]._id, classes[1]._id]
        }],
        session: session._id,
        createdBy: adminUser._id
      },
      {
        user: teacherUsers[2]._id,
        employeeId: 'T2024003',
        department: 'Languages',
        designation: 'Teacher',
        qualification: 'M.A English',
        experience: '6 years',
        joiningDate: new Date('2019-06-01'),
        salary: {
          basic: 48000,
          allowances: 8000,
          deductions: 1800
        },
        assignedSubjects: [{
          subject: subjects[2]._id,
          classes: [classes[0]._id, classes[1]._id]
        }],
        session: session._id,
        createdBy: adminUser._id
      }
    ]);

    // Create Students
    const students = await Student.insertMany([
      {
        user: studentUsers[0]._id,
        studentId: 'STU2024001',
        rollNumber: '001',
        class: classes[1]._id,
        section: sections[2]._id,
        parent: parentUsers[0]._id,
        admissionDate: new Date('2024-04-01'),
        admissionNumber: 'ADM2024001',
        bloodGroup: 'A+',
        emergencyContact: {
          name: 'Robert Wilson',
          phone: '+1234567897',
          relationship: 'Father'
        },
        session: session._id,
        createdBy: adminUser._id
      },
      {
        user: studentUsers[1]._id,
        studentId: 'STU2024002',
        rollNumber: '002',
        class: classes[1]._id,
        section: sections[2]._id,
        parent: parentUsers[1]._id,
        admissionDate: new Date('2024-04-01'),
        admissionNumber: 'ADM2024002',
        bloodGroup: 'B+',
        emergencyContact: {
          name: 'Linda Davis',
          phone: '+1234567898',
          relationship: 'Mother'
        },
        session: session._id,
        createdBy: adminUser._id
      },
      {
        user: studentUsers[2]._id,
        studentId: 'STU2024003',
        rollNumber: '003',
        class: classes[0]._id,
        section: sections[0]._id,
        admissionDate: new Date('2024-04-01'),
        admissionNumber: 'ADM2024003',
        bloodGroup: 'O+',
        session: session._id,
        createdBy: adminUser._id
      }
    ]);

    console.log('👨‍🎓 Created teachers and students');

    // Create Exam Types
    const examTypes = await ExamType.insertMany([
      {
        name: 'First Terminal',
        description: 'First Terminal Examination',
        totalMarks: 100,
        passingMarks: 40,
        duration: 180,
        session: session._id,
        createdBy: adminUser._id
      },
      {
        name: 'Second Terminal',
        description: 'Second Terminal Examination',
        totalMarks: 100,
        passingMarks: 40,
        duration: 180,
        session: session._id,
        createdBy: adminUser._id
      },
      {
        name: 'Final Examination',
        description: 'Final Annual Examination',
        totalMarks: 100,
        passingMarks: 40,
        duration: 180,
        session: session._id,
        createdBy: adminUser._id
      }
    ]);

    // Create Fee Types
    const feeTypes = await FeeType.insertMany([
      {
        name: 'Admission Fee',
        description: 'One-time admission fee',
        category: 'Admission',
        frequency: 'One-time',
        session: session._id,
        createdBy: adminUser._id
      },
      {
        name: 'Tuition Fee',
        description: 'Monthly tuition fee',
        category: 'Tuition',
        frequency: 'Monthly',
        session: session._id,
        createdBy: adminUser._id
      },
      {
        name: 'Examination Fee',
        description: 'Examination fee per term',
        category: 'Examination',
        frequency: 'Quarterly',
        session: session._id,
        createdBy: adminUser._id
      }
    ]);

    console.log('📝 Created exam types and fee types');

    // Create Library Books
    const libraryBooks = await Library.insertMany([
      {
        title: 'Advanced Mathematics for Grade 10',
        author: 'Dr. John Mathematics',
        isbn: '978-0123456789',
        publisher: 'Education Publishers',
        publicationYear: 2023,
        category: 'Textbook',
        subject: subjects[0]._id,
        classes: [classes[1]._id],
        totalCopies: 50,
        availableCopies: 45,
        location: {
          shelf: 'A1',
          section: 'Mathematics'
        },
        price: 25.99,
        session: session._id,
        addedBy: adminUser._id,
        createdBy: adminUser._id
      },
      {
        title: 'Physics Fundamentals',
        author: 'Prof. Sarah Physics',
        isbn: '978-0987654321',
        publisher: 'Science Books Ltd',
        publicationYear: 2023,
        category: 'Textbook',
        subject: subjects[1]._id,
        classes: [classes[1]._id],
        totalCopies: 40,
        availableCopies: 38,
        location: {
          shelf: 'B2',
          section: 'Science'
        },
        price: 28.50,
        session: session._id,
        addedBy: adminUser._id,
        createdBy: adminUser._id
      },
      {
        title: 'English Literature Collection',
        author: 'Various Authors',
        isbn: '978-0456789123',
        publisher: 'Literary Press',
        publicationYear: 2022,
        category: 'Literature',
        subject: subjects[2]._id,
        classes: [classes[0]._id, classes[1]._id],
        totalCopies: 30,
        availableCopies: 28,
        location: {
          shelf: 'C3',
          section: 'Literature'
        },
        price: 22.00,
        session: session._id,
        addedBy: adminUser._id,
        createdBy: adminUser._id
      }
    ]);

    console.log('📖 Created library books');

    // Create Notices
    const notices = await Notice.insertMany([
      {
        title: 'Welcome to New Academic Year 2024-2025',
        content: 'We welcome all students and parents to the new academic year. Classes will commence from April 1st, 2024. Please ensure all admission formalities are completed.',
        category: 'Academic',
        priority: 'High',
        targetAudience: ['All'],
        publishDate: new Date(),
        isPinned: true,
        session: session._id,
        createdBy: adminUser._id
      },
      {
        title: 'First Terminal Examination Schedule',
        content: 'The first terminal examinations will be conducted from June 15th to June 25th, 2024. Detailed timetable will be shared soon.',
        category: 'Examination',
        priority: 'High',
        targetAudience: ['Students', 'Parents'],
        targetClasses: [classes[0]._id, classes[1]._id],
        publishDate: new Date(),
        session: session._id,
        createdBy: adminUser._id
      },
      {
        title: 'Parent-Teacher Meeting',
        content: 'Monthly parent-teacher meeting is scheduled for the last Saturday of every month. Please mark your calendars.',
        category: 'Event',
        priority: 'Normal',
        targetAudience: ['Parents'],
        publishDate: new Date(),
        session: session._id,
        createdBy: adminUser._id
      }
    ]);

    console.log('📢 Created notices');

    console.log('✅ Database seeding completed successfully!');
    console.log('\n📋 Sample Login Credentials:');
    console.log('Admin: admin@school.com / admin123');
    console.log('Teacher: teacher@school.com / teacher123');
    console.log('Student: student@school.com / student123');
    console.log('Parent: parent@school.com / parent123');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    mongoose.connection.close();
  }
};

// Run seeder
seedDatabase();