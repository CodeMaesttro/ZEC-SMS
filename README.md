# School Management System - MERN Stack

A comprehensive school management system built with MongoDB, Express.js, React, and Node.js. This is a complete rewrite from PHP/CodeIgniter to modern MERN stack architecture.

## 🚀 Features

### ✅ Completed Modules
- **User Management**: Admin, Teachers, Students, Parents with role-based access control
- **Academic Management**: Classes, Sections, Subjects, Academic Sessions
- **Student Management**: Enrollment, Profiles, Academic Records, Parent Assignment
- **Teacher Management**: Profiles, Class/Subject Assignments, Comprehensive CRUD
- **Exam Management**: Exam Types, Mark Entry, Results, Grade Reports, Publishing
- **Attendance Management**: Daily Attendance Tracking, Reports, Analytics, Summaries
- **Fee Management**: Fee Structure, Payment Tracking, Student Status, Receipt Generation
- **Library Management**: Book Catalog, Issue/Return Tracking, Statistics, Search
- **Messaging System**: Internal Communication, Inbox/Sent/Starred, Threading, Priorities
- **Notice Board**: Announcements, Categories, Pinning, Target Audiences, Expiry
- **Reports & Analytics**: Student Reports, Class Reports, Attendance Reports, Exam Reports, Dashboard Statistics

### Key Features
- 🔐 JWT-based authentication and authorization
- 📱 Responsive design for all devices
- 🎯 Role-based dashboards (Admin, Teacher, Student, Parent)
- 📊 Real-time statistics and analytics
- 📁 File upload and management capabilities
- 🔄 Session-based academic year management
- 🛡️ Security middleware (helmet, rate limiting, CORS)
- 📈 Performance optimized with proper indexing
- 🎨 Modern UI with React Bootstrap and FontAwesome
- 🔍 Advanced search and filtering capabilities
- 📋 Comprehensive validation and error handling

## 🛠️ Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **JWT** - JSON Web Tokens for authentication
- **bcryptjs** - Password hashing
- **express-validator** - Input validation
- **Multer** - File upload handling
- **Helmet** - Security middleware
- **Express Rate Limit** - Rate limiting
- **Morgan** - HTTP request logger
- **Compression** - Response compression

### Frontend
- **React 19** - UI library with latest features
- **React Router DOM** - Client-side routing
- **React Bootstrap** - UI components
- **Axios** - HTTP client for API calls
- **React Toastify** - Toast notifications
- **FontAwesome** - Icons
- **Bootstrap 5** - CSS framework

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (v5 or higher)
- npm or yarn package manager

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd school-management-mern
```

### 2. Install Dependencies
```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 3. Environment Configuration
Create a `.env` file in the root directory:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/school_management
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=7d

# Email Configuration (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# File Upload
UPLOAD_PATH=uploads
MAX_FILE_SIZE=10485760

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### 4. Database Setup
```bash
# Start MongoDB service
mongod

# The application will create collections automatically
# Sample data can be added through the admin interface
```

### 5. Start the Application
```bash
# Development mode (runs both backend and frontend)
npm run dev

# Or run separately:
# Backend only
npm run server

# Frontend only (in another terminal)
cd frontend && npm start
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

## 📁 Project Structure

```
school-management-mern/
├── backend/
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── attendanceController.js
│   │   ├── classesController.js
│   │   ├── dashboardController.js
│   │   ├── examsController.js
│   │   ├── feesController.js
│   │   ├── libraryController.js
│   │   ├── messagesController.js
│   │   ├── noticesController.js
│   │   ├── reportsController.js
│   │   ├── studentsController.js
│   │   ├── subjectsController.js
│   │   ├── teachersController.js
│   │   └── usersController.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── errorHandler.js
│   │   ├── roleAuth.js
│   │   └── upload.js
│   ├── models/
│   │   ├── Attendance.js
│   │   ├── Class.js
│   │   ├── Exam.js
│   │   ├── ExamMark.js
│   │   ├── ExamType.js
│   │   ├── FeePayment.js
│   │   ├── FeeStructure.js
│   │   ├── FeeType.js
│   │   ├── Library.js
│   │   ├── Message.js
│   │   ├── Notice.js
│   │   ├── Section.js
│   │   ├── Session.js
│   │   ├── Student.js
│   │   ├── Subject.js
│   │   ├── Teacher.js
│   │   └── User.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── attendance.js
│   │   ├── classes.js
│   │   ├── dashboard.js
│   │   ├── exams.js
│   │   ├── fees.js
│   │   ├── library.js
│   │   ├── marks.js
│   │   ├── messages.js
│   │   ├── notices.js
│   │   ├── reports.js
│   │   ├── sections.js
│   │   ├── sessions.js
│   │   ├── students.js
│   │   ├── studyMaterials.js
│   │   ├── subjects.js
│   │   ├── teachers.js
│   │   └── users.js
│   └── server.js
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Common/
│   │   │   └── Layout/
│   │   ├── context/
│   │   │   └── AuthContext.js
│   │   ├── pages/
│   │   │   ├── Attendance/
│   │   │   ├── Auth/
│   │   │   ├── Classes/
│   │   │   ├── Dashboard/
│   │   │   ├── Exams/
│   │   │   ├── Fees/
│   │   │   ├── Library/
│   │   │   ├── Messages/
│   │   │   ├── Notices/
│   │   │   ├── Profile/
│   │   │   ├── Reports/
│   │   │   ├── Settings/
│   │   │   ├── Students/
│   │   │   ├── Subjects/
│   │   │   └── Teachers/
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
├── uploads/
│   ├── materials/
│   ├── pro_pic/
│   ├── routine/
│   └── syllabus/
├── .env.example
├── .htaccess
├── package.json
└── README.md
```

## 🔐 Default Admin Setup

Create the first admin user by registering through the application or by directly inserting into the database:

```javascript
// First user should be created with role: 'Admin'
{
  firstName: "System",
  lastName: "Administrator", 
  email: "admin@school.com",
  password: "admin123", // Will be hashed
  role: "Admin",
  isActive: true
}
```

## 🎯 User Roles & Permissions

### 👨‍💼 Admin
- Complete system access and configuration
- User management (create, update, delete users)
- Academic structure setup (classes, subjects, sessions)
- System-wide reports and analytics
- Fee structure and payment management
- Library management and book catalog
- Notice board management
- System statistics and dashboard

### 👨‍🏫 Teacher
- Access to assigned classes and subjects
- Student attendance marking and reports
- Exam mark entry and grade management
- Access to student academic records
- Internal messaging system
- Class-specific reports and analytics
- Library book access and recommendations

### 👨‍🎓 Student
- Personal academic profile access
- View grades, attendance, and progress
- Access to study materials and resources
- Internal messaging with teachers
- Fee payment status and history
- Exam schedules and results
- Library book search and access
- Notice board and announcements

### 👨‍👩‍👧‍👦 Parent
- Child's academic records and progress
- Attendance and grade monitoring
- Fee payment and financial records
- Communication with teachers and school
- Access to school notices and announcements
- Library access for child's account

## 🔧 API Documentation

### Authentication Endpoints
```
POST /api/auth/login          - User login
POST /api/auth/register       - User registration
POST /api/auth/logout         - User logout
GET  /api/auth/me            - Get current user profile
PUT  /api/auth/change-password - Change password
```

### Core Module Endpoints

#### Classes Management
```
GET    /api/classes          - List all classes
POST   /api/classes          - Create new class
GET    /api/classes/:id      - Get class details
PUT    /api/classes/:id      - Update class
DELETE /api/classes/:id      - Delete class
GET    /api/classes/:id/students - Get class students
```

#### Students Management
```
GET    /api/students         - List students with filters
POST   /api/students         - Create new student
GET    /api/students/:id     - Get student details
PUT    /api/students/:id     - Update student
DELETE /api/students/:id     - Delete student
GET    /api/students/:id/attendance - Get student attendance
```

#### Teachers Management
```
GET    /api/teachers         - List teachers with filters
POST   /api/teachers         - Create new teacher
GET    /api/teachers/:id     - Get teacher details
PUT    /api/teachers/:id     - Update teacher
DELETE /api/teachers/:id     - Delete teacher
POST   /api/teachers/:id/assign-class - Assign class to teacher
```

#### Exams Management
```
GET    /api/exams            - List exams
POST   /api/exams            - Create new exam
GET    /api/exams/:id        - Get exam details
PUT    /api/exams/:id        - Update exam
DELETE /api/exams/:id        - Delete exam
POST   /api/exams/:id/marks  - Enter exam marks
GET    /api/exams/:id/results - Get exam results
```

#### Attendance Management
```
GET    /api/attendance       - Get attendance records
POST   /api/attendance       - Mark attendance
PUT    /api/attendance/:id   - Update attendance
GET    /api/attendance/class/:classId - Get class attendance
GET    /api/attendance/student/:studentId - Get student attendance
GET    /api/attendance/reports - Generate attendance reports
```

#### Fee Management
```
GET    /api/fees/structures  - Get fee structures
POST   /api/fees/structures  - Create fee structure
GET    /api/fees/payments    - Get fee payments
POST   /api/fees/payments    - Record fee payment
GET    /api/fees/student/:studentId/status - Get student fee status
GET    /api/fees/payments/:paymentId/receipt - Generate receipt
```

#### Library Management
```
GET    /api/library          - Get library books
POST   /api/library          - Add new book
GET    /api/library/:id      - Get book details
PUT    /api/library/:id      - Update book
DELETE /api/library/:id      - Delete book
POST   /api/library/:id/issue - Issue book
POST   /api/library/:id/return - Return book
GET    /api/library/stats    - Get library statistics
```

#### Messages System
```
GET    /api/messages/inbox   - Get inbox messages
GET    /api/messages/sent    - Get sent messages
GET    /api/messages/starred - Get starred messages
POST   /api/messages         - Send new message
POST   /api/messages/:id/reply - Reply to message
PUT    /api/messages/:id/read - Mark as read
PUT    /api/messages/:id/star - Toggle star
DELETE /api/messages/:id     - Delete message
```

#### Notices Management
```
GET    /api/notices          - Get notices
POST   /api/notices          - Create notice
GET    /api/notices/:id      - Get notice details
PUT    /api/notices/:id      - Update notice
DELETE /api/notices/:id      - Delete notice
PUT    /api/notices/:id/pin  - Toggle pin status
GET    /api/notices/pinned   - Get pinned notices
```

#### Reports & Analytics
```
GET    /api/reports/dashboard - Dashboard statistics
GET    /api/reports/student/:studentId - Student report
GET    /api/reports/class/:classId - Class report
GET    /api/reports/attendance - Attendance report
GET    /api/reports/exam/:examId - Exam report
GET    /api/reports/fees     - Fee collection report
```

## 🧪 Testing

```bash
# Run backend tests
npm test

# Run frontend tests
cd frontend
npm test
```

## 🚀 Deployment

### Production Build
```bash
# Build frontend for production
cd frontend
npm run build
cd ..

# Set environment to production
export NODE_ENV=production

# Start production server
npm start
```

### Environment Variables for Production
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://your-production-db-url
JWT_SECRET=your-super-secure-production-secret
FRONTEND_URL=https://your-domain.com
```

## 📊 Current Status: MVP Ready ✅

### ✅ Completed Features
- **Authentication & Authorization**: Complete JWT-based system with role management
- **User Management**: Full CRUD for all user types with proper validation
- **Academic Structure**: Classes, subjects, sections with comprehensive management
- **Student Management**: Complete enrollment, profile management, and academic tracking
- **Teacher Management**: Full teacher profiles, assignments, and class management
- **Exam System**: Complete exam creation, mark entry, results, and grade calculation
- **Attendance System**: Daily attendance tracking, reports, and analytics
- **Fee Management**: Fee structures, payment tracking, receipts, and financial reports
- **Library System**: Book catalog, issue/return tracking, and comprehensive search
- **Messaging System**: Internal communication with threading and priority management
- **Notice Board**: Announcements with categories, targeting, and expiry management
- **Reports & Analytics**: Comprehensive reporting across all modules
- **Security**: Rate limiting, input validation, error handling, and secure file uploads
- **UI/UX**: Responsive design with modern React Bootstrap interface

### 🎯 System Highlights
- **Scalable Architecture**: Modular design with proper separation of concerns
- **Security First**: Comprehensive security measures and input validation
- **Performance Optimized**: Efficient database queries with proper indexing
- **User Experience**: Intuitive interface with role-based navigation
- **Data Integrity**: Comprehensive validation and error handling
- **Responsive Design**: Works seamlessly across all device sizes

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 Development Guidelines

- Follow ESLint configuration for code consistency
- Write meaningful commit messages
- Add proper error handling and validation
- Include JSDoc comments for functions
- Test new features thoroughly
- Update documentation for new features

## 🔮 Future Enhancements

### Planned Features
- [ ] Email notifications and alerts
- [ ] Mobile app (React Native)
- [ ] Advanced analytics and data visualization
- [ ] Integration with payment gateways
- [ ] Bulk data import/export functionality
- [ ] Multi-language support
- [ ] Advanced search with Elasticsearch
- [ ] Real-time notifications with Socket.io
- [ ] Document management system
- [ ] Timetable and scheduling system

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation wiki

## 🙏 Acknowledgments

- Original CodeAstro School Management System (PHP/CodeIgniter version)
- React and Node.js communities
- MongoDB documentation and best practices
- Bootstrap and FontAwesome for UI components

---

**Note**: This is a complete rewrite from the original PHP/CodeIgniter system to modern MERN stack. All legacy PHP code has been removed and replaced with a comprehensive Node.js/Express backend and React frontend. The system is now MVP-ready with all core modules fully implemented and tested.