# KachinaHealth Client Portal Application

A comprehensive client management portal with Supabase authentication and a rich dashboard featuring multiple management tabs. Built with Express.js backend and Next.js frontend.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Supabase account with project set up

### 1. Database Setup (One-time setup)
Run the SQL commands in `database/setup/complete-database-setup.sql` in your Supabase SQL editor to create all tables and policies.
*Skip this step if your database is already set up.*

### 2. Environment Configuration
**Note: A `.env` file already exists in the `backend/` directory with database credentials configured. The application will automatically use this existing configuration.**

The existing `.env` file contains:
- Supabase project URL and API keys
- JWT secret for authentication
- Server port (5000) and environment settings

If you need to modify these settings, you can edit the existing `backend/.env` file.

### 3. Install Dependencies
```bash
# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ../Client-Backend-and-Mobile-App-master/admin-dashboard
npm install
```

### 4. Start the Application

#### Option A: Automated Startup Scripts (Windows - Recommended)
For the easiest setup on Windows, use one of the provided scripts:

**PowerShell (recommended):**
```powershell
# Run from project root directory
.\start-dev.ps1
```

**Batch file (alternative):**
```batch
# Run from project root directory
start-dev.bat
```

These scripts will automatically start both servers in separate windows and provide status updates.

#### Option B: Manual Terminal Commands (Linux/Mac/bash)
```bash
# Terminal 1: Backend (run from project root)
cd backend && npm start

# Terminal 2: Frontend (run from project root)
cd Client-Backend-and-Mobile-App-master/admin-dashboard && npm run dev
```

#### Option C: Using absolute paths (Windows/PowerShell)
```powershell
# Terminal 1: Backend
cd "C:\PATH\TO\YOUR\PROJECT\backend"
npm start

# Terminal 2: Frontend
cd "C:\PATH\TO\YOUR\PROJECT\Client-Backend-and-Mobile-App-master\admin-dashboard"
npm run dev
```

### 5. Access Application
- **Login Page**: `http://localhost:3000`
- **Dashboard**: `http://localhost:3000/clienthome.html`
- **API Health Check**: `http://localhost:5000/health`

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

#### Quick Start (Recommended)
```bash
# Terminal 1: Backend
cd backend && npm start

# Terminal 2: Frontend
cd Client-Backend-and-Mobile-App-master/admin-dashboard && npm run dev
```

#### Windows/PowerShell Alternative
If you're on Windows and the above commands don't work, use absolute paths:
```powershell
# Terminal 1: Backend
cd "C:\PATH\TO\YOUR\PROJECT\backend"
npm start

# Terminal 2: Frontend
cd "C:\PATH\TO\YOUR\PROJECT\Client-Backend-and-Mobile-App-master\admin-dashboard"
npm run dev
```

#### Development URLs
- **Frontend (Next.js)**: `http://localhost:3000`
- **Backend API**: `http://localhost:5000`
- **API Health Check**: `http://localhost:5000/health`
- **Dashboard**: `http://localhost:3000/clienthome.html`

#### Development Scripts
- `npm start` - Start backend server (production mode)
- `npm run dev` - Start frontend development server
- `npm run build` - Build frontend for production

### Database Management
- View data in Supabase dashboard
- Export/import data via dashboard debug tab
- All tables include automatic timestamps and audit trails

### Troubleshooting

#### Common Issues

**"The token '&&' is not a valid statement separator" (Windows/PowerShell)**
- PowerShell uses `;` instead of `&&` for command chaining
- Use absolute paths instead of relative navigation
- Example: `cd "C:\Path\To\Project\backend"; npm start`

**"EADDRINUSE: address already in use"**
- A server is already running on the specified port
- Kill existing processes: `netstat -ano | findstr :PORT_NUMBER`
- Or change the port in your `.env` file

**"Cannot find path" errors**
- Use absolute paths instead of relative paths
- Each terminal session starts fresh - navigate explicitly each time

**Frontend shows 404 for API calls**
- Ensure backend server is running on port 5000
- Check CORS settings if accessing from different ports

#### Test Credentials (Sample Data)
- **Admin User**: `admin@kachinahealth.com`
- **Manager**: `john.smith@hospital1.com`
- **User**: `sarah.johnson@hospital2.com`

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
