content = 'DATABASE_URL="file:./dev.db"\nJWT_SECRET="supersecret"\nPORT=4000'
with open('backend/.env', 'w', encoding='utf-8') as f:
    f.write(content)
print("Written .env")
