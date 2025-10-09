require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const supabase = require('./supabaseClient');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001'],
  credentials: true
}));
app.use(express.json());

// Global request logging middleware (development only)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`📨 ${req.method} ${req.path}`);
    next();
  });
}

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Basic root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Client Portal Backend API',
    version: '1.0.0',
    status: 'running'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});


// User login endpoint
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Attempt to sign in with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Supabase login error:', error.message);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        error: error.message
      });
    }

    // Create JWT token for session management
    const token = jwt.sign(
      {
        userId: data.user.id,
        email: data.user.email,
        user_metadata: data.user.user_metadata
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.full_name || data.user.email
      },
      token,
      session: data.session
    });

  } catch (err) {
    console.error('Unexpected login error:', err);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred'
    });
  }
});

// User registration endpoint (optional)
app.post('/api/auth/register', async (req, res) => {
  const { email, password, full_name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: full_name || email
        }
      }
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Registration failed',
        error: error.message
      });
    }

    res.json({
      success: true,
      message: 'Registration successful. Please check your email to confirm your account.',
      user: data.user
    });

  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred'
    });
  }
});

// Logout endpoint
app.post('/api/auth/logout', authenticateToken, async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Logout error:', error);
      return res.status(500).json({
        success: false,
        message: 'Logout failed'
      });
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (err) {
    console.error('Unexpected logout error:', err);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred'
    });
  }
});

// Verify token endpoint
app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// Get user profile with organization and role information
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get profile with organization and role information
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id,
        role,
        display_name,
        created_at,
        organizations (
          id,
          name
        )
      `)
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return res.status(400).json({
        success: false,
        message: 'Failed to fetch user profile',
        error: profileError.message
      });
    }

    // Get auth user information
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);

    if (authError) {
      console.error('Auth user fetch error:', authError);
      // Continue without auth details if there's an error
    }

    res.json({
      success: true,
      profile: {
        id: profile.id,
        email: authUser?.user?.email || req.user.email,
        name: profile.display_name || authUser?.user?.email || req.user.email,
        role: profile.role,
        organization: profile.organizations,
        created_at: profile.created_at,
        last_sign_in_at: authUser?.user?.last_sign_in_at
      }
    });
  } catch (err) {
    console.error('Profile fetch error:', err);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred'
    });
  }
});

// Client Management Endpoints

// Get all clients (protected route)
app.get('/api/clients', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Failed to fetch clients',
        error: error.message
      });
    }

    res.json({
      success: true,
      clients: data
    });
  } catch (err) {
    console.error('Clients fetch error:', err);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred'
    });
  }
});

// Get single client
app.get('/api/clients/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({
        success: false,
        message: 'Client not found',
        error: error.message
      });
    }

    res.json({
      success: true,
      client: data
    });
  } catch (err) {
    console.error('Client fetch error:', err);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred'
    });
  }
});

// Create new client
app.post('/api/clients', authenticateToken, async (req, res) => {
  try {
    const { name, email, company, phone, status } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required'
      });
    }

    const { data, error } = await supabase
      .from('clients')
      .insert([{
        name,
        email,
        company,
        phone,
        status: status || 'active',
        created_by: req.user.userId
      }])
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Failed to create client',
        error: error.message
      });
    }

    res.json({
      success: true,
      message: 'Client created successfully',
      client: data
    });
  } catch (err) {
    console.error('Client creation error:', err);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred'
    });
  }
});

// Update client
app.put('/api/clients/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, company, phone, status } = req.body;

    const { data, error } = await supabase
      .from('clients')
      .update({
        name,
        email,
        company,
        phone,
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Failed to update client',
        error: error.message
      });
    }

    res.json({
      success: true,
      message: 'Client updated successfully',
      client: data
    });
  } catch (err) {
    console.error('Client update error:', err);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred'
    });
  }
});

// Delete client
app.delete('/api/clients/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Failed to delete client',
        error: error.message
      });
    }

    res.json({
      success: true,
      message: 'Client deleted successfully'
    });
  } catch (err) {
    console.error('Client deletion error:', err);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred'
    });
  }
});

// ============================================================================
// DASHBOARD TABS API ENDPOINTS
// ============================================================================

// ===== USERS MANAGEMENT =====

// Get all users in the authenticated user's organization
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get the current user's organization
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', userId)
      .single();

    if (profileError) {
      return res.status(400).json({
        success: false,
        message: 'Failed to get user profile',
        error: profileError.message
      });
    }

    // Only admins can see all users in their organization
    // Users can only see themselves (for now, can be expanded)
    let query = supabase
      .from('profiles')
      .select(`
        id,
        role,
        display_name,
        created_at,
        organizations (
          id,
          name
        )
      `)
      .eq('organization_id', userProfile.organization_id);

    // If not admin, only show users with equal or lower permissions
    if (userProfile.role !== 'admin') {
      query = query.eq('id', userId); // Only show themselves
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase query error:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch users'
      });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`📊 Returning ${data ? data.length : 0} users to frontend`);
    }

    res.json({
      success: true,
      users: data || []
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred'
    });
  }
});

// Create new user with organization assignment
app.post('/api/users', authenticateToken, async (req, res) => {
  try {
    const adminUserId = req.user.userId;
    const { email, role, displayName, clinicalTrialId } = req.body;

    if (!email || !role) {
      return res.status(400).json({
        success: false,
        message: 'Email and role are required'
      });
    }

    // Validate role
    if (!['admin', 'user', 'doctor'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be: admin, user, or doctor'
      });
    }

    // First, create the auth user (this would typically be done by Supabase Auth)
    // For now, we'll assume the auth user already exists or will be created separately
    // In production, this would trigger an invitation email

    // Find the auth user by email
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('Auth users list error:', authError);
      return res.status(500).json({
        success: false,
        message: 'Failed to validate user'
      });
    }

    const authUser = authUsers.users.find(u => u.email === email);

    if (!authUser) {
      return res.status(400).json({
        success: false,
        message: 'User must be registered in the system first. Please have them create an account.'
      });
    }

    // Use the helper function to create profile and assign to organization
    const { data: result, error: helperError } = await supabase
      .rpc('create_profile_and_assignments', {
        admin_user_id: adminUserId,
        new_user_auth_id: authUser.id,
        new_user_role: role,
        selected_clinical_trial_id: clinicalTrialId || null
      });

    if (helperError) {
      console.error('Helper function error:', helperError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create user profile',
        error: helperError.message
      });
    }

    // Parse the result (it's returned as JSON)
    const resultData = typeof result === 'string' ? JSON.parse(result) : result;

    if (!resultData.success) {
      return res.status(400).json({
        success: false,
        message: resultData.error || 'Failed to create user'
      });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`✅ Created user profile: ${resultData.profile_id}`);
    }

    res.json({
      success: true,
      message: 'User created successfully',
      user: {
        id: resultData.profile_id,
        email: email,
        role: role,
        display_name: displayName || email,
        trial_assigned: resultData.trial_assigned
      }
    });
  } catch (err) {
    console.error('User creation error:', err);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred'
    });
  }
});

// Update user
// Update user (Admin only, or user updating themselves)
app.put('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { displayName, role } = req.body;

    // Get current user's profile to check permissions
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', userId)
      .single();

    if (profileError) {
      return res.status(400).json({
        success: false,
        message: 'Failed to get user profile'
      });
    }

    // Check permissions: Admins can update anyone in their org, users can only update themselves
    const isAdmin = userProfile.role === 'admin';
    const isSelf = id === userId;
    const canUpdateRole = isAdmin; // Only admins can change roles

    if (!isAdmin && !isSelf) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own profile'
      });
    }

    // If not admin and trying to update role, deny
    if (!canUpdateRole && role !== undefined) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can change user roles'
      });
    }

    // Verify the user to be updated is in the same organization (if admin)
    if (isAdmin) {
      const { data: targetUser, error: targetError } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', id)
        .single();

      if (targetError || targetUser.organization_id !== userProfile.organization_id) {
        return res.status(403).json({
          success: false,
          message: 'Cannot update users from different organizations'
        });
      }
    }

    // Build update object
    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (displayName !== undefined) {
      updateData.display_name = displayName;
    }

    if (canUpdateRole && role !== undefined) {
      // Validate role
      if (!['admin', 'user', 'doctor'].includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role. Must be: admin, user, or doctor'
        });
      }
      updateData.role = role;
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', id)
      .select(`
        id,
        role,
        display_name,
        created_at,
        updated_at,
        organizations (
          id,
          name
        )
      `)
      .single();

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Failed to update user',
        error: error.message
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      user: data
    });
  } catch (err) {
    console.error('User update error:', err);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred'
    });
  }
});

// Delete user (Admin only)
app.delete('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    // Get current user's profile to check permissions
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', userId)
      .single();

    if (profileError || userProfile.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can delete users'
      });
    }

    // Verify the user to be deleted is in the same organization
    const { data: targetUser, error: targetError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', id)
      .single();

    if (targetError || targetUser.organization_id !== userProfile.organization_id) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete users from different organizations'
      });
    }

    // Cannot delete yourself
    if (id === userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    // Delete the profile (this will cascade to user_clinical_assignments)
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Failed to delete user',
        error: error.message
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (err) {
    console.error('User deletion error:', err);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred'
    });
  }
});

// ============================================================================
// ===== CLINICAL TRIALS MANAGEMENT =====
// ============================================================================

// Get clinical trials for the authenticated user
app.get('/api/clinical-trials', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get user's role and organization
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', userId)
      .single();

    if (profileError) {
      return res.status(400).json({
        success: false,
        message: 'Failed to get user profile',
        error: profileError.message
      });
    }

    let query;

    if (userProfile.role === 'admin') {
      // Admins see all trials in their organization
      query = supabase
        .from('clinical_trials')
        .select(`
          id,
          name,
          description,
          is_active,
          created_at,
          organizations (
            id,
            name
          )
        `)
        .eq('organization_id', userProfile.organization_id);
    } else {
      // Users and doctors see only trials they're assigned to
      query = supabase
        .from('clinical_trials')
        .select(`
          id,
          name,
          description,
          is_active,
          created_at,
          organizations (
            id,
            name
          )
        `)
        .eq('organization_id', userProfile.organization_id)
        .in('id',
          supabase
            .from('user_clinical_assignments')
            .select('clinical_trial_id')
            .eq('user_id', userId)
        );
    }

    const { data, error } = await query.order('is_active', { ascending: false }).order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase query error:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch clinical trials'
      });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`📊 Returning ${data ? data.length : 0} clinical trials to frontend`);
    }

    res.json({
      success: true,
      trials: data || []
    });
  } catch (err) {
    console.error('Clinical trials fetch error:', err);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred'
    });
  }
});

// Create clinical trial (Admin only)
app.post('/api/clinical-trials', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, description, isActive } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Trial name is required'
      });
    }

    // Verify user is admin
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', userId)
      .single();

    if (profileError || userProfile.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can create clinical trials'
      });
    }

    const insertData = {
      organization_id: userProfile.organization_id,
      name,
      description,
      is_active: isActive !== undefined ? isActive : true,
      created_by: userId
    };

    const { data, error } = await supabase
      .from('clinical_trials')
      .insert([insertData])
      .select(`
        id,
        name,
        description,
        is_active,
        created_at,
        organizations (
          id,
          name
        )
      `)
      .single();

    if (error) {
      console.error('Supabase insert error:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to create clinical trial'
      });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`✅ Created clinical trial: ${data.id}`);
    }

    res.json({
      success: true,
      message: 'Clinical trial created successfully',
      trial: data
    });
  } catch (err) {
    console.error('Clinical trial creation error:', err);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred'
    });
  }
});

// Update clinical trial
app.put('/api/clinical-trials/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { trial_name, description, status, start_date, end_date } = req.body;

    if (!trial_name) {
      return res.status(400).json({
        success: false,
        message: 'Trial name is required'
      });
    }

    const updateData = {
      trial_name,
      description,
      status,
      start_date,
      end_date,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('clinical_trials')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Supabase update error:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to update clinical trial'
      });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`✅ Updated clinical trial: ${data.id}`);
    }

    res.json({
      success: true,
      message: 'Clinical trial updated successfully',
      trial: data
    });
  } catch (err) {
    console.error('Clinical trial update error:', err.message);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred'
    });
  }
});

// Delete clinical trial
app.delete('/api/clinical-trials/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('clinical_trials')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Failed to delete clinical trial',
        error: error.message
      });
    }

    res.json({
      success: true,
      message: 'Clinical trial deleted successfully'
    });
  } catch (err) {
    console.error('Clinical trial deletion error:', err);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred'
    });
  }
});

// ============================================================================
// ===== CONTENT MANAGEMENT ENDPOINTS =====
// ============================================================================

// ===== ENROLLMENTS =====

// Get enrollments for user's accessible trials
app.get('/api/enrollments', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get user's accessible trial IDs
    const { data: accessibleTrials, error: trialsError } = await supabase
      .rpc('get_user_accessible_trials', { user_id: userId });

    if (trialsError) {
      console.error('Accessible trials error:', trialsError);
      return res.status(500).json({
        success: false,
        message: 'Failed to get accessible trials'
      });
    }

    const trialIds = accessibleTrials.map(t => t.id);

    if (trialIds.length === 0) {
      return res.json({
        success: true,
        enrollments: []
      });
    }

    const { data, error } = await supabase
      .from('enrollments')
      .select(`
        id,
        participant_name,
        enrollment_date,
        notes,
        storage_path,
        created_at,
        updated_at,
        clinical_trials (
          id,
          name
        ),
        profiles (
          id,
          display_name
        )
      `)
      .in('clinical_trial_id', trialIds)
      .order('enrollment_date', { ascending: false });

    if (error) {
      console.error('Enrollments query error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch enrollments'
      });
    }

    res.json({
      success: true,
      enrollments: data || []
    });
  } catch (err) {
    console.error('Enrollments fetch error:', err);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred'
    });
  }
});

// Create enrollment
app.post('/api/enrollments', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { clinicalTrialId, participantName, enrollmentDate, notes, storagePath } = req.body;

    if (!clinicalTrialId || !participantName || !enrollmentDate) {
      return res.status(400).json({
        success: false,
        message: 'Clinical trial ID, participant name, and enrollment date are required'
      });
    }

    // Get user's organization
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', userId)
      .single();

    if (profileError) {
      return res.status(400).json({
        success: false,
        message: 'Failed to get user profile'
      });
    }

    // Check if user has access to this trial
    const { data: accessibleTrials, error: trialsError } = await supabase
      .rpc('get_user_accessible_trials', { user_id: userId });

    if (trialsError || !accessibleTrials.some(t => t.id === clinicalTrialId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have access to this clinical trial'
      });
    }

    const insertData = {
      organization_id: userProfile.organization_id,
      clinical_trial_id: clinicalTrialId,
      participant_name: participantName,
      enrollment_date: enrollmentDate,
      notes,
      storage_path: storagePath,
      created_by: userId
    };

    const { data, error } = await supabase
      .from('enrollments')
      .insert([insertData])
      .select(`
        id,
        participant_name,
        enrollment_date,
        notes,
        storage_path,
        created_at,
        clinical_trials (
          id,
          name
        )
      `)
      .single();

    if (error) {
      console.error('Enrollment creation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create enrollment'
      });
    }

    res.json({
      success: true,
      message: 'Enrollment created successfully',
      enrollment: data
    });
  } catch (err) {
    console.error('Enrollment creation error:', err);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred'
    });
  }
});

// ===== NEWS UPDATES =====

// Get news updates for user's accessible trials
app.get('/api/news-updates', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get user's accessible trial IDs
    const { data: accessibleTrials, error: trialsError } = await supabase
      .rpc('get_user_accessible_trials', { user_id: userId });

    if (trialsError) {
      console.error('Accessible trials error:', trialsError);
      return res.status(500).json({
        success: false,
        message: 'Failed to get accessible trials'
      });
    }

    const trialIds = accessibleTrials.map(t => t.id);

    if (trialIds.length === 0) {
      return res.json({
        success: true,
        news_updates: []
      });
    }

    const { data, error } = await supabase
      .from('news_updates')
      .select(`
        id,
        title,
        body,
        published_at,
        storage_path,
        created_at,
        clinical_trials (
          id,
          name
        ),
        profiles (
          id,
          display_name
        )
      `)
      .in('clinical_trial_id', trialIds)
      .order('published_at', { ascending: false });

    if (error) {
      console.error('News updates query error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch news updates'
      });
    }

    res.json({
      success: true,
      news_updates: data || []
    });
  } catch (err) {
    console.error('News updates fetch error:', err);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred'
    });
  }
});

// Create news update
app.post('/api/news-updates', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { clinicalTrialId, title, body, storagePath } = req.body;

    if (!clinicalTrialId || !title || !body) {
      return res.status(400).json({
        success: false,
        message: 'Clinical trial ID, title, and body are required'
      });
    }

    // Get user's organization
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', userId)
      .single();

    if (profileError) {
      return res.status(400).json({
        success: false,
        message: 'Failed to get user profile'
      });
    }

    // Check if user has access to this trial
    const { data: accessibleTrials, error: trialsError } = await supabase
      .rpc('get_user_accessible_trials', { user_id: userId });

    if (trialsError || !accessibleTrials.some(t => t.id === clinicalTrialId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have access to this clinical trial'
      });
    }

    const insertData = {
      organization_id: userProfile.organization_id,
      clinical_trial_id: clinicalTrialId,
      title,
      body,
      storage_path: storagePath,
      created_by: userId,
      published_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('news_updates')
      .insert([insertData])
      .select(`
        id,
        title,
        body,
        published_at,
        storage_path,
        created_at,
        clinical_trials (
          id,
          name
        )
      `)
      .single();

    if (error) {
      console.error('News update creation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create news update'
      });
    }

    res.json({
      success: true,
      message: 'News update created successfully',
      news_update: data
    });
  } catch (err) {
    console.error('News update creation error:', err);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred'
    });
  }
});

// ===== TRAINING MATERIALS =====

// Get training materials for user's accessible trials
app.get('/api/training-materials', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get user's accessible trial IDs
    const { data: accessibleTrials, error: trialsError } = await supabase
      .rpc('get_user_accessible_trials', { user_id: userId });

    if (trialsError) {
      console.error('Accessible trials error:', trialsError);
      return res.status(500).json({
        success: false,
        message: 'Failed to get accessible trials'
      });
    }

    const trialIds = accessibleTrials.map(t => t.id);

    if (trialIds.length === 0) {
      return res.json({
        success: true,
        training_materials: []
      });
    }

    const { data, error } = await supabase
      .from('training_materials')
      .select(`
        id,
        title,
        description,
        storage_path,
        created_at,
        clinical_trials (
          id,
          name
        ),
        profiles (
          id,
          display_name
        )
      `)
      .in('clinical_trial_id', trialIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Training materials query error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch training materials'
      });
    }

    res.json({
      success: true,
      training_materials: data || []
    });
  } catch (err) {
    console.error('Training materials fetch error:', err);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred'
    });
  }
});

// ===== STUDY PROTOCOLS =====

// Get study protocols for user's accessible trials
app.get('/api/study-protocols', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get user's accessible trial IDs
    const { data: accessibleTrials, error: trialsError } = await supabase
      .rpc('get_user_accessible_trials', { user_id: userId });

    if (trialsError) {
      console.error('Accessible trials error:', trialsError);
      return res.status(500).json({
        success: false,
        message: 'Failed to get accessible trials'
      });
    }

    const trialIds = accessibleTrials.map(t => t.id);

    if (trialIds.length === 0) {
      return res.json({
        success: true,
        study_protocols: []
      });
    }

    const { data, error } = await supabase
      .from('study_protocols')
      .select(`
        id,
        title,
        version,
        storage_path,
        created_at,
        clinical_trials (
          id,
          name
        ),
        profiles (
          id,
          display_name
        )
      `)
      .in('clinical_trial_id', trialIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Study protocols query error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch study protocols'
      });
    }

    res.json({
      success: true,
      study_protocols: data || []
    });
  } catch (err) {
    console.error('Study protocols fetch error:', err);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred'
    });
  }
});

// ===== DASHBOARD ENDPOINTS =====

// Get dashboard statistics for authenticated user
app.get('/api/dashboard', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get user's organization and role
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', userId)
      .single();

    if (profileError) {
      return res.status(400).json({
        success: false,
        message: 'Failed to get user profile'
      });
    }

    // Use the helper function to get organization stats
    const { data: stats, error: statsError } = await supabase
      .rpc('get_organization_stats', { org_id: userProfile.organization_id });

    if (statsError) {
      console.error('Stats error:', statsError);
      return res.status(500).json({
        success: false,
        message: 'Failed to get dashboard statistics'
      });
    }

    // Get user's accessible clinical trials count
    const { data: accessibleTrials, error: trialsError } = await supabase
      .rpc('get_user_accessible_trials', { user_id: userId });

    const trialsCount = accessibleTrials ? accessibleTrials.length : 0;

    res.json({
      success: true,
      stats: {
        ...stats,
        accessibleTrials: trialsCount,
        userRole: userProfile.role
      }
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred'
    });
  }
});

// ===== NEWS & UPDATES =====

// Get all news items
app.get('/api/news', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('news')
      .select('*')
      .eq('is_active', true)
      .order('created_date', { ascending: false });

    if (error) {
      console.error('Supabase query error:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Database error'
      });
    }

    // Transform data to match frontend expectations
    const transformedNews = (data || []).map(item => ({
      id: item.id,
      title: item.news_title,
      content: item.news_content,
      created_by: item.created_by,
      created_by_name: item.created_by_name,
      date: item.created_date,
      is_active: item.is_active,
      created_at: item.created_at
    }));

    if (process.env.NODE_ENV !== 'production') {
      console.log(`📊 Returning ${transformedNews.length} news items`);
    }

    res.json({
      success: true,
      newsItems: transformedNews
    });
  } catch (err) {
    console.error('News fetch error:', err.message);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred'
    });
  }
});

// Create news item
app.post('/api/news', async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required'
      });
    }

    const insertData = {
      news_title: title,
      news_content: content,
      created_by: null,
      created_by_name: 'User'
    };

    const { data, error } = await supabase
      .from('news')
      .insert([insertData])
      .select('*')
      .single();

    if (error) {
      console.error('Supabase insert error:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to create news item'
      });
    }

    // Transform data to match frontend expectations
    const transformedNewsItem = {
      id: data.id,
      title: data.news_title,
      content: data.news_content,
      created_by: data.created_by,
      created_by_name: data.created_by_name,
      date: data.created_date,
      is_active: data.is_active,
      created_at: data.created_at
    };

    if (process.env.NODE_ENV !== 'production') {
      console.log(`✅ Created news item: ${data.id}`);
    }

    res.json({
      success: true,
      message: 'News item created successfully',
      newsItem: transformedNewsItem
    });
  } catch (err) {
    console.error('News creation error:', err.message);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred'
    });
  }
});

// Update news item
app.put('/api/news/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;

    const { data, error } = await supabase
      .from('news')
      .update({
        news_title: title,
        news_content: content,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase update error:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to update news item'
      });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`✅ Updated news item: ${id}`);
    }

    res.json({
      success: true,
      message: 'News item updated successfully',
      newsItem: data
    });
  } catch (err) {
    console.error('News update error:', err.message);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred'
    });
  }
});

// Delete news item
app.delete('/api/news/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('news')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase delete error:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete news item'
      });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`✅ Deleted news item: ${id}`);
    }

    res.json({
      success: true,
      message: 'News item deleted successfully'
    });
  } catch (err) {
    console.error('News deletion error:', err.message);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred'
    });
  }
});

// ===== HOSPITALS/LEADERBOARD =====

// Get all hospitals (temporarily unauthenticated for testing Supabase connection)
app.get('/api/hospitals', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('hospitals')
      .select('*')
      .order('randomized_patients', { ascending: false });

    // Transform the data to match frontend expectations
    // Handle different column names that might exist in Supabase
    let transformedHospitals = [];
    if (data && data.length > 0) {
      console.log('Supabase returned data:', data.length, 'hospitals');
      transformedHospitals = data.map(hospital => ({
        id: hospital.id,
        name: hospital.hospital_name || hospital.name || hospital.hospitalName,
        location: hospital.location,
        principal_investigator: hospital.principal_investigator || hospital.principalInvestigator,
        consented_patients: hospital.consented_patients || hospital.consentedPatients,
        randomized_patients: hospital.randomized_patients || hospital.randomizedPatients,
        consent_rate: hospital.consented_rate || hospital.consentRate,
        created_at: hospital.created_at
      }));
    } else {
      console.log('No data from Supabase, using mock data for testing');
      transformedHospitals = [
        {
          id: '1',
          name: 'City General Hospital',
          location: 'New York, NY',
          principal_investigator: 'Dr. Michael Johnson',
          consented_patients: 150,
          randomized_patients: 120,
          consent_rate: 80.00,
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          name: 'Metro Medical Center',
          location: 'Los Angeles, CA',
          principal_investigator: 'Dr. Sarah Williams',
          consented_patients: 200,
          randomized_patients: 180,
          consent_rate: 90.00,
          created_at: new Date().toISOString()
        },
        {
          id: '3',
          name: 'Regional Health System',
          location: 'Chicago, IL',
          principal_investigator: 'Dr. Robert Brown',
          consented_patients: 125,
          randomized_patients: 100,
          consent_rate: 80.00,
          created_at: new Date().toISOString()
        }
      ];
    }

    // Calculate summary statistics
    const summary = {
      totalConsented: transformedHospitals.reduce((sum, hospital) => sum + (hospital.consented_patients || 0), 0),
      totalRandomized: transformedHospitals.reduce((sum, hospital) => sum + (hospital.randomized_patients || 0), 0),
      totalHospitals: transformedHospitals.length
    };

    console.log('Summary statistics:', summary);

    res.json({
      success: true,
      hospitals: transformedHospitals,
      summary: summary
    });
  } catch (err) {
    console.error('Hospitals fetch error:', err);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred'
    });
  }
});

// Get single hospital
app.get('/api/hospitals/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('hospitals')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found',
        error: error.message
      });
    }

    res.json({
      success: true,
      hospital: data
    });
  } catch (err) {
    console.error('Hospital fetch error:', err);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred'
    });
  }
});

// Create hospital (temporarily unauthenticated for testing)
app.post('/api/hospitals', async (req, res) => {
  try {
    const { name, location, principalInvestigator, consentedPatients, randomizedPatients, consentRate } = req.body;

    if (!name || !location || !principalInvestigator) {
      return res.status(400).json({
        success: false,
        message: 'Name, location, and principal investigator are required'
      });
    }

    // Try to insert into Supabase, but fallback to mock response if it fails
    let transformedHospital;
    try {
      // Use the correct column names that match the Supabase table
      const insertData = {
        hospital_name: name,
        location: location,
        principal_investigator: principalInvestigator,
        consented_patients: consentedPatients || 0,
        randomized_patients: randomizedPatients || 0,
        consented_rate: consentRate || 0,
        created_by: null // Temporarily null for testing
      };

      const { data, error } = await supabase
        .from('hospitals')
        .insert([insertData])
        .select('*')
        .single();

      if (!error && data) {
        console.log('Successfully inserted into Supabase:', data.id);
        // Transform the data to match frontend expectations
        transformedHospital = {
          id: data.id,
          name: data.hospital_name || data.name || data.hospitalName,
          location: data.location,
          principal_investigator: data.principal_investigator || data.principalInvestigator,
          consented_patients: data.consented_patients || data.consentedPatients,
          randomized_patients: data.randomized_patients || data.randomizedPatients,
          consent_rate: data.consented_rate || data.consentRate,
          created_at: data.created_at
        };
      } else {
        throw new Error(error?.message || 'Supabase insert failed');
      }
    } catch (supabaseError) {
      console.log('Supabase insert failed, using mock response:', supabaseError.message);
      // Fallback: Return mock created hospital for testing
      transformedHospital = {
        id: Date.now().toString(),
        name: name,
        location: location,
        principal_investigator: principalInvestigator,
        consented_patients: consentedPatients || 0,
        randomized_patients: randomizedPatients || 0,
        consent_rate: consentRate || 0,
        created_at: new Date().toISOString()
      };
    }

    res.json({
      success: true,
      message: 'Hospital created successfully',
      hospital: transformedHospital
    });
  } catch (err) {
    console.error('Hospital creation error:', err);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred'
    });
  }
});

// Update hospital (temporarily unauthenticated for testing)
app.put('/api/hospitals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location, principalInvestigator, consentedPatients, randomizedPatients, consentRate } = req.body;

    // Try to update in Supabase, but fallback to mock response if it fails
    let transformedHospital;
    try {
      const { data, error } = await supabase
        .from('hospitals')
        .update({
          hospital_name: name,
          location: location,
          principal_investigator: principalInvestigator,
          consented_patients: consentedPatients,
          randomized_patients: randomizedPatients,
          consented_rate: consentRate,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select('id, hospital_name, location, principal_investigator, consented_patients, randomized_patients, consented_rate, created_at')
        .single();

      if (!error && data) {
        console.log('Successfully updated hospital in Supabase:', data.id);
        // Transform the data to match frontend expectations
        transformedHospital = {
          id: data.id,
          name: data.hospital_name,
          location: data.location,
          principal_investigator: data.principal_investigator,
          consented_patients: data.consented_patients,
          randomized_patients: data.randomized_patients,
          consent_rate: data.consented_rate,
          created_at: data.created_at
        };
      } else {
        throw new Error(error?.message || 'Supabase update failed');
      }
    } catch (supabaseError) {
      console.log('Supabase update failed, using mock response:', supabaseError.message);
      // Fallback: Return mock updated hospital for testing
      transformedHospital = {
        id: id,
        name: name,
        location: location,
        principal_investigator: principalInvestigator,
        consented_patients: consentedPatients || 0,
        randomized_patients: randomizedPatients || 0,
        consent_rate: consentRate || 0,
        created_at: new Date().toISOString()
      };
    }

    res.json({
      success: true,
      message: 'Hospital updated successfully',
      hospital: transformedHospital
    });
  } catch (err) {
    console.error('Hospital update error:', err);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred'
    });
  }
});

// Delete hospital
app.delete('/api/hospitals/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('hospitals')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Failed to delete hospital',
        error: error.message
      });
    }

    res.json({
      success: true,
      message: 'Hospital deleted successfully'
    });
  } catch (err) {
    console.error('Hospital deletion error:', err);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred'
    });
  }
});

// ===== TRAINING MATERIALS =====

// Get all training materials (temporary unauthenticated access for testing)
app.get('/api/training-materials', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('training_materials')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch training materials'
      });
    }

    // Format the data for frontend
    const trainingMaterials = data.map(material => ({
      id: material.id,
      title: material.title,
      description: material.description,
      type: material.type,
      content: material.content,
      category: material.category,
      created_by: material.created_by,
      created_by_name: material.created_by_name || 'Unknown',
      upload_date: material.created_at,
      is_active: material.is_active,
      created_at: material.created_at
    }));

    console.log(`📊 Returning ${trainingMaterials.length} training materials to frontend`);
    res.json({
      success: true,
      trainingMaterials: trainingMaterials
    });
  } catch (err) {
    console.error('Training materials fetch error:', err);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred'
    });
  }
});

// Create training material (temporary unauthenticated access for testing)
app.post('/api/training-materials', async (req, res) => {
  try {
    const { title, description, type, content, category } = req.body;

    if (!title || !type) {
      return res.status(400).json({
        success: false,
        message: 'Title and type are required'
      });
    }

    // Mock created training material
    const newTrainingMaterial = {
      id: Date.now().toString(),
      title,
      description,
      type,
      content,
      category,
      created_by: 'test-user',
      created_by_name: 'Test User',
      upload_date: new Date().toISOString(),
      is_active: true,
      created_at: new Date().toISOString()
    };

    res.json({
      success: true,
      message: 'Training material created successfully',
      trainingMaterial: newTrainingMaterial
    });
  } catch (err) {
    console.error('Training material creation error:', err);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred'
    });
  }
});

// Update training material
app.put('/api/training-materials/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, type, content, category } = req.body;

    if (!title || !type) {
      return res.status(400).json({
        success: false,
        message: 'Title and type are required'
      });
    }

    const { data, error } = await supabase
      .from('training_materials')
      .update({
        title,
        description,
        type,
        content,
        category,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update training material'
      });
    }

    console.log('✅ Training material updated successfully:', data.id);
    res.json({
      success: true,
      message: 'Training material updated successfully',
      trainingMaterial: data
    });
  } catch (err) {
    console.error('Training material update error:', err);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred'
    });
  }
});

// Delete training material
app.delete('/api/training-materials/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('training_materials')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Failed to delete training material',
        error: error.message
      });
    }

    res.json({
      success: true,
      message: 'Training material deleted successfully'
    });
  } catch (err) {
    console.error('Training material deletion error:', err);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred'
    });
  }
});

// ===== STUDY PROTOCOLS =====

// Get all study protocols (temporary unauthenticated access for testing)
app.get('/api/study-protocols', async (req, res) => {
  try {
    // Mock data for testing
    const mockStudyProtocols = [
      {
        id: '1',
        title: 'Phase III Clinical Trial Protocol v2.1',
        description: 'Complete protocol for the Phase III clinical trial including inclusion/exclusion criteria',
        type: 'pdf',
        content: 'https://example.com/phase3-protocol.pdf',
        version: '2.1',
        created_by: 'admin',
        created_by_name: 'Admin',
        upload_date: new Date().toISOString(),
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: '2',
        title: 'Patient Recruitment Guidelines',
        description: 'Guidelines for patient recruitment and enrollment procedures',
        type: 'text',
        content: 'Detailed patient recruitment guidelines content...',
        version: '1.0',
        created_by: 'admin',
        created_by_name: 'Admin',
        upload_date: new Date().toISOString(),
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: '3',
        title: 'Data Collection Standards',
        description: 'Standards and procedures for data collection and management',
        type: 'pdf',
        content: 'https://example.com/data-standards.pdf',
        version: '3.0',
        created_by: 'admin',
        created_by_name: 'Admin',
        upload_date: new Date().toISOString(),
        is_active: true,
        created_at: new Date().toISOString()
      }
    ];

    res.json({
      success: true,
      studyProtocols: mockStudyProtocols
    });
  } catch (err) {
    console.error('Study protocols fetch error:', err);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred'
    });
  }
});

// Create study protocol (temporary unauthenticated access for testing)
app.post('/api/study-protocols', async (req, res) => {
  try {
    const { title, description, type, content, version } = req.body;

    if (!title || !type) {
      return res.status(400).json({
        success: false,
        message: 'Title and type are required'
      });
    }

    // Mock created study protocol
    const newStudyProtocol = {
      id: Date.now().toString(),
      title,
      description,
      type,
      content,
      version: version || '1.0',
      created_by: 'test-user',
      created_by_name: 'Test User',
      upload_date: new Date().toISOString(),
      is_active: true,
      created_at: new Date().toISOString()
    };

    res.json({
      success: true,
      message: 'Study protocol created successfully',
      studyProtocol: newStudyProtocol
    });
  } catch (err) {
    console.error('Study protocol creation error:', err);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred'
    });
  }
});

// Update study protocol
app.put('/api/study-protocols/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, type, content, version } = req.body;

    if (!title || !type) {
      return res.status(400).json({
        success: false,
        message: 'Title and type are required'
      });
    }

    const { data, error } = await supabase
      .from('study_protocols')
      .update({
        title,
        description,
        type,
        content,
        version,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update study protocol'
      });
    }

    console.log('✅ Study protocol updated successfully:', data.id);
    res.json({
      success: true,
      message: 'Study protocol updated successfully',
      studyProtocol: data
    });
  } catch (err) {
    console.error('Study protocol update error:', err);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred'
    });
  }
});

// Delete study protocol
app.delete('/api/study-protocols/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('study_protocols')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Failed to delete study protocol',
        error: error.message
      });
    }

    res.json({
      success: true,
      message: 'Study protocol deleted successfully'
    });
  } catch (err) {
    console.error('Study protocol deletion error:', err);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred'
    });
  }
});

// ===== PDF DOCUMENTS =====

// Get all PDF documents
app.get('/api/pdfs', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('pdf_documents')
      .select('*')
      .eq('is_active', true)
      .order('upload_date', { ascending: false });

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Failed to fetch PDF documents',
        error: error.message
      });
    }

    res.json({
      success: true,
      pdfDocuments: data
    });
  } catch (err) {
    console.error('PDF documents fetch error:', err);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred'
    });
  }
});

// Create PDF document
app.post('/api/pdfs', authenticateToken, async (req, res) => {
  try {
    const { title, description, category, fileUrl, fileName, fileSize } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Title is required'
      });
    }

    const { data, error } = await supabase
      .from('pdf_documents')
      .insert([{
        title,
        description,
        category,
        file_url: fileUrl,
        file_name: fileName,
        file_size: fileSize,
        uploaded_by: req.user.userId,
        uploaded_by_name: req.user.email
      }])
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Failed to create PDF document',
        error: error.message
      });
    }

    res.json({
      success: true,
      message: 'PDF document created successfully',
      pdfDocument: data
    });
  } catch (err) {
    console.error('PDF document creation error:', err);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred'
    });
  }
});

// Delete PDF document
app.delete('/api/pdfs/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('pdf_documents')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Failed to delete PDF document',
        error: error.message
      });
    }

    res.json({
      success: true,
      message: 'PDF document deleted successfully'
    });
  } catch (err) {
    console.error('PDF document deletion error:', err);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred'
    });
  }
});

// ===== ANALYTICS =====

// Get analytics data (temporary unauthenticated access for testing)
app.get('/api/analytics', async (req, res) => {
  try {
    // Mock data for testing
    const mockAnalytics = [
      {
        id: '1',
        user_id: 'user1',
        user_name: 'Dr. John Smith',
        user_email: 'john.smith@hospital1.com',
        site: 'City General Hospital',
        total_app_opens: 45,
        last_app_open: new Date().toISOString(),
        tab_views: { '0': 15, '1': 8, '2': 12, '3': 5, '4': 3, '5': 2 },
        most_viewed_tab: '0',
        created_at: new Date().toISOString()
      },
      {
        id: '2',
        user_id: 'user2',
        user_name: 'Dr. Sarah Williams',
        user_email: 'sarah.williams@hospital2.com',
        site: 'Metro Medical Center',
        total_app_opens: 32,
        last_app_open: new Date().toISOString(),
        tab_views: { '0': 10, '1': 12, '2': 8, '3': 2 },
        most_viewed_tab: '1',
        created_at: new Date().toISOString()
      },
      {
        id: '3',
        user_id: 'user3',
        user_name: 'Dr. Robert Brown',
        user_email: 'robert.brown@hospital3.com',
        site: 'Regional Health System',
        total_app_opens: 28,
        last_app_open: new Date().toISOString(),
        tab_views: { '0': 8, '2': 15, '3': 5 },
        most_viewed_tab: '2',
        created_at: new Date().toISOString()
      }
    ];

    res.json({
      success: true,
      analytics: mockAnalytics
    });
  } catch (err) {
    console.error('Analytics fetch error:', err);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred'
    });
  }
});

// Update user analytics
app.post('/api/analytics/track', authenticateToken, async (req, res) => {
  try {
    const { tabViewed } = req.body;

    // Get or create user analytics record
    let { data: existingAnalytics, error: fetchError } = await supabase
      .from('user_analytics')
      .select('*')
      .eq('user_id', req.user.userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
      return res.status(400).json({
        success: false,
        message: 'Failed to fetch user analytics',
        error: fetchError.message
      });
    }

    const now = new Date().toISOString();
    let analyticsData;

    if (existingAnalytics) {
      // Update existing analytics
      const tabViews = existingAnalytics.tab_views || {};
      tabViews[tabViewed] = (tabViews[tabViewed] || 0) + 1;

      const { data, error } = await supabase
        .from('user_analytics')
        .update({
          total_app_opens: existingAnalytics.total_app_opens + 1,
          last_app_open: now,
          tab_views: tabViews,
          most_viewed_tab: Object.keys(tabViews).reduce((a, b) => tabViews[a] > tabViews[b] ? a : b),
          updated_at: now
        })
        .eq('user_id', req.user.userId)
        .select()
        .single();

      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Failed to update analytics',
          error: error.message
        });
      }
      analyticsData = data;
    } else {
      // Create new analytics record
      const tabViews = {};
      if (tabViewed) tabViews[tabViewed] = 1;

      const { data, error } = await supabase
        .from('user_analytics')
        .insert([{
          user_id: req.user.userId,
          user_name: req.user.name || req.user.email,
          user_email: req.user.email,
          site: 'Unknown', // You might want to get this from user profile
          total_app_opens: 1,
          last_app_open: now,
          tab_views: tabViews,
          most_viewed_tab: tabViewed || null
        }])
        .select()
        .single();

      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Failed to create analytics',
          error: error.message
        });
      }
      analyticsData = data;
    }

    res.json({
      success: true,
      message: 'Analytics updated successfully',
      analytics: analyticsData
    });
  } catch (err) {
    console.error('Analytics tracking error:', err);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred'
    });
  }
});

// ===== SETTINGS =====

// Get all settings (temporary unauthenticated access for testing)
app.get('/api/settings', async (req, res) => {
  try {
    // Mock data for testing
    const settings = {
      company_name: {
        value: 'KachinaHealth',
        type: 'string',
        description: 'Company name displayed in dashboard'
      },
      company_logo_url: {
        value: '/logos/logo.png',
        type: 'string',
        description: 'URL to company logo'
      },
      default_user_role: {
        value: 'user',
        type: 'string',
        description: 'Default role for new users'
      },
      enable_analytics: {
        value: 'true',
        type: 'boolean',
        description: 'Enable user analytics tracking'
      },
      maintenance_mode: {
        value: 'false',
        type: 'boolean',
        description: 'Enable maintenance mode'
      },
      max_upload_size: {
        value: '10',
        type: 'number',
        description: 'Maximum file upload size in MB'
      }
    };

    res.json({
      success: true,
      settings
    });
  } catch (err) {
    console.error('Settings fetch error:', err);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred'
    });
  }
});

// Update setting
app.put('/api/settings/:key', authenticateToken, async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    const { data, error } = await supabase
      .from('app_settings')
      .update({
        setting_value: value,
        updated_by: req.user.userId,
        updated_at: new Date().toISOString()
      })
      .eq('setting_key', key)
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Failed to update setting',
        error: error.message
      });
    }

    res.json({
      success: true,
      message: 'Setting updated successfully',
      setting: data
    });
  } catch (err) {
    console.error('Setting update error:', err);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred'
    });
  }
});

// ===== DASHBOARD STATS =====

// Get dashboard statistics
app.get('/api/dashboard', authenticateToken, async (req, res) => {
  try {
    // Get counts from all tables
    const [
      { count: totalUsers },
      { count: pendingApprovals },
      { count: activeUsers },
      { count: newsItems }
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('user_analytics').select('*', { count: 'exact', head: true }),
      supabase.from('news').select('*', { count: 'exact', head: true }).eq('is_active', true)
    ]);

    res.json({
      success: true,
      totalUsers: totalUsers || 0,
      pendingApprovals: pendingApprovals || 0,
      activeUsers: activeUsers || 0,
      newsItems: newsItems || 0
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred'
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Client Portal Backend running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Login endpoint: http://localhost:${PORT}/api/auth/login`);
  console.log(`👥 Clients endpoint: http://localhost:${PORT}/api/clients`);
});

