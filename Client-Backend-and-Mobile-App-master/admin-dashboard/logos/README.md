# Company Logos

This directory contains the company logos used in the KachinaHealth multi-tenant dashboard.

## Current Logos

- **`cerevasc-logo.svg`** - CereVasc company logo
- **`medtronic-logo.svg`** - Medtronic company logo

## How to Update Logos

### Option 1: Replace SVG Files (Recommended)
1. Replace the existing SVG file with your new logo
2. Keep the same filename (e.g., `cerevasc-logo.svg`)
3. Ensure the new SVG has appropriate dimensions (recommended: 200x80 or similar aspect ratio)
4. Restart the backend server after making changes

### Option 2: Update Base64 Data in Backend
1. Convert your new logo to base64 format
2. Update the `logoUrl` field in `STRIDE-Trial-App/backend/multi-tenant-server.js`
3. Replace the existing base64 string in the `companies` object
4. Restart the backend server

## Logo Specifications

- **Format**: SVG (vector) preferred for scalability
- **Dimensions**: 200x80 pixels (or similar 2.5:1 aspect ratio)
- **Colors**: Use company brand colors
- **Style**: Professional, medical/healthcare appropriate

## File Locations

- **Logo Files**: `STRIDE-Trial-App/admin-dashboard/logos/`
- **Backend Configuration**: `STRIDE-Trial-App/backend/multi-tenant-server.js`
- **Dashboard Display**: `STRIDE-Trial-App/admin-dashboard/simple-dashboard.html`

## Adding New Companies

To add a new company logo:

1. Add the logo file to this directory
2. Update the `companies` object in `multi-tenant-server.js`
3. Add the `logoUrl` field pointing to your new logo
4. Restart the backend server

## Example Company Configuration

```javascript
newCompany: {
    name: 'Company Name',
    primaryColor: '#colorcode',
    users: [],
    news: [],
    settings: {
        notifications: true,
        autoApproval: false
    },
    credentials: {
        username: 'username',
        password: 'password'
    },
    logoUrl: 'path/to/your/logo.svg' // or base64 data
}
```
