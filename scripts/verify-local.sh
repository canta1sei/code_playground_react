#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status.

# --- Frontend Build Verification ---
echo "--- Running Frontend Build ---"
# Navigate to frontend, build, then return to original directory
(cd ../frontend && npm run build)
echo "Frontend build completed successfully."


echo ""
# --- Backend API Verification ---
echo "--- Testing API Endpoint (GET /songs) ---"
# Curl the dev API endpoint. The -f flag makes curl fail with an error code if the server returns an error.
curl -sfS https://mqmolhn6kg.execute-api.ap-northeast-1.amazonaws.com/songs
echo "\nAPI endpoint test completed successfully."


echo ""
echo "✅ Local verification successful!"
