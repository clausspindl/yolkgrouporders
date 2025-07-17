# Real-time Group Order Setup Guide

This guide explains how to set up real-time functionality for group orders using Supabase.

## Prerequisites

1. A Supabase project (free tier works fine)
2. Node.js and pnpm installed

## Setup Steps

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note down your project URL and anon key

### 2. Set Environment Variables

Create a `.env.local` file in your project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Set Up Database Schema

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `supabase-schema.sql`
4. Run the SQL commands (this will create the tables and enable real-time)

### 4. Enable Real-time

1. In your Supabase dashboard, go to Database > Replication
2. Make sure "Realtime" is enabled for both `group_orders` and `group_order_items` tables

### 5. Test the Setup

1. Start your development server: `pnpm dev`
2. Create a group order
3. Share the generated link with another browser/device
4. Add items from both devices - you should see real-time updates

## How It Works

### Real-time Updates

- When a user adds an item to a group order, it's saved to Supabase
- All connected clients receive real-time updates via WebSocket
- The dashboard automatically updates to show new items

### Fallback System

- If Supabase is unavailable, the system falls back to localStorage
- This ensures the app works even without internet connection
- Data is synchronized when connection is restored

### Database Schema

#### group_orders table
- Stores group order metadata (budget, team size, venue, etc.)
- Primary key is the order ID (generated client-side)

#### group_order_items table
- Stores individual items added by team members
- Links to group_orders via foreign key
- Includes product details for offline functionality

## Features

### Real-time Indicators
- Green pulsing dot shows when real-time is connected
- Gray dot shows when connecting or disconnected

### Automatic Sync
- Items added by team members appear instantly
- No need to refresh the page
- Works across multiple devices/browsers

### Offline Support
- Falls back to localStorage when Supabase is unavailable
- Continues to work without internet connection
- Syncs when connection is restored

## Troubleshooting

### Real-time not working?
1. Check your environment variables
2. Verify the database schema is set up correctly
3. Check browser console for errors
4. Ensure real-time is enabled in Supabase dashboard

### Items not appearing?
1. Check if the group order ID is correct
2. Verify the subscription is working
3. Check browser console for Supabase errors

### Performance issues?
1. The system uses efficient indexes on the database
2. Real-time updates are batched for better performance
3. Consider upgrading Supabase plan for higher limits

## Security

- Row Level Security (RLS) is enabled
- Public read/write access for demo purposes
- In production, implement proper authentication
- Consider adding user authentication and authorization
- JWT secret is automatically managed by Supabase

## Production Considerations

1. **Authentication**: Add user authentication before going live
2. **Rate Limiting**: Implement rate limiting for API calls
3. **Error Handling**: Add more robust error handling
4. **Monitoring**: Set up monitoring for real-time connections
5. **Backup**: Regular database backups
6. **Scaling**: Consider Supabase Pro for higher limits 