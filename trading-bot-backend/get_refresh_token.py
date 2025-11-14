import requests
import json

# Your existing access token
access_token = "PASTE_YOUR_CURRENT_ACCESS_TOKEN_HERE"
api_key = "ac6664bf-6641-4"  # Your API key

# Call Upstox to get refresh token
url = "https://api.upstox.com/v2/user/profile"

headers = {
    "Authorization": f"Bearer {access_token}",
    "Accept": "application/json"
}

response = requests.get(url, headers=headers)

print("Status Code:", response.status_code)
print("\nResponse:")
print(json.dumps(response.json(), indent=2))

# Also try this to get refresh token
print("\n\n📋 TO GET REFRESH TOKEN:")
print("=" * 70)
print("Go to: https://api.upstox.com/")
print("Login with your Upstox account")
print("Look in browser DevTools (F12) → Network tab")
print("Find any API response that contains 'refresh_token'")
print("Copy the refresh_token value")
print("=" * 70)
