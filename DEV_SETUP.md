# DOLE-TUPAD-VALIDATOR - Local Development Setup

## Prerequisites

- **Node.js** (version 16 or higher)
- **PostgreSQL** (version 12 or higher)
- **npm** (comes with Node.js)

## Quick Start

1. **Clone and Install Dependencies**
   ```bash
   git clone <repository-url>
   cd DOLE-TUPAD-VALIDATOR
   npm run install:all
   ```

2. **Database Setup**
   
   The project uses your existing `postgres` database with the existing `users` and `uploaded_beneficiaries` tables.
   
   No additional database creation is needed - the application will connect to your existing setup.

3. **Environment Configuration**
   
   The project is pre-configured for local development. Check these files:
   - `server/.env` - Server configuration
   - `client/.env` - Client configuration

4. **Start Development Servers**
   ```bash
   npm run dev
   ```
   
   This starts both client (port 5173) and server (port 4000) concurrently.

## Development URLs

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:4000
- **Health Check**: http://localhost:4000/health
- **Dev Info**: http://localhost:4000/dev/info

## Available Scripts

### Primary Commands
- `npm run dev` - Start both client and server in development mode
- `npm run dev:client` - Start only the client
- `npm run dev:server` - Start only the server

### Database Commands
- `npm run seed:admin` - Create default admin user
- `npm run db:reset` - Reset database tables
- `npm run test:health` - Check server health

### Utility Commands
- `npm run clean` - Clean node_modules and build files
- `npm run lint:fix` - Fix ESLint issues
- `npm run install:all` - Install all dependencies

## Development Features

### Enhanced Logging
- Request/response logging in development
- Database connection monitoring
- Detailed error messages with stack traces

### Hot Reloading
- **Client**: Vite provides instant hot module replacement
- **Server**: Nodemon restarts server on file changes
- **Database**: Automatic table creation and indexing

### API Proxy
Vite proxy configuration handles API routing:
- `/api/*` → `http://localhost:4000`
- `/auth/*` → `http://localhost:4000`
- `/uploads/*` → `http://localhost:4000`

### Error Handling
- Automatic JWT token cleanup on 401 errors
- Graceful database connection handling
- Development-specific error displays

## Default Credentials

After running the seed command, use these credentials:
- **Username**: `admin`
- **Password**: `admin123`
- **Role**: Admin

## Database Configuration

### Local PostgreSQL Settings
```env
PGHOST=localhost
PGPORT=5432
PGDATABASE=postgres
PGUSER=postgres
PGPASSWORD=121693
```

### Connection Pool (Development)
- Min connections: 2
- Max connections: 10
- Idle timeout: 30 seconds

## File Upload Configuration

- **Upload Directory**: `server/uploads/`
- **Max File Size**: 10MB
- **Supported Formats**: .xlsx, .xls

## Development Debugging

### Enable Verbose Logging
Set in `server/.env`:
```env
DEBUG=true
VERBOSE_LOGGING=true
```

### Enable Client Logging
Set in `client/.env`:
```env
VITE_ENABLE_LOGGING=true
```

### Database Debugging
The database module includes detailed logging for:
- Connection events
- Query execution
- Pool management
- Error tracking

## Common Issues

### Port Conflicts
If ports 4000 or 5173 are busy:
1. Change `PORT` in `server/.env`
2. Update proxy configuration in `client/vite.config.js`
3. Update `FRONTEND_URL` in `server/.env`

### Database Connection Issues
1. Ensure PostgreSQL is running
2. Verify credentials in `server/.env`
3. Check database exists: `psql -U postgres -l`

### Module Not Found Errors
1. Run `npm run install:all`
2. Delete `node_modules` and reinstall if needed

## Project Structure

```
DOLE-TUPAD-VALIDATOR/
├── client/                 # React frontend
│   ├── src/
│   │   ├── api/           # API configuration
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Route components
│   │   ├── layouts/       # Layout components
│   │   └── hooks/         # Custom hooks
│   ├── .env               # Client environment
│   └── vite.config.js     # Vite configuration
├── server/                 # Node.js backend
│   ├── controllers/       # Route handlers
│   ├── middleware/        # Express middleware
│   ├── models/           # Database models
│   ├── routes/           # API routes
│   ├── uploads/          # File uploads
│   ├── .env              # Server environment
│   ├── db.js             # Database configuration
│   └── index.js          # Server entry point
├── package.json           # Root package file
└── DEV_SETUP.md          # This file
```

## Next Steps

1. **Start Development**: `npm run dev`
2. **Access Application**: http://localhost:5173
3. **Login**: Use your existing user credentials from the `users` table
4. **Begin Development**: Make changes and see hot reloading in action!

**Note**: The application connects to your existing `postgres` database and uses the existing `users` and `uploaded_beneficiaries` tables.

## Production Deployment

For production deployment:
1. Build client: `npm run build`
2. Set production environment variables
3. Use `npm start` to run the server

The development setup is optimized for local development with enhanced debugging, logging, and developer experience features.