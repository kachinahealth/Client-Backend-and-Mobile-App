# KachinaHealth Company Logos

This directory contains the company logos and branding assets used in the KachinaHealth client portal dashboard.

## Current Assets

### Logos
- **`logo.png`** - Main KachinaHealth logo (PNG format)
- **`cerevasc-logo.png`** - CereVasc company logo
- **`medtronic-logo.png`** - Medtronic company logo
- **`medtronic-logo.svg`** - Medtronic logo (vector format)

### Usage in Application
- **Main Logo**: Displayed in dashboard header (`logo.png`)
- **Company Logo**: Dynamically loaded based on company context (`cerevasc-logo.png`, etc.)
- **Fallback**: PNG versions available for better browser compatibility

## Logo Specifications

- **Format**: PNG for raster images, SVG for vector graphics
- **Dimensions**: 280x80 pixels (7:2 aspect ratio) for main logos
- **Colors**: Professional medical/healthcare branding
- **Style**: Clean, modern, healthcare-appropriate
- **Background**: Transparent or white background preferred

## How to Update Logos

### Replace Existing Logos
1. Replace the file with your new logo image
2. Keep the same filename to maintain compatibility
3. Ensure consistent dimensions (280x80 recommended)
4. Clear browser cache to see changes immediately

### Add New Company Logos
1. Add the logo file to this directory
2. Use naming convention: `{company}-logo.{ext}`
3. Update the dashboard settings to reference the new logo
4. Test logo loading in the dashboard

## File Locations

- **Logo Assets**: `admin-dashboard/public/logos/`
- **Dashboard Usage**: Referenced in `clienthome.html`
- **Settings Configuration**: Configurable via Settings tab

## Technical Notes

- **Loading**: Logos are loaded dynamically based on company context
- **Fallback**: PNG versions ensure compatibility across browsers
- **Caching**: Logos are cached by browsers for performance
- **CDN**: Consider using a CDN for production deployments

## Best Practices

1. **Optimize Images**: Compress logos for web (under 100KB each)
2. **Consistent Branding**: Maintain consistent colors and style
3. **Accessibility**: Ensure sufficient contrast and readability
4. **Responsive**: Logos scale appropriately on different screen sizes

## Troubleshooting

### Logo Not Loading
- Check file exists in correct directory
- Verify filename matches references in code
- Clear browser cache (Ctrl+F5)
- Check browser console for 404 errors

### Logo Appears Distorted
- Verify correct aspect ratio (7:2 recommended)
- Check image dimensions match container size
- Ensure transparent background if needed

### Company Logo Not Showing
- Verify company name matches logo filename
- Check Settings tab configuration
- Ensure logo file permissions allow reading
