# Your Study Companion — Mobile App

React Native + Expo app for iOS and Android.

## Setup

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Fill in your Supabase and API values

# Start development
npx expo start

# Scan QR code with Expo Go app on your phone
```

## Environment Variables

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_API_BASE_URL=https://your-backend.vercel.app
```

## Build for Production

```bash
# Install EAS CLI
npm install -g eas-cli
eas login

# Build for both platforms
eas build --platform all

# Or individually
eas build --platform ios
eas build --platform android
```

## Deploy to Stores

```bash
# Submit to App Store + Google Play
eas submit --platform all
```
