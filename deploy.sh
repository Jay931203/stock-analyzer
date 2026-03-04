#!/bin/bash
# Build and deploy to Vercel
set -e

echo "=== Building Expo web ==="
cd mobile
npx expo export --platform web
cd ..

echo "=== Copying to public/ ==="
rm -rf public
cp -r mobile/dist public

echo "=== Ready for Vercel deploy ==="
echo "Run: vercel --prod"
echo "Or push to GitHub and connect to Vercel dashboard."
