# KachinaHealth Client Portal Application

A comprehensive client management portal with Supabase authentication and a rich dashboard featuring multiple management tabs. Built with Express.js backend and Next.js frontend.

## 🚀 Quick Start

### 1. Database Setup
Run the SQL commands in `database-setup.sql` in your Supabase SQL editor to create all tables and policies.

### 2. Backend Setup
```bash
cd backend
npm install
# Create .env file with your Supabase credentials (see Environment Variables below)
npm start
```

### 3. Frontend Setup
```bash
cd Client-Backend-and-Mobile-App-master/admin-dashboard
npm install
npm run dev
```

### 4. Access Application
- **Login Page**: `http://localhost:3000`
- **Dashboard**: `http://localhost:3000/clienthome.html`

## 📋 Features

### 🔐 **Authentication & Security**
- JWT-based login with Supabase
- Protected API routes with authentication middleware
- Row Level Security (RLS) policies
- Secure session management

### 📊 **Dashboard Tabs**
- **👥 User Management**: Add/edit/delete users, manage roles and status
- **📰 News & Updates**: Create and manage news items for clients
- **🏥 Enrollment Leaderboard**: Track hospital progress and rankings
- **📚 Training Materials**: Upload and manage training content
- **📋 Study Protocols**: Document management for protocols
- **📈 Analytics**: User behavior tracking and statistics
- **⚙️ Settings**: Application configuration

### 🎨 **Modern UI/UX**
- Clean, responsive design with Material-UI components
- Gradient backgrounds and professional styling
- Real-time data updates
- Intuitive tabbed interface

## 🏗️ Architecture

```
client-portal-app/
├── backend/                              # Express.js API server
│   ├── server.js                        # Main server with all endpoints
│   ├── supabaseClient.js                # Supabase configuration
│   ├── package.json                     # Optimized dependencies
│   └── README.md                        # Backend documentation
├── Client-Backend-and-Mobile-App-master/admin-dashboard/
│   ├── pages/index.tsx                  # Login page
│   ├── public/clienthome.html           # Full dashboard with all tabs
│   ├── package.json                     # Frontend dependencies
│   └── docs/screenshots/                # Documentation images
├── database-setup.sql                   # Complete database schema
└── README.md                            # This file
```

## 🔧 Environment Variables

Create a `.env` file in the `backend/` directory with your Supabase credentials:

### Getting Your Supabase Credentials

1. **Go to your Supabase Dashboard**: [supabase.com](https://supabase.com)
2. **Select your project** (or create a new one)
3. **Go to Settings → API**
4. **Copy the following values**:
   - **Project URL**: `https://your-project-ref.supabase.co`
   - **anon/public key**: Long JWT token starting with `eyJ...`

### Environment File Setup

Create `backend/.env` with:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
PORT=5000
NODE_ENV=development
```

**Location**: `backend/.env` (created and configured with Supabase credentials)

## 🚦 Complete API Endpoints

### 🔐 Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/verify` - Verify JWT token
- `GET /api/user/profile` - Get user profile

### 📊 Dashboard
- `GET /api/dashboard` - Get dashboard statistics

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
- `GET /api/hospitals` - Get all hospitals
- `GET /api/hospitals/:id` - Get single hospital
- `POST /api/hospitals` - Create hospital
- `PUT /api/hospitals/:id` - Update hospital
- `DELETE /api/hospitals/:id` - Delete hospital

### 📚 Training Materials
- `GET /api/training-materials` - Get all materials
- `POST /api/training-materials` - Create material
- `DELETE /api/training-materials/:id` - Delete material

### 📋 Study Protocols
- `GET /api/study-protocols` - Get all protocols
- `POST /api/study-protocols` - Create protocol
- `DELETE /api/study-protocols/:id` - Delete protocol

### 📄 PDF Documents
- `GET /api/pdfs` - Get all PDF documents
- `POST /api/pdfs` - Upload PDF document
- `DELETE /api/pdfs/:id` - Delete PDF document

### 📈 Analytics
- `GET /api/analytics` - Get analytics data
- `POST /api/analytics/track` - Track user activity

### ⚙️ Settings
- `GET /api/settings` - Get app settings
- `PUT /api/settings/:key` - Update setting

### 🛠️ System
- `GET /` - API information
- `GET /health` - Health check

## 🔒 Security Features

- **JWT Authentication**: Secure token-based auth
- **Protected Routes**: All management endpoints require authentication
- **Supabase RLS**: Database-level security policies
- **Input Validation**: Server-side validation on all inputs
- **CORS Protection**: Configured for cross-origin requests
- **Session Management**: Proper token cleanup on logout

## 📱 Usage Flow

1. **🔐 Login**: User authenticates via Supabase at `http://localhost:3000`
2. **📊 Dashboard**: Automatic redirect to `http://localhost:3000/clienthome.html`
3. **📋 Manage Content**: Use tabs to manage users, news, hospitals, training materials, etc.
4. **📈 Analytics**: Track user behavior and app usage
5. **🚪 Logout**: Secure session termination

## 🛠️ Development

### Running the Application
```bash
# Terminal 1: Backend
cd backend && npm start

# Terminal 2: Frontend
cd Client-Backend-and-Mobile-App-master/admin-dashboard && npm run dev

# Access at http://localhost:3000
```

### Database Management
- View data in Supabase dashboard
- Export/import data via dashboard debug tab
- All tables include automatic timestamps and audit trails

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Express.js Documentation](https://expressjs.com/)
- [Material-UI Documentation](https://mui.com/)

---

## 🎯 What's Been Cleaned Up

This codebase has been thoroughly cleaned and optimized:

- ✅ **Removed duplicate files** (old dashboard routes, unused components)
- ✅ **Cleaned console logs** (production-ready, minimal logging)
- ✅ **Optimized dependencies** (removed unused packages)
- ✅ **Unified architecture** (single dashboard HTML with full functionality)
- ✅ **Updated API endpoints** (consistent authentication across all routes)
- ✅ **Production-ready code** (error handling, security, performance)

**Ready for production deployment!** 🚀
