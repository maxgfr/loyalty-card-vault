# PWA Icons

This directory should contain the following PWA icons:

- `icon-192.png` - 192x192 icon
- `icon-512.png` - 512x512 icon
- `maskable-icon-192.png` - 192x192 maskable icon
- `maskable-icon-512.png` - 512x512 maskable icon

## Generating Icons

You can generate these icons from a square SVG or PNG using tools like:

1. **PWA Asset Generator**: https://github.com/elegantapp/pwa-asset-generator
   ```bash
   npx pwa-asset-generator logo.svg ./public/icons
   ```

2. **favicon.io**: https://favicon.io/
   Upload your logo and download the generated icons

3. **Figma/Canva**: Design your icons and export at the required sizes

## Icon Guidelines

- Use a simple, recognizable design
- Ensure the icon works at small sizes
- For maskable icons, keep important content in the "safe zone" (80% of the canvas)
- Use solid backgrounds for better visibility
