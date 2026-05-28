# Supabase and Circle Setup

## Local development without Supabase

If you do not have Supabase configured yet, the local app can still run.
The code now supports a fallback mode when Supabase credentials are missing.

### Required environment variables for Supabase (optional)

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

If these values are not present, the app will use fallback no-op Supabase behavior and local in-memory storage for server-side transactions.

## Database Configuration (Optional)

The app also supports direct database configuration for advanced setups:

- `DATABASE_URL`
- `DATABASE_HOST`
- `DATABASE_PORT`
- `DATABASE_NAME`
- `DATABASE_USER`
- `DATABASE_PASSWORD`

These are optional and only needed if you want to bypass Supabase and use a direct database connection.

## Circle stable FX configuration

The app also supports an optional Circle stable FX integration.

### Optional Circle env vars

- `CIRCLE_API_KEY`
- `CIRCLE_WALLET_ID`
- `CIRCLE_DESTINATION_ADDRESS`
- `CIRCLE_ENTITY_SECRET`
- `CIRCLE_DESTINATION_BLOCKCHAIN`
- `CIRCLE_STABLE_FX_ENABLED=true`

### New helper endpoint

- `GET /circle/stable-fx?from=USD&to=EUR&amount=100`

This endpoint returns a Circle stable FX quote when `CIRCLE_STABLE_FX_ENABLED` is enabled.

## ARC Configuration (Optional)

For webhook validation and ARC integration:

- `ARC_ADDRESS` - ARC contract address
- `ARC_WEBHOOK_SECRET` - Secret for validating webhooks

## Notes

- Circle is used only for treasury/FX quote support, not for swap execution.
- Swaps still settle through Arc testnet.
- Local dev should no longer stall waiting on Supabase if credentials are missing.
- All database and ARC variables are now optional for local development.
