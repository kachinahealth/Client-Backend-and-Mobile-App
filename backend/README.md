# KachinaHealth Client Portal Backend

Comprehensive Express.js backend for the KachinaHealth client management portal with Supabase authentication and full dashboard tab support.

## Features

- 🔐 JWT-based authentication with Supabase
- 📊 **Complete Dashboard API** with 8 management tabs
- 👥 User Management (CRUD operations)
- 📰 News & Updates management
- 🏥 Hospital/Leaderboard tracking
- 📚 Training Materials management
- 📋 Study Protocol management
- 📄 PDF Document handling
- 📈 Analytics tracking
- ⚙️ Settings management
- 🛡️ Protected API routes with authentication middleware

## Setup

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Environment Variables:**
   **Note: A `.env` file already exists in the backend directory with database credentials configured. The application will automatically use this existing configuration.**

   The existing `.env` file contains:
   - Supabase project URL and API keys
   - JWT secret for authentication
   - Server port (5000) and environment settings

   If you need to modify these settings, you can edit the existing `.env` file.

3. **Database Setup:**
   Run the SQL commands in `../database-setup.sql` in your Supabase SQL editor.

4. **Start the server:**
   ```bash
   npm start
   # or for development
   npm run dev
   ```

## Complete API Endpoints

### 🔐 Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/verify` - Verify JWT token
- `GET /api/user/profile` - Get user profile

### 📊 Dashboard
- `GET /api/dashboard` - Get dashboard statistics (total users, pending approvals, etc.)

### 👥 User Management
- `GET /api/users` - Get all users
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### 📰 News & Updates
- `GET /api/news` - Get all news items
- `POST /api/news` - Create news item
- `PUT /api/news/:id` - Update news item
- `DELETE /api/news/:id` - Delete news item

### 🏥 Hospitals/Leaderboard
- `GET /api/hospitals` - Get all hospitals (sorted by randomized patients)
- `GET /api/hospitals/:id` - Get single hospital
- `POST /api/hospitals` - Create hospital
- `PUT /api/hospitals/:id` - Update hospital
- `DELETE /api/hospitals/:id` - Delete hospital

### 📚 Training Materials
- `GET /api/training-materials` - Get all training materials
- `POST /api/training-materials` - Create training material
- `DELETE /api/training-materials/:id` - Delete training material

### 📋 Study Protocols
- `GET /api/study-protocols` - Get all study protocols
- `POST /api/study-protocols` - Create study protocol
- `DELETE /api/study-protocols/:id` - Delete study protocol

### 📄 PDF Documents
- `GET /api/pdfs` - Get all PDF documents
- `POST /api/pdfs` - Upload PDF document
- `DELETE /api/pdfs/:id` - Delete PDF document

### 📈 Analytics
- `GET /api/analytics` - Get user analytics data
- `POST /api/analytics/track` - Track user activity (tab views, app opens)

### ⚙️ Settings
- `GET /api/settings` - Get app settings
- `PUT /api/settings/:key` - Update setting

### 🛠️ System
- `GET /` - API information and status
- `GET /health` - Health check endpoint

## Database Schema

The backend works with the complete database schema defined in `database-setup.sql`, which includes:

- `users` - User management
- `news_items` - News & updates
- `hospitals` - Enrollment leaderboard
- `training_materials` - Training content
- `study_protocols` - Protocol documents
- `pdf_documents` - PDF file management
- `user_analytics` - User behavior tracking
- `app_settings` - Application configuration
- `clients` - Legacy client management (for backward compatibility)

All tables include:
- UUID primary keys with auto-generation
- Automatic `created_at` and `updated_at` timestamps
- Row Level Security (RLS) policies
- Proper foreign key relationships
- Audit trails with `created_by` fields

## Security Features

- **JWT Authentication**: Secure token-based authentication on all management endpoints
- **Supabase RLS**: Database-level security policies for all tables
- **Input Validation**: Server-side validation on all API inputs
- **CORS Protection**: Configured for cross-origin requests
- **Session Management**: Proper token verification and cleanup
- **Audit Trails**: All changes tracked with user attribution

## Development Notes

- **Clean Codebase**: Removed 80+ console.log statements for production readiness
- **Optimized Dependencies**: Minimal package footprint
- **Error Handling**: Comprehensive error handling with proper HTTP status codes
- **Performance**: Efficient database queries with proper indexing
- **Scalability**: RESTful API design ready for expansion

## Testing

The API can be tested using tools like:
- Postman
- Thunder Client (VS Code extension)
- curl commands
- The frontend dashboard's Debug tab

All endpoints return consistent JSON responses with `success`, `message`, and data fields.
