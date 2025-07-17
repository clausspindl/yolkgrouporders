# Google Maps API Setup

## Required Setup

To use the interactive Google Maps feature, you need to set up a Google Maps API key:

### 1. Get a Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Maps JavaScript API
   - Places API
4. Create credentials (API Key)
5. Restrict the API key to your domain for security

### 2. Add the API Key to Your Project

Create a `.env.local` file in your project root and add:

```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
```

### 3. Security Notes

- Never commit your API key to version control
- Use domain restrictions in Google Cloud Console
- Monitor API usage to avoid unexpected charges

### 4. Fallback Behavior

If no API key is provided, the app will show a fallback venue selection interface instead of the interactive map.

## Features

- Interactive Google Maps with YOLK branding
- Custom YOLK YES pins for venue locations
- Live address search with autocomplete
- Automatic closest venue selection
- Fallback venue list if map fails to load 