import requests

url = "http://localhost:8000/auth/register"
payload = {
    "email": "test_debug_6@example.com",
    "password": "password123"
}

try:
    response = requests.post(url, json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.text}")
except Exception as e:
    print(f"Request failed: {e}")
