#!/bin/bash

# Fix remaining Clerk references in the codebase

echo "Fixing Clerk references..."

# Fix Wallets component
sed -i '' 's/const { userData } = useAuth();/const { userData, merchantData } = useAuth();/g' src/components/wallets/Wallets.tsx
sed -i '' 's/userData\.publicMetadata/merchantData/g' src/components/wallets/Wallets.tsx
sed -i '' 's/userData\.fullName/userData?.name/g' src/components/wallets/Wallets.tsx
sed -i '' 's/userData\.firstName/userData?.name/g' src/components/wallets/Wallets.tsx
sed -i '' 's/userData\.lastName/""/g' src/components/wallets/Wallets.tsx
sed -i '' 's/userData\.username/userData?.name/g' src/components/wallets/Wallets.tsx
sed -i '' 's/userData\.emailAddresses\[0\]\.emailAddress/userData?.email/g' src/components/wallets/Wallets.tsx
sed -i '' 's/verified_by_user/verified_by_userData/g' src/components/wallets/Wallets.tsx

# Fix VirtualTerminals component
sed -i '' 's/metadata\./merchantData\./g' src/components/terminals/VirtualTerminals.tsx
sed -i '' 's/user\./userData\./g' src/components/terminals/VirtualTerminals.tsx

# Fix any remaining user references
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's/}, \[user\]/}, [userData]/g'
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's/if (!user)/if (!userData)/g'

echo "Fixed Clerk references"
