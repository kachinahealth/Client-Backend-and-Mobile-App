import React, { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import { MedicalServices, Business, Security, Analytics } from '@mui/icons-material';
import Head from 'next/head';

interface LoginForm {
  companyId: string;
  username: string;
  password: string;
}

export default function KachinaHealthLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (response.ok) {
        const data = await response.json();
        // Store JWT token for authentication
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        // Redirect to client home
        window.location.href = `/clienthome.html`;
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Invalid email or password');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      background: 'linear-gradient(135deg, #f8f9fa 0%, #e3f2fd 25%, #e0f2f1 50%, #f1f8e9 75%, #f9fbe7 100%)',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
        <Head>
        <title>KachinaHealth - Client Portal</title>
        <style>{`
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #2196f3 0%, #26a69a 50%, #66bb6a 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          
          .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            padding: 3rem;
            width: 100%;
            max-width: 400px;
            text-align: center;
          }
          
          .header {
            margin-bottom: 2.5rem;
          }

          .logo-container {
            margin-bottom: 1.5rem;
            background: #1e1e1e;
            padding: 1rem;
            border-radius: 15px;
            display: inline-block;
          }

          .kachina-logo {
            width: 120px;
            height: 120px;
            object-fit: contain;
            margin: 0 auto;
            border-radius: 15px;
          }

          .subtitle {
            color: #1976d2;
            font-size: 1.5rem;
            font-weight: 700;
            margin-top: 1rem;
            letter-spacing: 1px;
          }
          
          .form-group {
            margin-bottom: 1.5rem;
            text-align: left;
          }
          
          label {
            display: block;
            margin-bottom: 0.5rem;
            color: #333;
            font-weight: 600;
            font-size: 0.9rem;
          }
          
          input {
            width: 100%;
            padding: 0.875rem;
            border: 2px solid #e1e5e9;
            border-radius: 8px;
            font-size: 1rem;
            transition: all 0.3s ease;
            background: #fafafa;
          }
          
          input:focus {
            outline: none;
            border-color: #1976d2;
            background: white;
            box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.1);
          }
          
          button {
            width: 100%;
            padding: 0.875rem;
            background: #1976d2;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
          }
          
          button:hover {
            background: #1565c0;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(25, 118, 210, 0.3);
          }
          
          button:active {
            transform: translateY(0);
          }
          
          button:disabled {
            background: #ccc;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
          }
          
          .error {
            color: #d32f2f;
            background: #ffebee;
            padding: 0.75rem;
            border-radius: 8px;
            margin-bottom: 1.5rem;
            display: none;
            border-left: 4px solid #d32f2f;
            font-size: 0.9rem;
          }
        `}</style>
      </Head>
      
        <Paper elevation={10} sx={{
          padding: '3rem',
          width: '100%',
          maxWidth: '400px',
          textAlign: 'center',
          backgroundColor: '#ffffff',
          borderRadius: '20px'
        }}>
        <div className="header">
          <div className="logo-container">
            <img src="/logos/logo.png" alt="KachinaHealth Logo" className="kachina-logo" />
          </div>
          <p className="subtitle">Client Portal</p>
        </div>
        
        {error && (
          <div className="error" style={{ display: 'block' }}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>
          
          <button type="submit" disabled={loading}>
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
        </Paper>
      </Box>
  );
}
