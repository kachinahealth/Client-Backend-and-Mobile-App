# KachinaHealth Database Setup

Complete SQL schema for the KachinaHealth client portal database with Supabase integration.

## Overview

This SQL file creates a comprehensive database schema supporting all dashboard tabs and features:

- **8 Main Tables**: For user management, news, hospitals, training materials, etc.
- **Security**: Row Level Security (RLS) policies for all tables
- **Triggers**: Automatic timestamp updates
- **Sample Data**: Initial users, news, and hospitals for testing
- **Relationships**: Proper foreign key constraints

## Tables Created

### Core Management Tables
- `users` - User accounts and roles
- `news_items` - News and announcements
- `hospitals` - Enrollment leaderboard data
- `training_materials` - Training content
- `study_protocols` - Protocol documents
- `pdf_documents` - PDF file management
- `user_analytics` - User behavior tracking
- `app_settings` - Application configuration

### Legacy Tables
- `clients` - Basic client management (backward compatibility)

## Security Features

- **Row Level Security (RLS)** enabled on all tables
- **Authenticated user policies** for all operations
- **Audit trails** with `created_by` tracking
- **Automatic timestamps** with `updated_at` triggers

## Installation

1. **Open Supabase Dashboard**
2. **Navigate to SQL Editor**
3. **Copy and paste the entire contents** of `database-setup.sql`
4. **Run the SQL commands**

## Sample Data Included

- Admin user account
- Sample users for testing
- Welcome news item
- Sample hospitals with enrollment data

## Post-Installation

After running the SQL:

1. **Verify tables exist** in your Supabase dashboard
2. **Check RLS policies** are properly applied
3. **Test authentication** with the sample admin account
4. **Review sample data** in each table

## Maintenance

- **Regular backups** of your Supabase data
- **Monitor RLS policies** for security
- **Update settings** via the dashboard Settings tab
- **Review analytics** for user behavior insights

## Troubleshooting

If you encounter issues:

1. **Check Supabase permissions** - ensure your account has admin access
2. **Verify table creation** - all tables should appear in the dashboard
3. **Test RLS policies** - try accessing data as an authenticated user
4. **Check sample data** - verify initial records were created

## Schema Updates

When making schema changes:

1. **Backup existing data**
2. **Test changes in development first**
3. **Update RLS policies** for new tables
4. **Document changes** in this README

---

**Note**: This schema is optimized for the KachinaHealth client portal and includes all features from the dashboard tabs.
