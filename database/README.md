# KachinaHealth Database Setup

Complete SQL schema and migration system for the KachinaHealth clinical trials platform with organization-based multi-tenancy and role-based access control.

## 📁 Directory Structure

```
database/
├── README.md                              # This file
├── migrations/
│   └── complete-schema-migration.sql      # Core schema migration
└── setup/
    └── complete-database-setup.sql        # Legacy setup (deprecated)
```

## 🚀 Migration Process

### Step 1: Schema Migration
1. **Open Supabase Dashboard**
2. **Navigate to SQL Editor**
3. **Run**: `database/migrations/complete-schema-migration.sql`
4. **Verify**: Check that all tables were created successfully

### Step 2: RLS Policies
Run the RLS policies migration (will be provided in next chunk)

### Step 3: Seed Data
Run the seed data script (will be provided in next chunk)

### Step 4: Storage Buckets
Create storage buckets via Supabase dashboard or CLI

## 📊 Database Schema

### 🏢 Core Multi-Tenant Tables

**Organizations**
- Multi-tenant organization management (Cerevasc, Medtronic, etc.)
- Each organization represents a separate tenant

**Profiles**
- Application-level user profiles linked to Supabase Auth
- Includes organization assignment and role (admin, user, doctor)

**Clinical Trials**
- Clinical trial definitions scoped to organizations
- Admins create/manage trials within their organization

**User Clinical Assignments**
- Links users to specific clinical trials they can access
- Users and doctors can only work on assigned trials

### 📄 Content Tables (All Organization + Trial Scoped)

**Enrollments**
- Patient enrollments in clinical trials
- Includes enrollment date, participant info, and documents

**News Updates**
- News and announcements for clinical trials
- Rich text content with optional attachments

**Training Materials**
- Training documents and resources
- Supports multiple file types and formats

**Study Protocols**
- Study protocol documents for clinical trials
- Version tracking and approval workflows

**Files (Optional Index)**
- Central index for all uploaded files
- Tracks storage usage and provides unified file management

## 🔒 Security Features

### Organization-Based Multi-Tenancy
- **Organization scoping**: All data is scoped to user's organization
- **Clinical trial access**: Users can only access assigned trials
- **Cross-organization isolation**: Complete data separation between orgs

### Role-Based Access Control (RBAC)
- **Admin**: Full CRUD within their organization, can manage clinical trials
- **User**: CRUD on assigned trials, can create users in their org
- **Doctor**: Read-only access to assigned trials

### Row Level Security (RLS)
- **Automatic enforcement**: Database-level security policies
- **Auth integration**: Uses `auth.uid()` for user identification
- **Organization filtering**: Policies ensure org-scoped access
- **Role validation**: Operations restricted by user role

#### RLS Policy Summary
- **Organization Scoping**: All users can only access records in their organization
- **Admin**: Full CRUD on all trials + content in their organization
- **User**: CRUD only on trials they're assigned to (via user_clinical_assignments)
- **Doctor**: Read-only access to content in assigned trials
- **Clinical Trials**: Only admins can manage trials within their organization

#### Helper Functions
- `get_user_organization_id()`: Returns user's organization
- `get_user_role()`: Returns user's role
- `is_user_assigned_to_trial(trial_id)`: Checks trial assignment
- `create_profile_and_assignments()`: Creates users with org + trial assignment
- `list_clinical_trials_for_admin()`: Lists trials for admin dropdown
- `get_user_accessible_trials()`: Returns trials user can access
- `get_organization_stats()`: Returns dashboard statistics

#### Database Triggers
- **Auto-organization**: Sets org_id on assignments automatically
- **Timestamps**: Updates `updated_at` on content changes
- **Validation**: Prevents cross-organization content creation
- **Consistency**: Maintains data integrity across relationships

#### Storage Buckets
- **trial-documents**: General trial documentation
- **training-materials**: Training content and resources
- **study-protocols**: Protocol documents and amendments
- **news-assets**: Images and attachments for news updates
- **enrollment-docs**: Consent forms and enrollment paperwork

#### File Storage Integration
- **Private buckets**: All files secured with signed URL access
- **Organization isolation**: Files only accessible within organization
- **Path structure**: `bucket/folder/filename.ext`
- **Metadata tracking**: File index table for storage analytics

## 🛠️ Maintenance

### Schema Updates
1. Create timestamped migration files: `YYYY-MM-DD-description.sql`
2. Include RLS policy updates for new tables
3. Test in development environment first
4. Update helper functions if needed

### RLS Policy Updates
1. **Backup existing policies** before changes
2. **Test with different user roles** (admin, user, doctor)
3. **Verify organization scoping** works correctly
4. **Document policy changes** in migration files

## 🔍 Troubleshooting

### Common Issues
- **RLS blocking access**: Check user's organization and role
- **Foreign key errors**: Ensure referenced records exist in same org
- **Auth integration**: Verify `auth.uid()` returns correct user ID

### Testing RLS Policies
```sql
-- Test as specific user (replace with actual UUID)
SET LOCAL auth.uid TO 'user-uuid-here';

-- Test organization scoping
SELECT * FROM clinical_trials; -- Should only return user's org trials

-- Test role-based access
SELECT * FROM enrollments; -- Admin: all in org, User/Doctor: only assigned trials

-- Test helper functions
SELECT get_user_organization_id();
SELECT get_user_role();
SELECT is_user_assigned_to_trial('trial-uuid-here');
```

### Sample Data (Post-Migration)
- **Organizations**: Cerevasc, Medtronic
- **Users**: admin@cerevasc.com, dummy@cerevasc.com, admin@medtronic.com, doctor@cerevasc.com
- **Clinical Trials**: Cerevasc Trial A, Cerevasc Trial B
- **Assignments**: dummy@cerevasc.com & doctor@cerevasc.com → Trial A
- **Content for Trial A**: 2 enrollments, 2 news updates, 2 training materials, 2 study protocols
- **Content for Trial B**: 1 enrollment, 1 news update

## 🗂️ Migration Strategy

### Current Migration Status
1. ✅ **Schema Migration**: `complete-schema-migration.sql`
2. ✅ **RLS Policies**: `rls-policies-migration.sql`
3. ✅ **Helper Functions & Triggers**: `helper-functions-triggers.sql`
4. ✅ **Seed Data**: `seed-data.sql`
5. ✅ **Storage Setup**: `storage-setup.sql`

### Future Updates
1. Create timestamped migration files
2. Include both schema and policy changes
3. Update seed data as needed
4. Test with all user roles

---

## 🛠️ **Developer Setup Guide**

This section provides step-by-step instructions for setting up the clinical trials platform with organization-based multi-tenancy and role-based access control.

### 📋 **Schema Overview Reminder**

**Organizations**: Multi-tenant isolation (Cerevasc, Medtronic, etc.)
- **Admins**: Full CRUD within their organization, manage clinical trials
- **Users**: CRUD only on assigned trials, can create users in their org
- **Doctors**: Read-only access to assigned trials

**Security**: Row Level Security (RLS) enforces organization and role boundaries.

---

## 🚀 **1. Database Setup**

### Option A: Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard** → Your Project → SQL Editor

2. **Run Migrations in Order**:
   ```sql
   -- 1. Schema Migration
   -- Copy and paste: database/migrations/complete-schema-migration.sql

   -- 2. RLS Policies
   -- Copy and paste: database/migrations/rls-policies-migration.sql

   -- 3. Helper Functions & Triggers
   -- Copy and paste: database/migrations/helper-functions-triggers.sql

   -- 4. Seed Data
   -- Copy and paste: database/migrations/seed-data.sql
   ```

### Option B: Supabase CLI

```bash
# Install Supabase CLI if not already installed
npm install supabase --global

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push

# Alternative: Run individual SQL files
supabase db reset  # Reset database
psql "your-connection-string" -f database/migrations/complete-schema-migration.sql
psql "your-connection-string" -f database/migrations/rls-policies-migration.sql
psql "your-connection-string" -f database/migrations/helper-functions-triggers.sql
psql "your-connection-string" -f database/migrations/seed-data.sql
```

### Option C: Direct PostgreSQL

```bash
# Using psql command line
psql -h your-host -U your-user -d your-database -f database/migrations/complete-schema-migration.sql
psql -h your-host -U your-user -d your-database -f database/migrations/rls-policies-migration.sql
psql -h your-host -U your-user -d your-database -f database/migrations/helper-functions-triggers.sql
psql -h your-host -U your-user -d your-database -f database/migrations/seed-data.sql
```

---

## 🪣 **2. Storage Bucket Setup**

Create private storage buckets for secure file handling:

### Supabase CLI Commands:
```bash
# Create private buckets
supabase storage bucket create trial-documents --private
supabase storage bucket create training-materials --private
supabase storage bucket create study-protocols --private
supabase storage bucket create news-assets --private
supabase storage bucket create enrollment-docs --private
```

### Alternative: Supabase Dashboard
1. Go to **Settings** → **Storage**
2. Click **Create bucket** for each bucket
3. Set **Public** to **False** (private)
4. Use bucket names exactly as listed above

---

## 🔧 **3. Helper Functions Usage**

### Creating New Users

Use `create_profile_and_assignments()` to add users to your organization:

```sql
-- Example: Admin creates a new user and assigns to Trial A
SELECT create_profile_and_assignments(
  'admin-user-uuid'::uuid,        -- Admin creating the user
  'new-user-auth-uuid'::uuid,     -- New user's auth.users ID
  'user',                         -- Role: 'admin', 'user', or 'doctor'
  'trial-a-uuid'::uuid           -- Clinical trial to assign (optional)
);
```

**Response Format**:
```json
{
  "success": true,
  "profile_id": "uuid",
  "organization_id": "uuid",
  "trial_assigned": true
}
```

### Getting Clinical Trials for Admin Dropdown

Use `list_clinical_trials_for_admin()` to populate trial selection dropdowns:

```sql
-- Get all trials for admin's organization
SELECT id, name, description, is_active, participant_count
FROM list_clinical_trials_for_admin('admin-user-uuid'::uuid);
```

**Response includes participant counts for each trial.**

---

## 🧪 **4. Testing RLS Policies**

Test that Row Level Security works correctly across different user roles:

### Setup Test Session
```sql
-- Set session to specific user (replace with actual UUIDs)
SET LOCAL auth.uid TO 'admin@cerevasc.com-uuid';
-- OR
SET LOCAL auth.uid TO 'dummy@cerevasc.com-uuid';
-- OR
SET LOCAL auth.uid TO 'doctor@cerevasc.com-uuid';
```

### Admin User Tests (admin@cerevasc.com)
```sql
-- Should see all Cerevasc trials
SELECT name FROM clinical_trials;

-- Should see all Cerevasc users
SELECT display_name, role FROM profiles;

-- Should see all enrollments in org
SELECT participant_name FROM enrollments;
```

### Regular User Tests (dummy@cerevasc.com)
```sql
-- Should only see assigned trials (Trial A)
SELECT name FROM clinical_trials;

-- Should only see enrollments in assigned trials
SELECT participant_name FROM enrollments;

-- Should be able to create content in assigned trials
INSERT INTO news_updates (organization_id, clinical_trial_id, title, body, created_by)
VALUES (
  (SELECT organization_id FROM profiles WHERE id = auth.uid()),
  (SELECT id FROM clinical_trials WHERE name = 'Cerevasc Trial A'),
  'User Created News',
  'This news was created by a regular user',
  auth.uid()
);
```

### Doctor User Tests (doctor@cerevasc.com)
```sql
-- Should only see assigned trials
SELECT name FROM clinical_trials;

-- Should only see enrollments (read-only)
SELECT participant_name FROM enrollments;

-- Should NOT be able to create content (will be blocked by RLS)
INSERT INTO enrollments (...) VALUES (...); -- Should fail
```

---

## 📁 **5. File Upload & Access**

### Uploading Files

1. **Upload to Supabase Storage**:
```javascript
// Frontend: Upload file to storage
const { data, error } = await supabase.storage
  .from('trial-documents')
  .upload('consent-forms/patient-123.pdf', file)

// Returns: { path: 'consent-forms/patient-123.pdf' }
```

2. **Store Reference in Database**:
```sql
-- Store file reference in appropriate table
INSERT INTO enrollments (
  organization_id,
  clinical_trial_id,
  participant_name,
  enrollment_date,
  created_by,
  storage_path
) VALUES (
  (SELECT organization_id FROM profiles WHERE id = auth.uid()),
  'trial-uuid'::uuid,
  'John Doe',
  CURRENT_DATE,
  auth.uid(),
  'trial-documents/consent-forms/patient-123.pdf'
);

-- Also track in files index
INSERT INTO files (
  organization_id,
  clinical_trial_id,
  bucket,
  path,
  uploaded_by,
  file_name,
  file_size,
  mime_type
) VALUES (
  (SELECT organization_id FROM profiles WHERE id = auth.uid()),
  'trial-uuid'::uuid,
  'trial-documents',
  'consent-forms/patient-123.pdf',
  auth.uid(),
  'patient-123-consent.pdf',
  2457600,
  'application/pdf'
);
```

### Accessing Files with Signed URLs

**Frontend: Generate Signed URL**
```javascript
// Get signed URL for secure file access
const { data, error } = await supabase.storage
  .from('trial-documents')
  .createSignedUrl('consent-forms/patient-123.pdf', 3600) // 1 hour expiry

if (data?.signedUrl) {
  // Open file in new tab or download
  window.open(data.signedUrl, '_blank')
}
```

**Backend API Endpoint**
```javascript
app.get('/api/files/:bucket/:path', async (req, res) => {
  const { bucket, path } = req.params

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 3600)

  if (error) return res.status(500).json({ error: error.message })

  res.json({ signedUrl: data.signedUrl })
})
```

**SQL Query with Signed URL**
```sql
-- Get file info with signed URL
SELECT
  f.file_name,
  f.bucket,
  f.path,
  generate_file_signed_url(f.bucket, f.path, 3600) as signed_url
FROM files f
WHERE f.organization_id = get_user_organization_id()
  AND f.id = 'your-file-id';
```

---

## 🔍 **6. Troubleshooting**

### Common Issues

**RLS Blocking Access**
```sql
-- Check user's organization and role
SELECT organization_id, role FROM profiles WHERE id = auth.uid();

-- Test specific policy
SET LOCAL auth.uid TO 'user-uuid';
SELECT * FROM enrollments; -- Should only return accessible records
```

**Storage Upload Failures**
```bash
# Check bucket exists and is private
supabase storage list-buckets

# Verify bucket permissions
supabase storage get-bucket trial-documents
```

**Helper Function Errors**
```sql
-- Test helper function directly
SELECT create_profile_and_assignments(
  'admin-uuid'::uuid,
  'new-user-uuid'::uuid,
  'user'::text,
  NULL::uuid
);
```

### Useful Diagnostic Queries

**Check Organization Data**
```sql
-- View organization structure
SELECT o.name as org_name,
       COUNT(p.id) as user_count,
       COUNT(ct.id) as trial_count
FROM organizations o
LEFT JOIN profiles p ON o.id = p.organization_id
LEFT JOIN clinical_trials ct ON o.id = ct.organization_id
GROUP BY o.id, o.name;
```

**Verify RLS Policies**
```sql
-- Check which policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Monitor Storage Usage**
```sql
-- Check storage usage by organization
SELECT * FROM get_organization_storage_usage(
  (SELECT id FROM organizations WHERE name = 'Cerevasc')
);
```

---

## 📚 **Additional Resources**

- **Supabase Docs**: [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- **Storage Guide**: [File Upload & Management](https://supabase.com/docs/guides/storage)
- **Migration Best Practices**: [Database Migrations](https://supabase.com/docs/guides/cli/local-development)

---

**🎉 Setup Complete!** Your clinical trials platform is now configured with enterprise-grade multi-tenancy, role-based security, and secure file handling. Test thoroughly with different user roles to ensure RLS policies work as expected.
