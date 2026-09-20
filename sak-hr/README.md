SAK HR is a standalone HR application extracted from the SAK ERP suite.

## Getting Started

1. Copy environment variables:

	- Duplicate .env.example as .env.local
	- Update NEXT_PUBLIC_API_BASE_URL
	- Add DATABASE_URL for the local Docker database

2. Start the local database (Docker):

	docker compose up -d

3. Install dependencies:

	pnpm install

4. Run the development server:

	pnpm dev

## Database & Prisma

1. Approve Prisma build scripts (required once):

	pnpm approve-builds

2. Generate Prisma client:

	pnpm prisma generate

3. Create the initial migration:

	pnpm prisma migrate dev --name init

## Build

pnpm build

## Notes

- HR pages and components will be migrated from the ERP app into src/app.
- API access is centralized in src/lib/api-client.ts.
