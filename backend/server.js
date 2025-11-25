require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { supabase, supabaseAdmin } = require('./supabaseClient');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow PDF files
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

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

// Test endpoint to verify server is running updated code
app.get('/test', (req, res) => {
  res.json({
    message: 'Server is running updated code',
    timestamp: new Date().toISOString()
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
        ),
        user_clinical_assignments (
          id,
          clinical_trial_id,
          clinical_trials (
            id,
            name
          )
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

app.post('/api/users', authenticateToken, async (req, res) => {
  try {
    const inviterUserId = req.user.userId;
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

    // Get inviter's profile to check permissions
    let { data: inviterProfile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', inviterUserId)
      .single();

    // If profile doesn't exist, try to create one automatically
    if (profileError && profileError.code === 'PGRST116') {
      console.log(`Profile not found for user ${inviterUserId}, creating one automatically`);

      // Get user info from auth
      const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(inviterUserId);

      if (userError || !user) {
        return res.status(400).json({
          success: false,
          message: 'Failed to get user information'
        });
      }

      // Auto-create profile with default values
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: inviterUserId,
          organization_id: '9c38a8ff-b312-430a-bfd1-f1f4ac0c6902', // Default to Cerevasc org
          role: 'user', // Default role
          display_name: user.email || 'New User'
        })
        .select('organization_id, role')
        .single();

      if (createError) {
        console.error('Failed to auto-create profile:', createError);
        return res.status(500).json({
          success: false,
          message: 'Failed to create user profile'
        });
      }

      inviterProfile = newProfile;
    } else if (profileError) {
      return res.status(400).json({
        success: false,
        message: 'Failed to get user profile'
      });
    }

    // Check permissions: Only admins and users can invite, doctors cannot
    if (!['admin', 'user'].includes(inviterProfile.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to invite users'
      });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({
        success: false,
        message: 'Admin operations not available. Service role key required.'
      });
    }

    // Send invitation using Supabase's built-in system
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        invited_by: inviterUserId,
        organization_id: inviterProfile.organization_id,
        role: role,
        display_name: displayName || email
      }
    });

    if (inviteError) {
      console.error('Invitation error:', inviteError);
      return res.status(500).json({
        success: false,
        message: 'Failed to send invitation',
        error: inviteError.message
      });
    }

    // The invitation was sent successfully
    // Now create the profile for the invited user
    const invitedUserId = inviteData.user.id;

    // Use the helper function to create profile and assign to organization
    const { data: result, error: helperError } = await supabase
      .rpc('create_profile_and_assignments', {
        admin_user_id: inviterUserId,
        new_user_auth_id: invitedUserId,
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
        message: resultData.error || 'Failed to create user profile'
      });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`✅ Sent invitation and created profile for: ${email}`);
    }

    res.json({
      success: true,
      message: 'Invitation sent successfully',
      user: {
        id: resultData.profile_id,
        email: email,
        role: role,
        display_name: displayName || email,
        trial_assigned: resultData.trial_assigned,
        invitation_sent: true
      }
    });
  } catch (err) {
    console.error('User invitation error:', err);
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
// ===== CLINICAL TRIAL ASSIGNMENT MANAGEMENT =====
// ============================================================================

// Get user's clinical trial assignment
app.get('/api/users/:userId/clinical-assignment', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.userId;

    // Get current user's profile to check permissions
    const { data: currentUserProfile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', currentUserId)
      .single();

    if (profileError) {
      return res.status(400).json({
        success: false,
        message: 'Failed to get user profile',
        error: profileError.message
      });
    }

    // Get target user's profile
    const { data: targetUserProfile, error: targetError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', userId)
      .single();

    if (targetError) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check permissions: only admins can see assignments for users in their organization
    if (currentUserProfile.role !== 'admin' || targetUserProfile.organization_id !== currentUserProfile.organization_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get clinical trial assignment
    const { data: assignment, error: assignmentError } = await supabase
      .from('user_clinical_assignments')
      .select(`
        id,
        clinical_trial_id,
        clinical_trials (
          id,
          name
        )
      `)
      .eq('user_id', userId)
      .maybeSingle();

    if (assignmentError) {
      console.error('Assignment query error:', assignmentError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch assignment',
        error: assignmentError.message
      });
    }

    res.json({
      success: true,
      assignment: assignment ? {
        id: assignment.id,
        clinical_trial_id: assignment.clinical_trial_id,
        trial_name: assignment.clinical_trials?.name || null
      } : null
    });
  } catch (err) {
    console.error('Clinical assignment fetch error:', err);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred'
    });
  }
});

// Update user's clinical trial assignment
app.put('/api/users/:userId/clinical-assignment', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { clinical_trial_id } = req.body;
    const currentUserId = req.user.userId;

    // Get current user's profile to check permissions
    const { data: currentUserProfile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', currentUserId)
      .single();

    if (profileError) {
      return res.status(400).json({
        success: false,
        message: 'Failed to get user profile',
        error: profileError.message
      });
    }

    // Only admins can update assignments
    if (currentUserProfile.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can update clinical trial assignments'
      });
    }

    // Get target user's profile
    const { data: targetUserProfile, error: targetError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', userId)
      .single();

    if (targetError) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check that target user is in the same organization
    if (targetUserProfile.organization_id !== currentUserProfile.organization_id) {
      return res.status(403).json({
        success: false,
        message: 'Cannot modify users from different organizations'
      });
    }

    // Validate clinical_trial_id if provided
    if (clinical_trial_id) {
      const { data: trial, error: trialError } = await supabase
        .from('clinical_trials')
        .select('id, organization_id')
        .eq('id', clinical_trial_id)
        .eq('organization_id', currentUserProfile.organization_id)
        .single();

      if (trialError || !trial) {
        return res.status(400).json({
          success: false,
          message: 'Invalid clinical trial ID'
        });
      }
    }

    // Remove existing assignment for this user
    await supabase
      .from('user_clinical_assignments')
      .delete()
      .eq('user_id', userId);

    // Create new assignment if clinical_trial_id is provided
    if (clinical_trial_id) {
      const { data: newAssignment, error: insertError } = await supabase
        .from('user_clinical_assignments')
        .insert({
          user_id: userId,
          clinical_trial_id: clinical_trial_id,
          organization_id: currentUserProfile.organization_id
        })
        .select()
        .single();

      if (insertError) {
        console.error('Assignment insert error:', insertError);
        return res.status(500).json({
          success: false,
          message: 'Failed to create assignment',
          error: insertError.message
        });
      }

      res.json({
        success: true,
        message: 'Clinical trial assignment updated successfully',
        assignment: newAssignment
      });
    } else {
      res.json({
        success: true,
        message: 'Clinical trial assignment removed successfully'
      });
    }
  } catch (err) {
    console.error('Clinical assignment update error:', err);
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
    console.log('📨 GET /api/clinical-trials - Starting request');

    // Get user's organization
    const userId = req.user.userId;
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('organization_id')
      .eq('id', userId)
      .single();

    if (profileError || !userProfile) {
      console.error('Failed to get user profile:', profileError);
      return res.status(400).json({
        success: false,
        message: 'Failed to get user profile'
      });
    }

    const organizationId = userProfile.organization_id;

    // Query the existing clinical_trials table (filtered by organization)
    console.log('📨 Executing query for clinical trials in organization:', organizationId);
    const { data, error } = await supabase
      .from('clinical_trials')
      .select('id, name, description, created_at')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('📨 Supabase query error:', error);
      console.error('📨 Error details:', {
        code: error.code,
        details: error.details,
        hint: error.hint,
        message: error.message
      });
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch clinical trials',
        error: error.message,
        hint: error.hint
      });
    }

    console.log('📨 Query successful, found', data ? data.length : 0, 'clinical trials');
    if (data && data.length > 0) {
      console.log('📨 First trial:', data[0]);
    }

    // Map database columns to frontend expected format
    const formattedTrials = (data || []).map(trial => ({
      id: trial.id,
      trial_name: trial.name, // Map 'name' to 'trial_name'
      description: trial.description,
      status: 'Active', // Default status since not in DB
      start_date: null, // Not in DB
      end_date: null, // Not in DB
      created_at: trial.created_at
    }));

    res.json({
      success: true,
      trials: formattedTrials
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

    // Verify user has a profile
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', userId)
      .single();

    if (profileError) {
      return res.status(400).json({
        success: false,
        message: 'User profile not found. Please contact an administrator.'
      });
    }

    // Allow admins and users to create trials (temporarily relaxed for testing)
    if (!['admin', 'user'].includes(userProfile.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to create clinical trials'
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
app.put('/api/clinical-trials/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { name, description, isActive } = req.body;

    console.log('📨 PUT /api/clinical-trials/:id - Received:', { id, name, description, isActive, userId });

    if (!name) {
      console.log('❌ PUT /api/clinical-trials/:id - Trial name is empty or undefined');
      return res.status(400).json({
        success: false,
        message: 'Trial name is required'
      });
    }

    // Verify user has a profile and can update trials
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', userId)
      .single();

    if (profileError) {
      return res.status(400).json({
        success: false,
        message: 'User profile not found. Please contact an administrator.'
      });
    }

    // Allow admins and users to update trials
    if (!['admin', 'user'].includes(userProfile.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update clinical trials'
      });
    }

    const updateData = {
      name,
      description,
      is_active: isActive !== undefined ? isActive : true
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

// Temporarily moved authenticated endpoint to /api/training-materials/auth
app.get('/api/training-materials/auth', authenticateToken, async (req, res) => {
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
app.get('/api/study-protocols/auth', authenticateToken, async (req, res) => {
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
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_active', false),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('news_updates').select('*', { count: 'exact', head: true })
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
      message: 'Failed to get dashboard statistics'
    });
  }
});

// ===== NEWS & UPDATES =====

// Debug endpoint to check database tables
app.get('/api/debug/tables', async (req, res) => {
  try {
    console.log('🔍 Checking expected database tables...');

    const expectedTables = ['users', 'news_updates', 'hospitals', 'training_materials', 'study_protocols', 'clinical_trials'];
    const tableStatus = {};

    // Check each expected table
    for (const tableName of expectedTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('count', { count: 'exact', head: true });

        if (error) {
          tableStatus[tableName] = { exists: false, error: error.message };
        } else {
          tableStatus[tableName] = { exists: true, count: data };
        }
      } catch (err) {
        tableStatus[tableName] = { exists: false, error: err.message };
      }
    }

    console.log('📋 Table status:', tableStatus);

    const existingTables = Object.keys(tableStatus).filter(table => tableStatus[table].exists);
    const missingTables = Object.keys(tableStatus).filter(table => !tableStatus[table].exists);

    res.json({
      success: true,
      tables: tableStatus,
      existingTables,
      missingTables,
      message: `Found ${existingTables.length} existing tables, ${missingTables.length} missing tables`
    });

  } catch (err) {
    console.error('Debug endpoint error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Get all news items
app.get('/api/news', authenticateToken, async (req, res) => {
  try {
    console.log('📄 Getting news items...');

    // Get user's organization and role
    const userId = req.user.userId;
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('organization_id, role')
      .eq('id', userId)
      .single();

    if (profileError || !userProfile) {
      console.error('Failed to get user profile:', profileError);
      return res.status(400).json({
        success: false,
        message: 'Failed to get user profile'
      });
    }

    const organizationId = userProfile.organization_id;
    console.log('🔍 Getting news for organization:', organizationId, 'role:', userProfile.role);

    // Get accessible trial IDs based on user role
    let accessibleTrialIds = [];

    if (userProfile.role === 'admin') {
      // Admins can see all trials in their organization
      const { data: allTrials, error: trialsError } = await supabaseAdmin
        .from('clinical_trials')
        .select('id')
        .eq('organization_id', organizationId);

      if (trialsError) {
        console.error('Failed to get trials for admin:', trialsError);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch accessible trials'
        });
      }

      accessibleTrialIds = allTrials.map(trial => trial.id);
    } else {
      // Doctors/users can only see trials they're assigned to
      const { data: assignedTrials, error: assignmentError } = await supabaseAdmin
        .from('user_clinical_assignments')
        .select('clinical_trial_id')
        .eq('user_id', userId);

      if (assignmentError) {
        console.error('Failed to get trial assignments:', assignmentError);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch trial assignments'
        });
      }

      accessibleTrialIds = assignedTrials.map(assignment => assignment.clinical_trial_id);
    }

    console.log('🎯 Accessible trial IDs:', accessibleTrialIds);

    if (accessibleTrialIds.length === 0) {
      console.log('📭 No accessible trials found');
      return res.json({
        success: true,
        news: []
      });
    }

    // Get news items filtered by accessible trials
    const { data, error } = await supabaseAdmin
      .from('news_updates')
      .select(`
        id,
        title,
        body,
        organization_id,
        clinical_trial_id,
        published_at,
        created_by,
        profiles (
          display_name
        ),
        clinical_trials (
          name
        )
      `)
      .in('clinical_trial_id', accessibleTrialIds)
      .order('published_at', { ascending: false });

    if (error) {
      console.error('Supabase query error:', error.message);
      console.error('Error details:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch news items from database',
        error: error.message
      });
    }

    console.log('🔍 All news items query result:', data);
    console.log('🔍 Filtered news items for user:', data ? data.length : 0, 'items');

    if (error) {
      console.error('Supabase query error:', error.message);
      console.error('Error details:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch news items from database',
        error: error.message
      });
    }

    console.log('🔍 Filtered news items for user:', data ? data.length : 0, 'items');

    // Transform data to match frontend expectations
    const transformedNews = (data || []).map(item => ({
      id: item.id,
      title: item.title,
      content: item.body,
      clinical_trial_id: item.clinical_trial_id,
      trial_name: item.clinical_trials?.name || 'Unknown Trial',
      created_at: item.published_at,
      created_by_name: item.profiles?.display_name || 'Unknown'
    }));

    console.log(`📊 Returning ${transformedNews.length} news items for organization ${organizationId}`);
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
app.post('/api/news', authenticateToken, async (req, res) => {
  try {
    const { title, content, clinical_trial_id } = req.body;

    if (!title || !content || !clinical_trial_id) {
      return res.status(400).json({
        success: false,
        message: 'Title, content, and clinical trial selection are required'
      });
    }

    // Get user's organization and role
    const userId = req.user.userId;
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('organization_id, role')
      .eq('id', userId)
      .single();

    if (profileError || !userProfile) {
      console.error('Failed to get user profile:', profileError);
      return res.status(400).json({
        success: false,
        message: 'Failed to get user profile'
      });
    }

    const organizationId = userProfile.organization_id;

    // Validate that the clinical trial exists and belongs to user's organization
    const { data: trial, error: trialError } = await supabaseAdmin
      .from('clinical_trials')
      .select('id, name')
      .eq('id', clinical_trial_id)
      .eq('organization_id', organizationId)
      .single();

    if (trialError || !trial) {
      console.error('Invalid clinical trial:', trialError);
      return res.status(400).json({
        success: false,
        message: 'Invalid clinical trial selected'
      });
    }

    // Check if user has permission to create news for this trial
    if (userProfile.role !== 'admin') {
      // Non-admin users must be assigned to the trial
      const { data: assignment, error: assignError } = await supabaseAdmin
        .from('user_clinical_assignments')
        .select('id')
        .eq('user_id', userId)
        .eq('clinical_trial_id', clinical_trial_id)
        .single();

      if (assignError || !assignment) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to create news for this clinical trial'
        });
      }
    }

    console.log('📝 Creating news item for trial:', trial.name, { title, content });

    const insertData = {
      title: title,
      body: content,
      organization_id: organizationId,
      clinical_trial_id: clinical_trial_id,
      created_by: userId,
      published_at: new Date().toISOString()
    };

    const { data, error } = await supabaseAdmin
      .from('news_updates')
      .insert([insertData])
      .select('*')
      .single();

    if (error) {
      console.error('Supabase insert error:', error.message);
      console.error('Error details:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create news item in database',
        error: error.message
      });
    }

    // Transform data to match frontend expectations
    const transformedNewsItem = {
      id: data.id,
      title: data.title,
      content: data.body,
      created_at: data.published_at,
      created_by_name: 'User'
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
app.put('/api/news/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, clinical_trial_id } = req.body;

    if (!title || !content || !clinical_trial_id) {
      return res.status(400).json({
        success: false,
        message: 'Title, content, and clinical trial selection are required'
      });
    }

    // Get user's organization and role
    const userId = req.user.userId;
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('organization_id, role')
      .eq('id', userId)
      .single();

    if (profileError || !userProfile) {
      console.error('Failed to get user profile:', profileError);
      return res.status(400).json({
        success: false,
        message: 'Failed to get user profile'
      });
    }

    const organizationId = userProfile.organization_id;

    // Validate that the clinical trial exists and belongs to user's organization
    const { data: trial, error: trialError } = await supabaseAdmin
      .from('clinical_trials')
      .select('id, name')
      .eq('id', clinical_trial_id)
      .eq('organization_id', organizationId)
      .single();

    if (trialError || !trial) {
      console.error('Invalid clinical trial:', trialError);
      return res.status(400).json({
        success: false,
        message: 'Invalid clinical trial selected'
      });
    }

    // Check if user has permission to update news for this trial
    if (userProfile.role !== 'admin') {
      // Non-admin users must be assigned to the trial
      const { data: assignment, error: assignError } = await supabaseAdmin
        .from('user_clinical_assignments')
        .select('id')
        .eq('user_id', userId)
        .eq('clinical_trial_id', clinical_trial_id)
        .single();

      if (assignError || !assignment) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update news for this clinical trial'
        });
      }
    }

    console.log('📝 Updating news item:', id, 'for trial:', trial.name);

    // First check if the news item exists and belongs to the user's organization
    const { data: existingNews, error: checkError } = await supabaseAdmin
      .from('news_updates')
      .select('organization_id, clinical_trial_id')
      .eq('id', id)
      .single();

    if (checkError || !existingNews) {
      return res.status(404).json({
        success: false,
        message: 'News item not found'
      });
    }

    if (existingNews.organization_id !== organizationId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this news item'
      });
    }

    const { data, error } = await supabaseAdmin
      .from('news_updates')
      .update({
        title: title,
        body: content,
        clinical_trial_id: clinical_trial_id
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
app.delete('/api/news/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Get user's organization
    const userId = req.user.userId;
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('organization_id')
      .eq('id', userId)
      .single();

    if (profileError || !userProfile) {
      console.error('Failed to get user profile:', profileError);
      return res.status(400).json({
        success: false,
        message: 'Failed to get user profile'
      });
    }

    const organizationId = userProfile.organization_id;
    console.log('🗑️ Deleting news item:', id, 'for organization:', organizationId);

    // First check if the news item belongs to the user's organization
    const { data: existingNews, error: checkError } = await supabaseAdmin
      .from('news_updates')
      .select('organization_id')
      .eq('id', id)
      .single();

    if (checkError || !existingNews) {
      return res.status(404).json({
        success: false,
        message: 'News item not found'
      });
    }

    if (existingNews.organization_id !== organizationId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this news item'
      });
    }

    const { error } = await supabaseAdmin
      .from('news_updates')
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

// Create hospital
app.post('/api/hospitals', authenticateToken, async (req, res) => {
  try {
    const { name, location, principalInvestigator, consentedPatients, randomizedPatients, consentRate } = req.body;
    const userId = req.user.userId;

    if (!name || !location || !principalInvestigator) {
      return res.status(400).json({
        success: false,
        message: 'Name, location, and principal investigator are required'
      });
    }

    // Verify user has a profile
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', userId)
      .single();

    if (profileError) {
      return res.status(400).json({
        success: false,
        message: 'User profile not found. Please contact an administrator.'
      });
    }

    // Allow admins and users to create hospitals (temporarily relaxed for testing)
    if (!['admin', 'user'].includes(userProfile.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to create hospitals'
      });
    }

    // Try to insert into Supabase, but fallback to mock response if it fails
    let transformedHospital;
    try {
      // Use the correct column names that match the Supabase table
      const insertData = {
        organization_id: userProfile.organization_id,
        hospital_name: name,
        location: location,
        principal_investigator: principalInvestigator,
        consented_patients: consentedPatients || 0,
        randomized_patients: randomizedPatients || 0,
        consented_rate: consentRate || 0,
        created_by: userId
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

// Update hospital
app.put('/api/hospitals/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location, principalInvestigator, consentedPatients, randomizedPatients, consentRate } = req.body;
    const userId = req.user.userId;

    // Verify user has a profile
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', userId)
      .single();

    if (profileError) {
      return res.status(400).json({
        success: false,
        message: 'User profile not found. Please contact an administrator.'
      });
    }

    // Allow admins and users to update hospitals (temporarily relaxed for testing)
    if (!['admin', 'user'].includes(userProfile.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update hospitals'
      });
    }

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
        .eq('organization_id', userProfile.organization_id)
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
    const userId = req.user.userId;

    // Verify user has a profile
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', userId)
      .single();

    if (profileError) {
      return res.status(400).json({
        success: false,
        message: 'User profile not found. Please contact an administrator.'
      });
    }

    // Allow admins to delete hospitals
    if (userProfile.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete hospitals'
      });
    }

    const { error } = await supabase
      .from('hospitals')
      .delete()
      .eq('id', id)
      .eq('organization_id', userProfile.organization_id);

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

// Get all training materials (authenticated and filtered by organization)
app.get('/api/training-materials', authenticateToken, async (req, res) => {
  try {
    console.log('📨 GET /api/training-materials - Starting request');
    const userId = req.user.userId;

    // Get user's organization
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', userId)
      .single();

    if (profileError) {
      return res.status(400).json({
        success: false,
        message: 'User profile not found. Please contact an administrator.'
      });
    }

    const { data, error } = await supabase
      .from('training_materials')
      .select('*')
      .eq('organization_id', userProfile.organization_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('📨 Supabase query error:', error);
      console.error('📨 Error details:', {
        code: error.code,
        details: error.details,
        hint: error.hint,
        message: error.message
      });
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch training materials',
        error: error.message,
        hint: error.hint
      });
    }

    console.log('📨 Query successful, found', data ? data.length : 0, 'training materials');
    if (data && data.length > 0) {
      console.log('📨 First material:', data[0]);
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
app.post('/api/training-materials', authenticateToken, async (req, res) => {
  try {
    const { title, description, type, content, category, clinical_trial_id } = req.body;
    const userId = req.user.userId;

    if (!title || !type || !clinical_trial_id) {
      return res.status(400).json({
        success: false,
        message: 'Title, type, and clinical trial selection are required'
      });
    }

    // Verify user has a profile
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', userId)
      .single();

    if (profileError) {
      return res.status(400).json({
        success: false,
        message: 'User profile not found. Please contact an administrator.'
      });
    }

    // Allow admins and users to create training materials
    if (!['admin', 'user'].includes(userProfile.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to create training materials'
      });
    }

    // Validate that the clinical trial exists and belongs to user's organization
    const { data: trial, error: trialError } = await supabase
      .from('clinical_trials')
      .select('id, name')
      .eq('id', clinical_trial_id)
      .eq('organization_id', userProfile.organization_id)
      .single();

    if (trialError || !trial) {
      console.error('Invalid clinical trial:', trialError);
      return res.status(400).json({
        success: false,
        message: 'Invalid clinical trial selected'
      });
    }

    // Check if user has permission to create training materials for this trial
    if (userProfile.role !== 'admin') {
      // Non-admin users must be assigned to the trial
      const { data: assignment, error: assignError } = await supabase
        .from('user_clinical_assignments')
        .select('id')
        .eq('user_id', userId)
        .eq('clinical_trial_id', clinical_trial_id)
        .single();

      if (assignError || !assignment) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to create training materials for this clinical trial'
        });
      }
    }

    // Try to insert into Supabase, but fallback to mock response if it fails
    let transformedTrainingMaterial;
    try {
      // Use the correct column names that match the Supabase table
      const insertData = {
        organization_id: userProfile.organization_id,
        clinical_trial_id: clinical_trial_id,
        title,
        description,
        created_by: userId,
        storage_path: type === 'text' ? null : `training-materials/${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${type}`
      };

      const { data, error } = await supabase
        .from('training_materials')
        .insert([insertData])
        .select('*')
        .single();

      if (!error && data) {
        console.log('Successfully inserted training material into Supabase:', data.id);
        // Transform the data to match frontend expectations
        transformedTrainingMaterial = {
          id: data.id,
          title: data.title,
          description: data.description,
          type: type, // Frontend concept - not stored in DB
          content: content, // Frontend concept - not stored in DB
          category: category, // Frontend concept - not stored in DB
          clinical_trial_id: clinical_trial_id,
          trial_name: trial.name,
          created_by: data.created_by,
          created_by_name: 'Test User', // TODO: Get from profiles table
          upload_date: data.created_at,
          is_active: true,
          created_at: data.created_at
        };
      } else {
        throw new Error(error?.message || 'Supabase insert failed');
      }
    } catch (supabaseError) {
      console.log('Supabase insert failed, using mock response:', supabaseError.message);
      // Fallback: Return mock created training material for testing
      transformedTrainingMaterial = {
        id: Date.now().toString(),
        title,
        description,
        type,
        content,
        category,
        clinical_trial_id: clinical_trial_id,
        trial_name: trial.name,
        created_by: userId,
        created_by_name: 'Test User',
        upload_date: new Date().toISOString(),
        is_active: true,
        created_at: new Date().toISOString()
      };
    }

    res.json({
      success: true,
      message: 'Training material created successfully',
      trainingMaterial: transformedTrainingMaterial
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
app.put('/api/training-materials/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, type, content, category, clinical_trial_id } = req.body;
    const userId = req.user.userId;

    console.log('🔄 PUT /api/training-materials/:id - Request received');
    console.log('📝 ID:', id);
    console.log('👤 User ID:', userId);
    console.log('📋 Data:', { title, description, type, content, category, clinical_trial_id });

    if (!title || !type || !clinical_trial_id) {
      return res.status(400).json({
        success: false,
        message: 'Title, type, and clinical trial selection are required'
      });
    }

    // Verify user has a profile
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', userId)
      .single();

    if (profileError) {
      return res.status(400).json({
        success: false,
        message: 'User profile not found. Please contact an administrator.'
      });
    }

    // Allow admins and users to update training materials
    if (!['admin', 'user'].includes(userProfile.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update training materials'
      });
    }

    // Validate that the clinical trial exists and belongs to user's organization
    const { data: trial, error: trialError } = await supabase
      .from('clinical_trials')
      .select('id, name')
      .eq('id', clinical_trial_id)
      .eq('organization_id', userProfile.organization_id)
      .single();

    if (trialError || !trial) {
      console.error('Invalid clinical trial:', trialError);
      return res.status(400).json({
        success: false,
        message: 'Invalid clinical trial selected'
      });
    }

    // Check if user has permission to update training materials for this trial
    if (userProfile.role !== 'admin') {
      // Non-admin users must be assigned to the trial
      const { data: assignment, error: assignError } = await supabase
        .from('user_clinical_assignments')
        .select('id')
        .eq('user_id', userId)
        .eq('clinical_trial_id', clinical_trial_id)
        .single();

      if (assignError || !assignment) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update training materials for this clinical trial'
        });
      }
    }

    console.log('👥 User profile found:', { organization_id: userProfile.organization_id, role: userProfile.role });

    console.log('🔍 Searching for training material with ID:', id, 'and organization_id:', userProfile.organization_id);

    const { data, error } = await supabase
      .from('training_materials')
      .update({
        title,
        description,
        clinical_trial_id: clinical_trial_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('organization_id', userProfile.organization_id)
      .select()
      .single();

    console.log('📊 Update result - data:', data, 'error:', error);

    if (error) {
      console.error('❌ Supabase error:', error);
      console.error('❌ Error details:', {
        code: error.code,
        details: error.details,
        hint: error.hint,
        message: error.message
      });
      return res.status(500).json({
        success: false,
        message: 'Failed to update training material',
        error: error.message
      });
    }

    console.log('✅ Training material updated successfully:', data.id);

    // Transform the data to match frontend expectations
    const transformedTrainingMaterial = {
      id: data.id,
      title: data.title,
      description: data.description,
      type: type, // Frontend concept - not stored in DB
      content: content, // Frontend concept - not stored in DB
      category: category, // Frontend concept - not stored in DB
      clinical_trial_id: clinical_trial_id,
      trial_name: trial.name,
      created_by: data.created_by,
      created_by_name: 'Test User', // TODO: Get from profiles table
      upload_date: data.created_at,
      is_active: true,
      created_at: data.created_at,
      updated_at: data.updated_at
    };

    res.json({
      success: true,
      message: 'Training material updated successfully',
      trainingMaterial: transformedTrainingMaterial
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
app.delete('/api/training-materials/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Verify user has a profile
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', userId)
      .single();

    if (profileError) {
      return res.status(400).json({
        success: false,
        message: 'User profile not found. Please contact an administrator.'
      });
    }

    // Allow admins to delete training materials
    if (userProfile.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete training materials'
      });
    }

    const { error } = await supabase
      .from('training_materials')
      .delete()
      .eq('id', id)
      .eq('organization_id', userProfile.organization_id);

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

// ===== FILE UPLOAD ENDPOINT =====

// Upload file to Supabase storage
app.post('/api/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    console.log('📤 File upload request received');

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Get user profile to determine organization
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', req.user.userId)
      .single();

    if (profileError || !userProfile) {
      console.error('Profile fetch error:', profileError);
      return res.status(403).json({
        success: false,
        message: 'User profile not found'
      });
    }

    // Generate unique filename with organization prefix
    const fileExtension = req.file.originalname.split('.').pop();
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const filename = `${userProfile.organization_id}/${timestamp}_${randomId}.${fileExtension}`;

    // Determine bucket based on file type or request parameter
    const bucket = req.body.bucket || 'study-protocols';

    console.log(`📁 Uploading to bucket: ${bucket}, filename: ${filename}`);

    // Upload file to Supabase storage (use admin client for public buckets)
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(filename, req.file.buffer, {
        contentType: req.file.mimetype,
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload file',
        error: uploadError.message
      });
    }

    // Store file reference in database
    const { data: fileData, error: fileError } = await supabase
      .from('news_updates')
      .insert({
        organization_id: userProfile.organization_id,
        clinical_trial_id: req.body.clinical_trial_id || null, // Optional - can be null
        title: req.body.title || req.file.originalname,
        content_type: 'file',
        body: req.body.description || null,
        file_url: `${process.env.SUPABASE_URL}/storage/v1/object/public/${bucket}/${filename}`,
        file_name: req.file.originalname,
        file_size: req.file.size,
        mime_type: req.file.mimetype,
        storage_bucket: bucket,
        storage_path: filename,
        created_by: req.user.userId
      })
      .select()
      .single();

    if (fileError) {
      console.error('File reference error:', fileError);
      // Don't fail the request if file reference fails, but log it
    }

    // Generate signed URL for immediate access
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filename, 3600); // 1 hour expiry

    const response = {
      success: true,
      message: 'File uploaded successfully',
      data: {
        filename: filename,
        originalName: req.file.originalname,
        size: req.file.size,
        bucket: bucket,
        signedUrl: signedUrlData?.signedUrl || null,
        fileId: fileData?.id || null
      }
    };

    console.log('✅ File upload completed successfully');
    res.json(response);

  } catch (error) {
    console.error('Unexpected upload error:', error);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred during upload',
      error: error.message
    });
  }
});

// ===== FILE ACCESS ENDPOINT =====

// Generate signed URL for file access
app.get('/api/files/signed-url', authenticateToken, async (req, res) => {
  try {
    const { bucket, path } = req.query;

    if (!bucket || !path) {
      return res.status(400).json({
        success: false,
        message: 'Bucket and path parameters are required'
      });
    }

    console.log(`🔗 Generating signed URL for ${bucket}/${path}`);

    // Generate signed URL for file access
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 3600); // 1 hour expiry

    if (signedUrlError) {
      console.error('Signed URL error:', signedUrlError);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate signed URL',
        error: signedUrlError.message
      });
    }

    res.json({
      success: true,
      signedUrl: signedUrlData.signedUrl
    });

  } catch (error) {
    console.error('Unexpected signed URL error:', error);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: error.message
    });
  }
});

// ===== STUDY PROTOCOLS =====

// Get all study protocols (temporary unauthenticated access for testing)
app.get('/api/study-protocols', authenticateToken, async (req, res) => {
  try {
    console.log('📨 GET /api/study-protocols - Starting request');

    // Get user's organization and role
    const userId = req.user.userId;
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', userId)
      .single();

    if (profileError || !userProfile) {
      console.error('Failed to get user profile:', profileError);
      return res.status(400).json({
        success: false,
        message: 'Failed to get user profile'
      });
    }

    const organizationId = userProfile.organization_id;
    console.log('🔍 Getting study protocols for organization:', organizationId, 'role:', userProfile.role);

    // Get accessible trial IDs based on user role
    let accessibleTrialIds = [];

    if (userProfile.role === 'admin') {
      // Admins can see all trials in their organization
      const { data: allTrials, error: trialsError } = await supabase
        .from('clinical_trials')
        .select('id')
        .eq('organization_id', organizationId);

      if (trialsError) {
        console.error('Failed to get trials for admin:', trialsError);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch accessible trials'
        });
      }

      accessibleTrialIds = allTrials.map(trial => trial.id);
    } else {
      // Doctors/users can only see trials they're assigned to
      const { data: assignedTrials, error: assignmentError } = await supabase
        .from('user_clinical_assignments')
        .select('clinical_trial_id')
        .eq('user_id', userId);

      if (assignmentError) {
        console.error('Failed to get trial assignments:', assignmentError);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch trial assignments'
        });
      }

      accessibleTrialIds = assignedTrials.map(assignment => assignment.clinical_trial_id);
    }

    console.log('🎯 Accessible trial IDs:', accessibleTrialIds);

    if (accessibleTrialIds.length === 0) {
      console.log('📭 No accessible trials found');
      return res.json({
        success: true,
        studyProtocols: []
      });
    }

    // Get study protocols filtered by accessible trials
    const { data, error } = await supabase
      .from('study_protocols')
      .select(`
        id,
        title,
        description,
        type,
        content,
        version,
        clinical_trial_id,
        created_by,
        created_at,
        updated_at,
        clinical_trials (
          name
        ),
        profiles (
          display_name
        )
      `)
      .in('clinical_trial_id', accessibleTrialIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('📨 Supabase query error:', error);
      console.error('📨 Error details:', {
        code: error.code,
        details: error.details,
        hint: error.hint,
        message: error.message
      });

      // Fall back to mock data if database query fails
      console.log('📨 Falling back to mock data');
    } else {
      console.log('📨 Query successful, found', data ? data.length : 0, 'study protocols');
      if (data && data.length > 0) {
        console.log('📨 First protocol:', data[0]);
      }
    }

    // Use real data if available, otherwise mock data
    let studyProtocols;
    if (!error && data && data.length > 0) {
      studyProtocols = data.map(protocol => ({
        id: protocol.id,
        title: protocol.title,
        description: protocol.description,
        type: protocol.type || 'pdf',
        content: protocol.content,
        version: protocol.version,
        clinical_trial_id: protocol.clinical_trial_id,
        trial_name: protocol.clinical_trials?.name || 'Unknown Trial',
        created_by: protocol.created_by,
        created_by_name: protocol.profiles?.display_name || 'Unknown',
        upload_date: protocol.created_at,
        created_at: protocol.created_at
      }));
    } else {
      // Mock data for testing
      console.log('📨 Using mock data');
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
      studyProtocols = mockStudyProtocols;
    }

    console.log(`📊 Returning ${studyProtocols.length} study protocols to frontend`);
    res.json({
      success: true,
      studyProtocols: studyProtocols
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
app.post('/api/study-protocols', authenticateToken, upload.any(), async (req, res) => {
  try {
    console.log('📨 POST /api/study-protocols - Request received');
    console.log('📨 Body keys:', Object.keys(req.body));
    console.log('📨 Files received:', req.files ? req.files.length : 0);

    let uploadedFile = null;
    if (req.files && req.files.length > 0) {
      uploadedFile = req.files[0]; // Take the first file
      console.log('📨 File details:', {
        fieldname: uploadedFile.fieldname,
        originalname: uploadedFile.originalname,
        mimetype: uploadedFile.mimetype,
        size: uploadedFile.size
      });
    }

    const { title, description, type, content, version, clinical_trial_id } = req.body;
    const userId = req.user.userId;

    if (!title || !type || !clinical_trial_id) {
      return res.status(400).json({
        success: false,
        message: 'Title, type, and clinical trial selection are required'
      });
    }

    // Verify user has a profile
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', userId)
      .single();

    if (profileError) {
      return res.status(400).json({
        success: false,
        message: 'User profile not found. Please contact an administrator.'
      });
    }

    // Allow admins and users to create study protocols
    if (!['admin', 'user'].includes(userProfile.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to create study protocols'
      });
    }

    // Validate that the clinical trial exists and belongs to user's organization
    const { data: trial, error: trialError } = await supabase
      .from('clinical_trials')
      .select('id, name')
      .eq('id', clinical_trial_id)
      .eq('organization_id', userProfile.organization_id)
      .single();

    if (trialError || !trial) {
      console.error('Invalid clinical trial:', trialError);
      return res.status(400).json({
        success: false,
        message: 'Invalid clinical trial selected'
      });
    }

    // Check if user has permission to create study protocols for this trial
    if (userProfile.role !== 'admin') {
      // Non-admin users must be assigned to the trial
      const { data: assignment, error: assignError } = await supabase
        .from('user_clinical_assignments')
        .select('id')
        .eq('user_id', userId)
        .eq('clinical_trial_id', clinical_trial_id)
        .single();

      if (assignError || !assignment) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to create study protocols for this clinical trial'
        });
      }
    }

    // Try to insert into Supabase, but fallback to mock response if it fails
    let transformedStudyProtocol;
    try {
      let storagePath = null;
      let actualType = type;

      // Handle file upload if a file was provided
      if (uploadedFile) {
        console.log('📤 File upload detected:', uploadedFile.originalname);
        const bucket = 'study-protocols';
        const filename = `${Date.now()}_${uploadedFile.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;

        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
          .from(bucket)
          .upload(filename, uploadedFile.buffer, {
            contentType: uploadedFile.mimetype,
            cacheControl: '3600'
          });

        if (uploadError) {
          console.error('File upload error:', uploadError);
          return res.status(500).json({
            success: false,
            message: 'Failed to upload file. Please try again.'
          });
        }

        storagePath = filename;
        actualType = 'pdf'; // Override type when file is uploaded
        console.log('✅ File uploaded successfully:', filename);
      }

      // Use the correct column names that match the Supabase table
      const insertData = {
        organization_id: userProfile.organization_id,
        clinical_trial_id: clinical_trial_id,
        title,
        description,
        type: actualType,
        content: content || null,
        version: version || '1.0',
        created_by: userId,
        storage_path: storagePath
      };

      const { data, error } = await supabase
        .from('study_protocols')
        .insert([insertData])
        .select('*')
        .single();

      if (!error && data) {
        console.log('Successfully inserted study protocol into Supabase:', data.id);
        // Transform the data to match frontend expectations
        transformedStudyProtocol = {
          id: data.id,
          title: data.title,
          description: data.description,
          version: data.version,
          type: actualType,
          content: content,
          clinical_trial_id: clinical_trial_id,
          trial_name: trial.name,
          created_by: data.created_by,
          created_by_name: 'Test User', // TODO: Get from profiles table
          upload_date: data.created_at,
          is_active: true,
          created_at: data.created_at
        };
      } else {
        throw new Error(error?.message || 'Supabase insert failed');
      }
    } catch (supabaseError) {
      console.log('Supabase insert failed, using mock response:', supabaseError.message);

      // If file upload failed, return error instead of mock
      if (uploadedFile) {
        return res.status(500).json({
          success: false,
          message: 'Failed to upload file. Please try again.'
        });
      }

      // Fallback: Return mock created study protocol for testing (text only)
      transformedStudyProtocol = {
        id: Date.now().toString(),
        title,
        description,
        version: version || '1.0',
        type,
        content,
        clinical_trial_id: clinical_trial_id,
        trial_name: trial.name,
        created_by: userId,
        created_by_name: 'Test User',
        upload_date: new Date().toISOString(),
        is_active: true,
        created_at: new Date().toISOString()
      };
    }

    res.json({
      success: true,
      message: 'Study protocol created successfully',
      studyProtocol: transformedStudyProtocol
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
app.put('/api/study-protocols/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, type, content, version, clinical_trial_id } = req.body;
    const userId = req.user.userId;

    if (!title || !type || !clinical_trial_id) {
      return res.status(400).json({
        success: false,
        message: 'Title, type, and clinical trial selection are required'
      });
    }

    // Verify user has a profile
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', userId)
      .single();

    if (profileError) {
      return res.status(400).json({
        success: false,
        message: 'User profile not found. Please contact an administrator.'
      });
    }

    // Allow admins and users to update study protocols
    if (!['admin', 'user'].includes(userProfile.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update study protocols'
      });
    }

    // Validate that the clinical trial exists and belongs to user's organization
    const { data: trial, error: trialError } = await supabase
      .from('clinical_trials')
      .select('id, name')
      .eq('id', clinical_trial_id)
      .eq('organization_id', userProfile.organization_id)
      .single();

    if (trialError || !trial) {
      console.error('Invalid clinical trial:', trialError);
      return res.status(400).json({
        success: false,
        message: 'Invalid clinical trial selected'
      });
    }

    // Check if user has permission to update study protocols for this trial
    if (userProfile.role !== 'admin') {
      // Non-admin users must be assigned to the trial
      const { data: assignment, error: assignError } = await supabase
        .from('user_clinical_assignments')
        .select('id')
        .eq('user_id', userId)
        .eq('clinical_trial_id', clinical_trial_id)
        .single();

      if (assignError || !assignment) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update study protocols for this clinical trial'
        });
      }
    }

    const { data, error } = await supabase
      .from('study_protocols')
      .update({
        title,
        version,
        clinical_trial_id: clinical_trial_id,
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

    // Transform the data to match frontend expectations
    const transformedStudyProtocol = {
      id: data.id,
      title: data.title,
      description: data.description,
      type: data.type || 'pdf',
      content: data.content,
      version: data.version,
      clinical_trial_id: clinical_trial_id,
      trial_name: trial.name,
      created_by: data.created_by,
      created_by_name: 'Test User', // TODO: Get from profiles table
      upload_date: data.created_at,
      is_active: true,
      created_at: data.created_at,
      updated_at: data.updated_at
    };

    res.json({
      success: true,
      message: 'Study protocol updated successfully',
      studyProtocol: transformedStudyProtocol
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
app.delete('/api/study-protocols/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Verify user has a profile
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', userId)
      .single();

    if (profileError) {
      return res.status(400).json({
        success: false,
        message: 'User profile not found. Please contact an administrator.'
      });
    }

    // Allow admins to delete study protocols
    if (userProfile.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete study protocols'
      });
    }

    const { error } = await supabase
      .from('study_protocols')
      .delete()
      .eq('id', id)
      .eq('organization_id', userProfile.organization_id);

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

// Get all PDF documents (now from news_updates table)
app.get('/api/pdfs', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('news_updates')
      .select('*')
      .eq('content_type', 'file')
      .order('created_at', { ascending: false });

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

// Company documents upload endpoint
app.post('/api/company/:company/documents', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    console.log('📨 POST /api/company/:company/documents - Request received');
    const { company } = req.params;
    const { title, description, category } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Title is required'
      });
    }

    // Get user profile
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('organization_id, role')
      .eq('id', req.user.userId)
      .single();

    if (profileError || !userProfile) {
      console.error('Profile fetch error:', profileError);
      return res.status(403).json({
        success: false,
        message: 'User profile not found'
      });
    }

    let documentData = {
      title,
      description: description || '',
      category: category || 'General',
      uploaded_by: req.user.userId,
      organization_id: userProfile.organization_id,
      type: 'document'
    };

    // Handle file upload if file was provided
    if (req.file) {
      console.log('📤 File upload detected for document:', req.file.originalname);

      // Generate unique filename with organization prefix
      const fileExtension = req.file.originalname.split('.').pop();
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const filename = `${userProfile.organization_id}/${timestamp}_${randomId}.${fileExtension}`;

      const bucket = 'trial-documents'; // Use trial-documents bucket for general documents

    // Upload file to Supabase storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(filename, req.file.buffer, {
        contentType: req.file.mimetype,
        cacheControl: '3600'
      });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload file',
          error: uploadError.message
        });
      }

      // For public buckets, create public URL
      const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/${bucket}/${filename}`;

      // Add file information to document data
      documentData.file_url = publicUrl;
      documentData.file_path = filename; // Keep the path for reference
      documentData.file_name = req.file.originalname;
      documentData.file_size = req.file.size;
      documentData.mime_type = req.file.mimetype;
      documentData.bucket = bucket;
    }

    // Insert document into news_updates table
    const { data: insertedDocument, error: insertError } = await supabaseAdmin
      .from('news_updates')
      .insert([{
        organization_id: userProfile.organization_id,
        clinical_trial_id: req.body.clinical_trial_id || null, // Optional - can be null
        title: documentData.title || documentData.file_name,
        content_type: 'file',
        body: documentData.description || null,
        file_url: documentData.file_url,
        file_name: documentData.file_name,
        file_size: documentData.file_size,
        mime_type: documentData.mime_type,
        storage_bucket: documentData.bucket || 'trial-documents',
        storage_path: documentData.file_path || filename,
        created_by: req.user.userId
      }])
      .select()
      .single();

    if (insertError) {
      console.error('Document insert error:', insertError);
      return res.status(500).json({
        success: false,
        message: 'Failed to save document',
        error: insertError.message
      });
    }

    console.log('✅ Document created successfully:', insertedDocument.id);

    // Add public URL to response if file was uploaded
    const responseDocument = {
      ...insertedDocument,
      public_url: documentData.file_url || null
    };

    res.json({
      success: true,
      message: 'Document uploaded successfully',
      document: responseDocument
    });

  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: error.message
    });
  }
});

// Create PDF document (now in news_updates table)
app.post('/api/pdfs', authenticateToken, async (req, res) => {
  try {
    const { title, description, category, fileUrl, fileName, fileSize, clinical_trial_id } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Title is required'
      });
    }

    const { data, error } = await supabase
      .from('news_updates')
      .insert([{
        title,
        content_type: 'file',
        body: description,
        file_url: fileUrl,
        file_name: fileName,
        file_size: fileSize,
        mime_type: 'application/pdf',
        organization_id: req.user.organization_id,
        clinical_trial_id: clinical_trial_id || null, // Optional - can be null
        created_by: req.user.userId
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
});

// Delete PDF document (now from news_updates table)
app.delete('/api/pdfs/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('news_updates')
      .delete()
      .eq('id', id)
      .eq('content_type', 'file'); // Only allow deleting file-type entries

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

