#!/bin/bash

echo "🚀 Setting up Darul Irshad React Native Mobile App"
echo "=================================================="

# Navigate to mobile app directory
cd "$(dirname "$0")"

# Install dependencies
echo "📦 Installing React Native dependencies..."
npm install

# Install React Native CLI globally (if not already installed)
echo "🔧 Checking React Native CLI..."
if ! command -v react-native &> /dev/null; then
    echo "Installing React Native CLI globally..."
    npm install -g react-native-cli
fi

# Create android local.properties file for SDK path
echo "⚙️  Setting up Android configuration..."
ANDROID_HOME=${ANDROID_HOME:-"$HOME/Android/Sdk"}
echo "sdk.dir=$ANDROID_HOME" > android/local.properties

# Make gradlew executable
chmod +x android/gradlew

echo ""
echo "✅ Setup completed successfully!"
echo ""
echo "🔥 To run the app:"
echo "   1. Start Metro bundler:    npm start"
echo "   2. Run on Android:         npm run android"
echo "   3. Build APK:              npm run build"
echo ""
echo "📱 Make sure you have:"
echo "   - Android Studio installed"
echo "   - Android SDK 34 installed"
echo "   - USB Debugging enabled on your device"
echo ""
echo "🌐 Backend API URL: http://10.0.2.2:5000"
echo "   (Points to localhost:5000 from Android emulator)"
echo ""