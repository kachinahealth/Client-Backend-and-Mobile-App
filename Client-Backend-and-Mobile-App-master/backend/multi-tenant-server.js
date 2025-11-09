const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const app = express();
const PORT = 3000;

// Add these near the top of the file, right after creating 'app'
app.use(cors());
app.use(express.json());

// Add this test endpoint to verify the server is working
app.get('/api/test', (req, res) => {
    res.json({ message: 'Server is working' });
});

// Log all incoming requests (add this for debugging)
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

// Initialize data storage
let companies = {};

// Add to your existing data structure
let emailCodes = new Map(); // Store temporary codes

// Add this alongside existing companies data structure
let mobileAuthCodes = new Map(); // Store temporary codes for mobile users

// Email configuration (you'll need to provide real credentials)
let emailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'your-email@gmail.com',
        pass: 'your-app-specific-password' // Use an app-specific password from Google Account
    }
});

// Create a test account for Ethereal Email
async function createTestEmailAccount() {
    const testAccount = await nodemailer.createTestAccount();
    
    const transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
            user: testAccount.user,
            pass: testAccount.pass
        }
    });

    console.log('📧 Test Email Account Created:');
    console.log('Username:', testAccount.user);
    console.log('Password:', testAccount.pass);
    console.log('Preview URL: https://ethereal.email');

    return transporter;
}

// Initialize email transporter
createTestEmailAccount().then(transporter => {
    emailTransporter = transporter;  // Now this assignment will work
    console.log('✅ Email system ready');
});

// Update the sendApprovalEmail function
async function sendApprovalEmail(user) {
    try {
        const info = await emailTransporter.sendMail({
            from: '"KachinaHealth" <stride@kachinahealth.com>',
            to: user.email,
            subject: 'Your STRIDE Trial App Access is Approved',
            html: `
                <h2>Welcome to the STRIDE Trial App</h2>
                <p>Dear ${user.firstName} ${user.lastName},</p>
                <p>Your registration has been approved. You can now log in to the STRIDE Trial mobile app using your email address:</p>
                <p><strong>${user.email}</strong></p>
                <p>When you open the app, click "Sign In" and enter this email address. You'll receive a one-time code to complete your login.</p>
                <br>
                <p>Best regards,</p>
                <p>The STRIDE Trial Team</p>
            `
        });

        console.log('📨 Approval email sent! Preview URL:', nodemailer.getTestMessageUrl(info));
        return nodemailer.getTestMessageUrl(info);
    } catch (error) {
        console.error('Failed to send approval email:', error);
        throw error;
    }
}

// Middleware
app.use(cors());
app.use(express.json());

// Serve admin dashboard files
app.use('/admin-dashboard', express.static(path.join(__dirname, '../admin-dashboard')));

// Authentication middleware (simplified for demo)
const authenticateClient = (req, res, next) => {
  const { companyId, username, password } = req.body;
  
  // In production, this would check against a database
  if (companies[companyId] && 
      username === companies[companyId].credentials.username && 
      password === companies[companyId].credentials.password) {
    req.companyId = companyId;
    next();
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
};

// Health check
app.get('/health', (req, res) => {
  try {
    console.log('Health check request received');
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      message: 'Multi-tenant server running!'
    });
    console.log('Health check response sent');
  } catch (error) {
    console.error('Error in health check:', error);
    res.status(500).json({ error: error.message });
  }
});

// Logo health check
app.get('/logos-health', (req, res) => {
  const fs = require('fs');
  const logosDir = path.join(__dirname, '../admin-dashboard/logos');
  
  try {
    const files = fs.readdirSync(logosDir);
    const logoFiles = files.filter(file => file.endsWith('.png') || file.endsWith('.svg'));
    
    res.json({
      status: 'OK',
      logosPath: logosDir,
      availableLogos: logoFiles,
      cerevascLogoExists: fs.existsSync(path.join(logosDir, 'cerevasc-logo.png')),
      cerevascLogoPath: path.join(logosDir, 'cerevasc-logo.png')
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      error: error.message,
      logosPath: logosDir
    });
  }
});

// Client login endpoint
app.post('/api/auth/client-login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // Find company by credentials (in production, this would check against a database)
  let foundCompany = null;
  let companyId = null;
  
  for (const [id, company] of Object.entries(companies)) {
    if (username === company.credentials.username && password === company.credentials.password) {
      foundCompany = company;
      companyId = id;
      break;
    }
  }
  
  if (!foundCompany) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  console.log('Login successful for company:', foundCompany.name);
  console.log('Company logo URL:', foundCompany.logoUrl);
  
  res.json({
    success: true,
    message: 'Login successful',
    company: {
      id: companyId,
      name: foundCompany.name,
      primaryColor: foundCompany.primaryColor,
      logoUrl: foundCompany.logoUrl
    }
  });
});

// Get company dashboard data
app.get('/api/company/:companyId/dashboard', (req, res) => {
  const { companyId } = req.params;
  
  if (!companies[companyId]) {
    return res.status(404).json({ error: 'Company not found' });
  }
  
  const company = companies[companyId];
  const stats = {
    totalUsers: company.users.length,
    pendingApprovals: company.users.filter(u => u.status === 'pending').length,
    activeUsers: company.users.filter(u => u.status === 'approved').length,
    newsItems: company.news.length
  };
  
  res.json({
    company: {
      id: companyId,
      name: company.name,
      primaryColor: company.primaryColor
    },
    stats,
    users: company.users,
    news: company.news
  });
});

// User registration endpoint (from mobile app)
app.post('/api/auth/register', (req, res) => {
  const { companyId, email, password, firstName, lastName, site, role } = req.body;
  
  if (!companyId || !companies[companyId]) {
    return res.status(400).json({ error: 'Invalid company ID' });
  }
  
  // Check if user already exists
  const existingUser = companies[companyId].users.find(u => u.email === email);
  if (existingUser) {
    return res.status(400).json({ error: 'User already exists' });
  }
  
  // Create new user
  const newUser = {
    id: Date.now().toString(),
    email,
    firstName,
    lastName,
    site,
    role,
    status: 'pending',
    registrationDate: new Date().toISOString().split('T')[0],
    password: password // In production, hash this password
  };
  
  companies[companyId].users.push(newUser);
  
  // Save data to file
  console.log('Saving data (currently to memory)');
  
  console.log(`📝 New user registration for ${companyId}:`, { email, firstName, lastName, site });
  
  res.json({
    success: true,
    message: 'User registered successfully. Awaiting approval.',
    user: {
      id: newUser.id,
      email: newUser.email,
      status: newUser.status
    }
  });
});

// Add this new endpoint for mobile registration
app.post('/api/auth/mobile/register', async (req, res) => {
    const { firstName, lastName, email, site, role } = req.body;
    
    // Validate required fields
    if (!firstName || !lastName || !email || !site || !role) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if email already exists in any company
    for (const company of Object.values(companies)) {
        if (company.users.some(user => user.email.toLowerCase() === email.toLowerCase())) {
            return res.status(400).json({ error: 'Email already registered' });
        }
    }

    // Create new user object
    const newUser = {
        id: `u${Date.now()}`,
        firstName,
        lastName,
        email,
        site,
        role,
        status: 'pending',
        createdAt: new Date().toISOString(),
        analytics: {
            lastAppOpen: null,
            totalAppOpens: 0,
            tabViews: {
                leaderboard: 0,
                news: 0,
                resources: 0,
                messaging: 0
            }
        }
    };

    // For demo, add to CereVasc company
    if (!companies.cerevasc.users) {
        companies.cerevasc.users = [];
    }
    companies.cerevasc.users.push(newUser);

    // Save to file
    try {
        console.log('Saving data (currently to memory)');
        
        // Send response
        res.json({
            success: true,
            message: 'Registration successful. Pending admin approval.'
        });

    } catch (error) {
        console.error('Failed to save registration:', error);
        res.status(500).json({ error: 'Failed to complete registration' });
    }
});

// Add the mobile login endpoint
app.post('/api/auth/mobile/request-code', async (req, res) => {
    console.log('Received code request for:', req.body);
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    // Find user by email across all companies
    let userCompany = null;
    let foundUser = null;
    
    for (const [companyId, company] of Object.entries(companies)) {
        const user = company.users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (user) {
            userCompany = companyId;
            foundUser = user;
            break;
        }
    }

    if (!foundUser) {
        return res.status(404).json({ error: 'User not found' });
    }

    if (foundUser.status !== 'approved') {
        return res.status(403).json({ error: 'Account pending approval' });
    }

    try {
        // Generate 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Store code temporarily
        if (!global.loginCodes) global.loginCodes = new Map();
        global.loginCodes.set(email, {
            code,
            expires: Date.now() + 5 * 60 * 1000, // 5 minutes
            attempts: 0
        });

        // Send email with code
        const info = await emailTransporter.sendMail({
            from: '"KachinaHealth" <stride@kachinahealth.com>',
            to: email,
            subject: 'Your STRIDE Trial App Login Code',
            html: `
                <h2>STRIDE Trial App Login Code</h2>
                <p>Your login code is: <strong>${code}</strong></p>
                <p>This code will expire in 5 minutes.</p>
            `
        });

        console.log('Login code email preview:', nodemailer.getTestMessageUrl(info));
        
        res.json({ 
            success: true, 
            message: 'Login code sent',
            emailPreview: nodemailer.getTestMessageUrl(info)
        });
    } catch (error) {
        console.error('Error sending login code:', error);
        res.status(500).json({ error: 'Failed to send login code' });
    }
});

// Add this endpoint for verifying the login code
app.post('/api/auth/mobile/verify-code', (req, res) => {
    console.log('Verifying code:', req.body); // Debug log
    const { email, code } = req.body;
    
    if (!email || !code) {
        return res.status(400).json({ error: 'Email and code are required' });
    }

    if (!global.loginCodes || !global.loginCodes.has(email)) {
        return res.status(400).json({ error: 'No code requested or code expired' });
    }

    const codeData = global.loginCodes.get(email);
    
    // Check expiration
    if (Date.now() > codeData.expires) {
        global.loginCodes.delete(email);
        return res.status(400).json({ error: 'Code expired' });
    }

    // Check code
    if (codeData.code !== code) {
        codeData.attempts++;
        if (codeData.attempts >= 3) {
            global.loginCodes.delete(email);
            return res.status(400).json({ error: 'Too many attempts. Please request a new code.' });
        }
        return res.status(400).json({ error: 'Invalid code' });
    }

    // Find user data
    let userData = null;
    let userCompany = null;
    
    for (const [companyId, company] of Object.entries(companies)) {
        const user = company.users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (user) {
            userData = user;
            userCompany = companyId;
            break;
        }
    }

    // Clean up used code
    global.loginCodes.delete(email);

    // Return success with user data
    res.json({
        success: true,
        user: {
            id: userData.id,
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            companyId: userCompany
        }
    });
});

// User login endpoint (from mobile app)
app.post('/api/auth/login', (req, res) => {
  const { companyId, email, password } = req.body;
  
  if (!companyId || !companies[companyId]) {
    return res.status(400).json({ error: 'Invalid company ID' });
  }
  
  const user = companies[companyId].users.find(u => u.email === email);
  
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  if (user.status !== 'approved') {
    return res.status(403).json({ error: 'Account pending approval' });
  }
  
  console.log(`🔑 User login for ${companyId}:`, { email });
  
  res.json({
    success: true,
    message: 'Login successful',
    token: 'demo-jwt-token',
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      site: user.site,
      role: user.role,
      status: user.status
    }
  });
});

// Approve/reject user (from admin dashboard)
app.post('/api/company/:companyId/users/:userId/approve', async (req, res) => {
    const { companyId, userId } = req.params;
    
    if (!companies[companyId]) {
        return res.status(404).json({ error: 'Company not found' });
    }

    const user = companies[companyId].users.find(u => u.id === userId);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    try {
        // Update user status
        user.status = 'approved';
        user.approvedAt = new Date().toISOString();
        
        // Send approval email and get preview URL
        const previewUrl = await sendApprovalEmail(user);
        
        // Save changes
        console.log('Saving data (currently to memory)');
        
        res.json({ 
            success: true, 
            message: 'User approved and notified',
            emailPreviewUrl: previewUrl // Include preview URL in response
        });
    } catch (error) {
        console.error('Error in user approval:', error);
        res.status(500).json({ error: 'Failed to approve user' });
    }
});

// Add news item (from admin dashboard)
app.post('/api/company/:companyId/news', (req, res) => {
  const { companyId } = req.params;
  const { title, content } = req.body;
  
  if (!companies[companyId]) {
    return res.status(404).json({ error: 'Company not found' });
  }
  
  const newsItem = {
    id: Date.now().toString(),
    title,
    content,
    date: new Date().toISOString().split('T')[0],
    published: false
  };
  
  companies[companyId].news.push(newsItem);
  
  // Save data to file
  console.log('Saving data (currently to memory)');
  
  console.log(`📰 News added for ${companyId}:`, { title });
  
  res.json({
    success: true,
    message: 'News item added successfully',
    news: newsItem
  });
});

// Update news item (from admin dashboard)
app.put('/api/company/:companyId/news/:newsId', (req, res) => {
  const { companyId, newsId } = req.params;
  const { title, content } = req.body;
  
  if (!companies[companyId]) {
    return res.status(404).json({ error: 'Company not found' });
  }
  
  const newsIndex = companies[companyId].news.findIndex(n => n.id === newsId);
  
  if (newsIndex === -1) {
    return res.status(404).json({ error: 'News item not found' });
  }
  
  companies[companyId].news[newsIndex] = {
    ...companies[companyId].news[newsIndex],
    title,
    content,
    updatedDate: new Date().toISOString().split('T')[0]
  };
  
  // Save data to file
  console.log('Saving data (currently to memory)');
  
  console.log(`📰 News updated for ${companyId}:`, { newsId, title });
  
  res.json({
    success: true,
    message: 'News item updated successfully',
    news: companies[companyId].news[newsIndex]
  });
});

// Delete news item (from admin dashboard)
app.delete('/api/company/:companyId/news/:newsId', (req, res) => {
  const { companyId, newsId } = req.params;
  
  if (!companies[companyId]) {
    return res.status(404).json({ error: 'Company not found' });
  }
  
  const newsIndex = companies[companyId].news.findIndex(n => n.id === newsId);
  
  if (newsIndex === -1) {
    return res.status(404).json({ error: 'News item not found' });
  }
  
  companies[companyId].news.splice(newsIndex, 1);
  
  // Save data to file
  console.log('Saving data (currently to memory)');
  
  console.log(`📰 News deleted for ${companyId}:`, { newsId });
  
  res.json({
    success: true,
    message: 'News item deleted successfully'
  });
});

// Get news for mobile app
app.get('/api/company/:companyId/news', (req, res) => {
  const { companyId } = req.params;
  
  if (!companies[companyId]) {
    return res.status(404).json({ error: 'Company not found' });
  }
  
  const publishedNews = companies[companyId].news.filter(n => n.published);
  
  res.json({
    success: true,
    news: publishedNews
  });
});

// Mobile app endpoints for PDF documents
app.get('/api/company/:companyId/mobile/pdfs', (req, res) => {
  const { companyId } = req.params;
  
  if (!companies[companyId]) {
    return res.status(404).json({ error: 'Company not found' });
  }
  
  res.json({
    success: true,
    pdfs: companies[companyId].pdfs
  });
});

// Mobile app endpoint for enrollment leaderboard
app.get('/api/company/:companyId/mobile/leaderboard', (req, res) => {
  const { companyId } = req.params;
  
  if (!companies[companyId]) {
    return res.status(404).json({ error: 'Company not found' });
  }
  
  const hospitals = companies[companyId].hospitals || [];
  const totalConsented = hospitals.reduce((sum, h) => sum + h.consentedPatients, 0);
  const totalRandomized = hospitals.reduce((sum, h) => sum + h.randomizedPatients, 0);
  
  // Sort hospitals by consented patients for competitive ranking
  const sortedHospitals = hospitals.sort((a, b) => b.consentedPatients - a.consentedPatients);
  
  res.json({
    success: true,
    hospitals: sortedHospitals,
    totalConsented,
    totalRandomized,
    lastUpdated: new Date().toISOString()
  });
});

// Update company settings
app.put('/api/company/:companyId/settings', (req, res) => {
  const { companyId } = req.params;
  const { settings } = req.body;
  
  if (!companies[companyId]) {
    return res.status(404).json({ error: 'Company not found' });
  }
  
  companies[companyId].settings = { ...companies[companyId].settings, ...settings };
  
  res.json({
    success: true,
    message: 'Settings updated successfully',
    settings: companies[companyId].settings
  });
});

// Get company settings
app.get('/api/company/:companyId/settings', (req, res) => {
  const { companyId } = req.params;
  
  if (!companies[companyId]) {
    return res.status(404).json({ error: 'Company not found' });
  }
  
  res.json({
    success: true,
    settings: companies[companyId].settings
  });
});

// Training Materials Management
app.get('/api/company/:companyId/training-materials', (req, res) => {
  const { companyId } = req.params;
  
  if (!companies[companyId]) {
    return res.status(404).json({ error: 'Company not found' });
  }
  
  res.json({
    success: true,
    trainingMaterials: companies[companyId].trainingMaterials || []
  });
});

app.post('/api/company/:companyId/training-materials', (req, res) => {
  const { companyId } = req.params;
  
  if (!companies[companyId]) {
    return res.status(404).json({ error: 'Company not found' });
  }
  
  const { title, description, type, content, category } = req.body;
  
  if (!title || !type) {
    return res.status(400).json({ error: 'Title and type are required' });
  }
  
  const trainingMaterial = {
    id: Date.now().toString(),
    title,
    description: description || '',
    type, // 'video', 'pdf', 'text'
    content: content || '', // For text content or file URL
    category: category || 'General',
    uploadDate: new Date().toISOString().split('T')[0],
    createdBy: 'Admin' // In production, use actual user info
  };
  
  if (!companies[companyId].trainingMaterials) {
    companies[companyId].trainingMaterials = [];
  }
  
  companies[companyId].trainingMaterials.push(trainingMaterial);
  
  // Save data to file
  console.log('Saving data (currently to memory)');
  
  console.log(`📚 Training material added for ${companyId}:`, { title, type });
  
  res.json({
    success: true,
    message: 'Training material added successfully',
    trainingMaterial
  });
});

app.delete('/api/company/:companyId/training-materials/:materialId', (req, res) => {
  const { companyId } = req.params;
  
  if (!companies[companyId]) {
    return res.status(404).json({ error: 'Company not found' });
  }
  
  const materialIndex = companies[companyId].trainingMaterials.findIndex(m => m.id === materialId);
  
  if (materialIndex === -1) {
    return res.status(404).json({ error: 'Training material not found' });
  }
  
  companies[companyId].trainingMaterials.splice(materialIndex, 1);
  
  // Save data to file
  console.log('Saving data (currently to memory)');
  
  res.json({
    success: true,
    message: 'Training material deleted successfully'
  });
});

// Study Protocol Management
app.get('/api/company/:companyId/study-protocols', (req, res) => {
  const { companyId } = req.params;
  
  if (!companies[companyId]) {
    return res.status(404).json({ error: 'Company not found' });
  }
  
  res.json({
    success: true,
    studyProtocols: companies[companyId].studyProtocols || []
  });
});

app.post('/api/company/:companyId/study-protocols', (req, res) => {
  const { companyId } = req.params;
  
  if (!companies[companyId]) {
    return res.status(404).json({ error: 'Company not found' });
  }
  
  const { title, description, type, content, version } = req.body;
  
  if (!title || !type) {
    return res.status(400).json({ error: 'Title and type are required' });
  }
  
  const studyProtocol = {
    id: Date.now().toString(),
    title,
    description: description || '',
    type, // 'pdf', 'text'
    content: content || '', // For text content or file URL
    version: version || '1.0',
    uploadDate: new Date().toISOString().split('T')[0],
    createdBy: 'Admin' // In production, use actual user info
  };
  
  if (!companies[companyId].studyProtocols) {
    companies[companyId].studyProtocols = [];
  }
  
  companies[companyId].studyProtocols.push(studyProtocol);
  
  // Save data to file
  console.log('Saving data (currently to memory)');
  
  console.log(`📋 Study protocol added for ${companyId}:`, { title, type });
  
  res.json({
    success: true,
    message: 'Study protocol added successfully',
    studyProtocol
  });
});

app.delete('/api/company/:companyId/study-protocols/:protocolId', (req, res) => {
  const { companyId, protocolId } = req.params;
  
  if (!companies[companyId]) {
    return res.status(404).json({ error: 'Company not found' });
  }
  
  const protocolIndex = companies[companyId].studyProtocols.findIndex(p => p.id === protocolId);
  
  if (protocolIndex === -1) {
    return res.status(404).json({ error: 'Study protocol not found' });
  }
  
  companies[companyId].studyProtocols.splice(protocolIndex, 1);
  
  // Save data to file
  console.log('Saving data (currently to memory)');
  
  res.json({
    success: true,
    message: 'Study protocol deleted successfully'
  });
});

// Enrollment Leaderboard Management
app.get('/api/company/:companyId/leaderboard', (req, res) => {
  const { companyId } = req.params;
  
  if (!companies[companyId]) {
    return res.status(404).json({ error: 'Company not found' });
  }
  
  const hospitals = companies[companyId].hospitals || [];
  const totalConsented = hospitals.reduce((sum, h) => sum + h.consentedPatients, 0);
  const totalRandomized = hospitals.reduce((sum, h) => sum + h.randomizedPatients, 0);
  
  res.json({
    success: true,
    hospitals,
    summary: {
      totalConsented,
      totalRandomized,
      totalHospitals: hospitals.length
    }
  });
});

// Get all hospitals for a company
app.get('/api/company/:companyId/hospitals', (req, res) => {
  const { companyId } = req.params;
  
  if (!companies[companyId]) {
    return res.status(404).json({ error: 'Company not found' });
  }
  
  res.json({
    success: true,
    hospitals: companies[companyId].hospitals || []
  });
});

app.post('/api/company/:companyId/hospitals', (req, res) => {
  const { companyId } = req.params;
  const { name, location, principalInvestigator, consentedPatients, randomizedPatients, consentRate } = req.body;
  
  if (!companies[companyId]) {
    return res.status(404).json({ error: 'Company not found' });
  }
  
  if (!name || !location) {
    return res.status(400).json({ error: 'Hospital name and location are required' });
  }
  
  const hospital = {
    id: Date.now().toString(),
    name,
    location,
    principalInvestigator: principalInvestigator || '',
    consentedPatients: parseInt(consentedPatients) || 0,
    randomizedPatients: parseInt(randomizedPatients) || 0,
    consentRate: parseFloat(consentRate) || 0
  };
  
  companies[companyId].hospitals.push(hospital);
  
  // Save data to file
  console.log('Saving data (currently to memory)');
  
  console.log(`🏥 Hospital added for ${companyId}:`, { name, location });
  
  res.json({
    success: true,
    message: 'Hospital added successfully',
    hospital
  });
});

app.put('/api/company/:companyId/hospitals/:hospitalId', (req, res) => {
  const { companyId, hospitalId } = req.params;
  const { name, location, principalInvestigator, consentedPatients, randomizedPatients, consentRate } = req.body;
  
  if (!companies[companyId]) {
    return res.status(404).json({ error: 'Company not found' });
  }
  
  const hospitalIndex = companies[companyId].hospitals.findIndex(h => h.id === hospitalId);
  
  if (hospitalIndex === -1) {
    return res.status(404).json({ error: 'Hospital not found' });
  }
  
  companies[companyId].hospitals[hospitalIndex] = {
    ...companies[companyId].hospitals[hospitalIndex],
    name,
    location,
    principalInvestigator: principalInvestigator || '',
    consentedPatients: parseInt(consentedPatients) || 0,
    randomizedPatients: parseInt(randomizedPatients) || 0,
    consentRate: parseFloat(consentRate) || 0
  };
  
  // Save data to file
  console.log('Saving data (currently to memory)');
  
  console.log(`🏥 Hospital updated for ${companyId}:`, { name, location });
  
  res.json({
    success: true,
    message: 'Hospital updated successfully',
    hospital: companies[companyId].hospitals[hospitalIndex]
  });
});

app.delete('/api/company/:companyId/hospitals/:hospitalId', (req, res) => {
  const { companyId } = req.params;
  
  if (!companies[companyId]) {
    return res.status(404).json({ error: 'Company not found' });
  }
  
  const hospitalIndex = companies[companyId].hospitals.findIndex(h => h.id === hospitalId);
  
  if (hospitalIndex === -1) {
    return res.status(404).json({ error: 'Hospital not found' });
  }
  
  const deletedHospital = companies[companyId].hospitals.splice(hospitalIndex, 1)[0];
  
  // Save data to file
  console.log('Saving data (currently to memory)');
  
  console.log(`🗑️ Hospital deleted for ${companyId}:`, deletedHospital.name);
  
  res.json({
    success: true,
    message: 'Hospital deleted successfully'
  });
});

// Start server
app.listen(PORT, (err) => {
  if (err) {
    console.error('Error starting server:', err);
    return;
  }
  console.log(`🚀 Multi-tenant server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Client login: http://localhost:${PORT}/api/auth/client-login`);
  console.log(`📱 Mobile app endpoints: http://localhost:${PORT}/api/auth/register`);
  console.log('\n🏢 Available companies:');
  Object.keys(companies).forEach(id => {
    console.log(`   - ${id}: ${companies[id].name}`);
  });
  console.log('\n👤 Demo credentials:');
  Object.keys(companies).forEach(id => {
    const company = companies[id];
    console.log(`   ${company.name}: username: ${company.credentials.username}, password: ${company.credentials.password}`);
  });
  console.log('\nPress Ctrl+C to stop the server');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  process.exit(0);
});
