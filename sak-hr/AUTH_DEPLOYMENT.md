# Authentication Deployment Instructions

## Step 1: Apply Database Migration

SSH into the production server and run:

```bash
cd /var/www/sak-hr
psql -h localhost -U sak_hr -d sak_hr -f add-user-authentication.sql
```

This will:
- Create the User table
- Add demo users with credentials:
  - Admin: admin@sakhr.com / admin123
  - Manager: manager@sakhr.com / manager123
  - Employee: employee@sakhr.com / employee123

## Step 2: Add Environment Variables

Add to production .env.local:

```bash
NEXTAUTH_SECRET=D64f/ipsqRn2+QfuQL6Nee6Xf7NTq2Cu/flrSYBMW04=
NEXTAUTH_URL=http://72.62.192.228:8060
```

## Step 3: Rebuild and Deploy

```bash
cd /var/www/sak-hr
git pull origin main
pnpm install
pnpm run build
pm2 restart sak-hr
```

## Step 4: Test Authentication

1. Visit http://72.62.192.228:8060/auth/login
2. Login with any demo credentials
3. Verify redirect to /performance
4. Check user menu shows correct role
5. Test sign out

## Demo Credentials

- **Admin**: admin@sakhr.com / admin123
- **Manager**: manager@sakhr.com / manager123
- **Employee**: employee@sakhr.com / employee123

## Troubleshooting

If authentication fails:
1. Check NEXTAUTH_SECRET is set in .env.local
2. Verify User table exists: `psql -h localhost -U sak_hr -d sak_hr -c "SELECT * FROM \"User\""`
3. Check Next.js logs: `pm2 logs sak-hr`
4. Verify NEXTAUTH_URL matches production URL
