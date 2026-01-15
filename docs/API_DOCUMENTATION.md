# School Management System - API Documentation

## Overview

This document provides comprehensive API documentation for the School Management System built with MERN stack.

## Base URL

```
Development: http://localhost:5000/api
Production: https://your-domain.com/api
```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Response Format

All API responses follow this standard format:

```json
{
  "success": true|false,
  "message": "Response message",
  "data": {
    // Response data
  },
  "errors": [
    // Validation errors (if any)
  ]
}
```

## Authentication Endpoints

### POST /auth/login
Login user with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user_id",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "role": "Admin|Teacher|Student|Parent"
    },
    "token": "jwt_token_here"
  }
}
```

### POST /auth/register
Register a new user (Admin only).

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "password": "password123",
  "role": "Teacher",
  "phone": "+1234567890",
  "address": "User address",
  "dateOfBirth": "1990-01-01",
  "gender": "Male"
}
```

### GET /auth/me
Get current user information.

**Headers:** Authorization required

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "role": "Teacher",
      "phone": "+1234567890",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "activeSession": {
      "id": "session_id",
      "name": "2024-2025",
      "startDate": "2024-04-01",
      "endDate": "2025-03-31"
    }
  }
}
```

### POST /auth/logout
Logout current user.

### POST /auth/forgot-password
Request password reset.

### POST /auth/reset-password/:token
Reset password with token.

### PUT /auth/change-password
Change user password.

## User Management Endpoints

### GET /users
Get all users with pagination and filters.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `role` (string): Filter by role
- `search` (string): Search in name and email
- `isActive` (boolean): Filter by active status
- `sortBy` (string): Sort field (default: createdAt)
- `sortOrder` (string): Sort order - asc|desc (default: desc)

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user_id",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@example.com",
        "role": "Teacher",
        "isActive": true,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "current": 1,
      "pages": 5,
      "total": 50,
      "limit": 10
    }
  }
}
```

### GET /users/:id
Get single user by ID.

### POST /users
Create new user (Admin only).

### PUT /users/:id
Update user information.

### DELETE /users/:id
Deactivate user (Admin only).

### GET /users/role/:role
Get users by role.

### POST /users/:id/profile-image
Upload user profile image.

### GET /users/stats
Get user statistics (Admin only).

## Academic Structure Endpoints

### Classes

#### GET /classes
Get all classes.

#### POST /classes
Create new class.

#### GET /classes/:id
Get class by ID.

#### PUT /classes/:id
Update class.

#### DELETE /classes/:id
Delete class.

### Sections

#### GET /sections
Get all sections.

#### POST /sections
Create new section.

#### GET /sections/class/:classId
Get sections by class.

### Subjects

#### GET /subjects
Get all subjects.

#### POST /subjects
Create new subject.

#### GET /subjects/:id
Get subject by ID.

#### PUT /subjects/:id
Update subject.

#### DELETE /subjects/:id
Delete subject.

## Student Management Endpoints

### GET /students
Get all students with filters.

**Query Parameters:**
- `class` (string): Filter by class ID
- `section` (string): Filter by section ID
- `status` (string): Filter by status
- `search` (string): Search in name and student ID

### POST /students
Create new student.

**Request Body:**
```json
{
  "userId": "user_id",
  "classId": "class_id",
  "sectionId": "section_id",
  "parentId": "parent_user_id",
  "rollNumber": "001",
  "admissionDate": "2024-04-01",
  "bloodGroup": "A+",
  "emergencyContact": {
    "name": "Parent Name",
    "phone": "+1234567890",
    "relationship": "Father"
  }
}
```

### GET /students/:id
Get student profile.

### PUT /students/:id
Update student information.

### DELETE /students/:id
Remove student.

## Teacher Management Endpoints

### GET /teachers
Get all teachers.

### POST /teachers
Create new teacher.

### GET /teachers/:id
Get teacher profile.

### PUT /teachers/:id
Update teacher information.

### POST /teachers/:id/assign-class
Assign class to teacher.

### POST /teachers/:id/assign-subject
Assign subject to teacher.

## Exam Management Endpoints

### Exam Types

#### GET /exams/types
Get all exam types.

#### POST /exams/types
Create exam type.

### Exams

#### GET /exams
Get all exams.

#### POST /exams
Create new exam.

#### GET /exams/:id
Get exam details.

#### PUT /exams/:id
Update exam.

### Marks

#### GET /marks
Get exam marks with filters.

#### POST /marks
Add/Update exam marks.

#### GET /marks/student/:studentId
Get student's marks.

#### GET /marks/class/:classId/exam/:examId
Get class exam results.

## Attendance Endpoints

### GET /attendance
Get attendance records.

**Query Parameters:**
- `class` (string): Class ID
- `section` (string): Section ID
- `date` (string): Specific date
- `startDate` (string): Date range start
- `endDate` (string): Date range end

### POST /attendance
Mark attendance.

**Request Body:**
```json
{
  "date": "2024-01-15",
  "classId": "class_id",
  "sectionId": "section_id",
  "attendance": [
    {
      "studentId": "student_id",
      "status": "Present|Absent|Late|Excused",
      "timeIn": "09:00",
      "timeOut": "15:00",
      "remarks": "Optional remarks"
    }
  ]
}
```

### GET /attendance/student/:studentId
Get student attendance summary.

### GET /attendance/class/:classId/summary
Get class attendance summary.

## Fee Management Endpoints

### Fee Types

#### GET /fees/types
Get all fee types.

#### POST /fees/types
Create fee type.

### Fee Structure

#### GET /fees/structure
Get fee structure.

#### POST /fees/structure
Create fee structure.

#### GET /fees/structure/class/:classId
Get fee structure by class.

### Fee Payments

#### GET /fees/payments
Get fee payments.

#### POST /fees/payments
Record fee payment.

#### GET /fees/payments/student/:studentId
Get student fee history.

#### GET /fees/outstanding
Get outstanding fees.

## Library Endpoints

### GET /library/books
Get library books.

**Query Parameters:**
- `search` (string): Search in title, author, publisher
- `category` (string): Filter by category
- `subject` (string): Filter by subject
- `class` (string): Filter by class
- `availableOnly` (boolean): Show only available books

### POST /library/books
Add new book.

### GET /library/books/:id
Get book details.

### PUT /library/books/:id
Update book information.

### DELETE /library/books/:id
Remove book.

### POST /library/books/:id/access
Record book access.

## Messaging Endpoints

### GET /messages/inbox
Get inbox messages.

### GET /messages/sent
Get sent messages.

### GET /messages/starred
Get starred messages.

### POST /messages
Send new message.

**Request Body:**
```json
{
  "recipientId": "user_id",
  "subject": "Message subject",
  "message": "Message content",
  "priority": "Low|Normal|High|Urgent"
}
```

### GET /messages/:id
Get message details.

### PUT /messages/:id/read
Mark message as read.

### PUT /messages/:id/star
Toggle message star.

### DELETE /messages/:id
Delete message.

## Notice Endpoints

### GET /notices
Get notices.

**Query Parameters:**
- `category` (string): Filter by category
- `priority` (string): Filter by priority
- `targetAudience` (string): Filter by target audience
- `search` (string): Search in title and content

### POST /notices
Create new notice.

**Request Body:**
```json
{
  "title": "Notice title",
  "content": "Notice content",
  "category": "General|Academic|Examination|Event|Holiday|Fee|Admission|Sports|Emergency|Other",
  "priority": "Low|Normal|High|Urgent",
  "targetAudience": ["All|Students|Teachers|Parents|Admin"],
  "targetClasses": ["class_id1", "class_id2"],
  "expiryDate": "2024-12-31",
  "isPinned": false
}
```

### GET /notices/:id
Get notice details.

### PUT /notices/:id
Update notice.

### DELETE /notices/:id
Delete notice.

### GET /notices/recent
Get recent notices.

### GET /notices/pinned
Get pinned notices.

## Reports Endpoints

### GET /reports/students
Get student reports.

### GET /reports/attendance
Get attendance reports.

### GET /reports/exams
Get exam reports.

### GET /reports/fees
Get fee reports.

### GET /reports/teachers
Get teacher reports.

## Session Management Endpoints

### GET /sessions
Get all academic sessions.

### POST /sessions
Create new session.

### GET /sessions/active
Get active session.

### PUT /sessions/:id/activate
Activate session.

## Dashboard Endpoints

### GET /dashboard/stats
Get dashboard statistics.

### GET /dashboard/activities
Get recent activities.

### GET /dashboard/notifications
Get notifications.

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input data |
| 401 | Unauthorized - Invalid or missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource already exists |
| 422 | Unprocessable Entity - Validation errors |
| 500 | Internal Server Error - Server error |

## Rate Limiting

API requests are limited to 100 requests per 15-minute window per IP address.

## File Upload

File uploads are supported for:
- Profile images (JPEG, PNG, GIF - max 5MB)
- Documents (PDF, DOC, DOCX - max 10MB)
- Study materials (PDF, DOC, DOCX, PPT, PPTX - max 20MB)

Upload endpoints return file information:
```json
{
  "success": true,
  "data": {
    "filename": "generated_filename.jpg",
    "originalName": "original_filename.jpg",
    "mimetype": "image/jpeg",
    "size": 1024000,
    "path": "uploads/profiles/generated_filename.jpg"
  }
}
```

## Pagination

List endpoints support pagination with these parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)

Pagination response includes:
```json
{
  "pagination": {
    "current": 1,
    "pages": 10,
    "total": 100,
    "limit": 10
  }
}
```

## Filtering and Sorting

Most list endpoints support:
- `search`: Text search in relevant fields
- `sortBy`: Field to sort by
- `sortOrder`: `asc` or `desc`
- Various filter parameters specific to each endpoint

## Validation

Request validation follows these rules:
- Required fields must be provided
- Email addresses must be valid
- Phone numbers must be valid
- Dates must be in ISO format
- Enum fields must match allowed values
- String lengths must be within limits
- Numbers must be within valid ranges

Validation errors return detailed information:
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email"
    }
  ]
}
```