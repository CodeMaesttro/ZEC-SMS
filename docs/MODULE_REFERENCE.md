# School Management System - Module Reference Guide

## Overview

This document provides a comprehensive reference for all modules in the School Management System, including their features, workflows, and usage instructions.

## Table of Contents

1. [User Management](#user-management)
2. [Academic Structure](#academic-structure)
3. [Student Management](#student-management)
4. [Teacher Management](#teacher-management)
5. [Exam Management](#exam-management)
6. [Attendance Management](#attendance-management)
7. [Fee Management](#fee-management)
8. [Library Management](#library-management)
9. [Study Materials](#study-materials)
10. [Messaging System](#messaging-system)
11. [Noticeboard](#noticeboard)
12. [Reports](#reports)
13. [Dashboard](#dashboard)
14. [Settings](#settings)

---

## User Management

### Overview
Comprehensive user management system supporting multiple roles with role-based access control.

### User Roles
- **Admin**: Full system access and management
- **Teacher**: Academic and student management within assigned scope
- **Student**: Personal academic records and communication
- **Parent**: Child's academic records and school communication

### Features

#### User Registration & Authentication
- Secure user registration with email verification
- JWT-based authentication
- Password reset functionality
- Account lockout after failed attempts
- Session management

#### Profile Management
- Personal information management
- Profile image upload
- Contact information
- Emergency contacts
- Password change

#### Role-Based Access Control
- Permission-based access to features
- Dynamic menu generation based on role
- API endpoint protection
- Resource-level access control

### Workflows

#### Admin User Creation
1. Admin logs into system
2. Navigate to Users → Add User
3. Fill user details and assign role
4. System sends welcome email
5. User activates account via email link

#### User Profile Update
1. User navigates to Profile section
2. Edit personal information
3. Upload profile image (optional)
4. Save changes
5. System validates and updates data

### API Endpoints
- `GET /api/users` - List users with filters
- `POST /api/users` - Create new user
- `GET /api/users/:id` - Get user details
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Deactivate user

---

## Academic Structure

### Overview
Hierarchical academic structure management including sessions, classes, sections, and subjects.

### Components

#### Academic Sessions
- Annual academic periods (e.g., 2024-2025)
- Start and end dates
- Active session management
- Historical session data

#### Classes
- Grade levels (Grade 1-12)
- Class capacity management
- Class teacher assignment
- Subject mapping

#### Sections
- Class subdivisions (A, B, C, etc.)
- Section capacity
- Room assignments
- Section teacher assignment

#### Subjects
- Subject definitions with codes
- Teacher assignments
- Class mappings
- Credit hours and marking schemes

### Features

#### Session Management
- Create and manage academic sessions
- Switch between sessions
- Session-based data isolation
- Academic calendar integration

#### Class Structure
- Hierarchical class organization
- Capacity management
- Teacher assignments
- Student enrollment tracking

#### Subject Configuration
- Subject creation with detailed information
- Teacher-subject assignments
- Multi-class subject teaching
- Marking scheme configuration

### Workflows

#### New Academic Year Setup
1. Admin creates new academic session
2. Copy/create class structure
3. Assign teachers to classes and subjects
4. Configure fee structure
5. Activate new session

#### Subject Assignment
1. Admin/Principal selects teacher
2. Choose subjects to assign
3. Select classes for each subject
4. Set teaching schedule
5. Confirm assignments

### API Endpoints
- `GET /api/sessions` - List academic sessions
- `POST /api/classes` - Create class
- `GET /api/sections/class/:classId` - Get class sections
- `POST /api/subjects` - Create subject

---

## Student Management

### Overview
Comprehensive student lifecycle management from admission to graduation.

### Features

#### Student Registration
- Personal information capture
- Academic details
- Parent/guardian information
- Medical information
- Transport requirements
- Hostel accommodation

#### Academic Records
- Class and section assignments
- Roll number management
- Academic history
- Promotion/retention records
- Tran