# Local Development Setup

This guide explains how to set up and run the DOLE-TUPAD-VALIDATOR project in a local development environment.

## Prerequisites

- Node.js (version 14 or higher)
- PostgreSQL database
- npm or yarn package manager

## Environment Configuration

### Client Environment (client/.env)

The client is configured to run on `http://localhost:5175` and connect to the server at `http://localhost:4000`.

```env
VITE_CLIENT_URL=http://localhost:5175
VITE_API_URL=http://localhost:4000
```

### Server Environment (server/.env)

The server is configured to run on `http://localhost:4000` in development mode.

```env
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:5175
DATABASE_URL=postgresql://tupad_validator_user:dMZOpIrBGFdk46MYYyJrJi2EQ6XL6tui@dpg-d2m251buibrs73folvrg-a/tupad_validator
JWT_SECRET=supersecret_change_me
JWT_EXPIRES_IN=7d
```

## Database Configuration

The project is configured to use individual PostgreSQL environment variables for local development:

```env
PGHOST=localhost
PGPORT=5432
PGDATABASE=tupad_validator
PGUSER=postgres
PGPASSWORD=121693
```

These variables are used in development mode. In production, the application will use the `DATABASE_URL` with SSL enabled.

To use a local PostgreSQL database:
1. Install PostgreSQL on your local machine
2. Ensure the credentials in the `.env` file match your local PostgreSQL setup
3. Create the `tupad_validator` database manually or using a database tool
4. The application will automatically connect to your local database in development mode

In development mode, SSL is disabled for database connections. In production, SSL is enabled.

## Running the Application

To start both the client and server in development mode:

```bash
npm run dev
```

This command uses `concurrently` to run both:
- Server: `npm run server` (runs on port 4000 with nodemon for hot reloading)
- Client: `npm run client` (runs on port 5175 with Vite for hot reloading)

### Running Separately

To run only the server:
```bash
npm run server
```

To run only the client:
```bash
npm run client
```

## API Configuration

The client uses different API URL configurations depending on the environment:

- In development: Uses relative URLs (e.g., `/api/users`) which are proxied to `http://localhost:4000` via Vite's proxy feature
- In production: Uses the absolute URL specified in `VITE_API_URL` environment variable

This approach allows the client to work seamlessly in both development and production environments.

## API Proxy Configuration

The Vite development server is configured to proxy API requests to the backend server:

- Requests to `/api/*` are proxied to `http://localhost:4000`

This allows the client to make requests to the relative path `/api/endpoint` instead of the full URL.

## CORS Configuration

The server is configured to accept requests from `http://localhost:5175` in development mode.

## Development Scripts

- `npm run dev` - Start both client and server in development mode
- `npm run server` - Start only the server in development mode with nodemon
- `npm run client` - Start only the client in development mode with Vite
- `npm run build` - Build the client for production
- `npm run seed` - Run the database seed script

## Notes

1. The application uses JWT for authentication. The secret is configured in the server environment variables.
2. The database connection automatically disables SSL in development mode.
3. Make sure to update the `DATABASE_URL` in `server/.env` if you want to use a local database instead of the remote one.