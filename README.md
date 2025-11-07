# Forex Master Pro

Professional Forex Trading Platform with TradingView-quality charts, MT5 real-time data integration, Pine Script editor, and custom alert system.

## Features

- **TradingView Advanced Charts** - Free tier with branding
- **MT5 Real-time Data Integration** - Live market data with auto-reconnection
- **Pine Script Editor** - Monaco Editor based code editor
- **Custom Alert System** - Webhook integration with dynamic URLs
- **Multi-timeframe Support** - 5M, 15M, 1H, 4H, D1, W1
- **Secure Admin Authentication** - JWT-based authentication
- **User Management** - Super Admin can add/edit/delete users
- **Real-time Updates** - WebSocket with Redis Pub/Sub for scaling

## Technology Stack

### Frontend
- React 18 + TypeScript
- Tailwind CSS (Pitch-black + Premium-orange theme)
- TradingView Advanced Charts Widget
- Monaco Editor
- Zustand (State Management)
- Socket.io Client
- Vite

### Backend
- FastAPI (Python) with Gunicorn workers
- PostgreSQL (Cloud - Supabase/Neon)
- Redis (Cache/Broker)
- Celery (Task Queue)
- MetaTrader5 Python Library
- JWT Authentication
- SQLAlchemy ORM

## Setup Instructions

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL (Cloud or Local)
- Redis
- MT5 Terminal installed

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create `.env` file (copy from `.env.example`):
```env
DATABASE_URL=postgresql://user:password@host:port/database
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=your-secret-key-here
MT5_LOGIN=308646228
MT5_PASSWORD=Fast@@2801@@!!!
MT5_SERVER=XMGlobal-MT5 6
ENVIRONMENT=development
DEBUG=True
BACKEND_CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

5. Run database migrations (if using Alembic):
```bash
alembic upgrade head
```

6. Start backend server:
```bash
# Development
uvicorn app.main:app --reload

# Production
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_WS_URL=http://localhost:8000
```

4. Start development server:
```bash
npm run dev
```

### Docker Setup

1. Create `.env` file in root directory with all required variables

2. Run docker-compose:
```bash
docker-compose up -d
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - Login with form data
- `POST /api/v1/auth/login-json` - Login with JSON body

### Users (Super Admin only)
- `GET /api/v1/users/me` - Get current user
- `GET /api/v1/users/` - Get all users
- `POST /api/v1/users/` - Create user
- `PUT /api/v1/users/{user_id}` - Update user
- `DELETE /api/v1/users/{user_id}` - Delete user

### Alerts
- `GET /api/v1/alerts/` - Get all alerts for current user
- `POST /api/v1/alerts/` - Create alert with custom webhook URL
- `PUT /api/v1/alerts/{alert_id}` - Update alert
- `DELETE /api/v1/alerts/{alert_id}` - Delete alert

### Charts
- `GET /api/v1/charts/symbols` - Get available symbols
- `GET /api/v1/charts/history/{symbol}` - Get historical data

### WebSocket
- `WS /ws` - WebSocket endpoint for real-time data

## Security Features

- JWT Authentication
- Password hashing (bcrypt)
- Input validation (Pydantic)
- SQL Injection prevention (SQLAlchemy ORM)
- CORS configuration
- Rate limiting
- Environment variables for secrets

## MT5 Integration

The platform connects to MT5 with:
- Heartbeat mechanism (5-10 second checks)
- Auto-reconnection with exponential backoff
- Real-time tick data streaming
- Historical data fetching

## Alert System

- Custom webhook URLs per alert
- Multi-timeframe monitoring
- Condition-based triggers
- Background processing with Celery

## License

Proprietary - All rights reserved

