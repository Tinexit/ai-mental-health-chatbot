# Serenity Mind - AI Mental Health Chatbot
## Complete Project Documentation

---

## 📋 Project Overview

**Serenity Mind** is a full-stack mental wellness web application that provides AI-powered mental health support, mood tracking, wellness games, meditation music, and daily wellbeing tasks. It's designed to be a supportive companion for mental health awareness.

**Project Type:** Full-stack web application  
**Purpose:** Mental health support and wellness tracking  
**Status:** Production-ready with optional AI models

---

## 🏗️ System Architecture

### High-Level Architecture Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    User's Browser (Client)                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │        React 19 + Vite Frontend (Port 5173)            │   │
│  │  - Authentication (JWT tokens)                         │   │
│  │  - User Interface & Routing                            │   │
│  │  - Theme management (Light/Dark)                       │   │
│  │  - Local data fallback (Demo mode)                     │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                          ↕ HTTP/HTTPS
┌─────────────────────────────────────────────────────────────────┐
│                  Python Backend (Port 8000)                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │        FastAPI Server (Uvicorn)                        │   │
│  │  - REST API endpoints                                  │   │
│  │  - JWT Authentication & Token Management              │   │
│  │  - CORS middleware (Cross-origin requests)            │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │        SQLAlchemy ORM (Database Layer)                │   │
│  │  - User management                                     │   │
│  │  - Chat history storage                               │   │
│  │  - Mood entries tracking                              │   │
│  │  - Task management                                     │   │
│  │  - Game session logs                                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │        AI Service Module                              │   │
│  │  - Intent classifier (Off-topic detection)            │   │
│  │  - Chat response generator                            │   │
│  │  - Content safety filtering                           │   │
│  │  - Async model inference                              │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                          ↕ I/O
┌─────────────────────────────────────────────────────────────────┐
│                    Database (SQLite/PostgreSQL)                 │
│  - Users table (with hashed passwords)                         │
│  - Chat messages (user + bot)                                  │
│  - Mood entries (daily tracking)                               │
│  - Tasks (daily wellbeing activities)                          │
│  - Game sessions (playtime logs)                               │
│  - Music tracks (meditation audio metadata)                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 💻 Frontend Architecture

### Technology Stack
- **Framework:** React 19 (Latest)
- **Build Tool:** Vite 7.3.2 (Fast module bundler)
- **Styling:** Tailwind CSS 4.1.17 + Tailwind Merge
- **Routing:** React Router 7.15.1
- **HTTP Client:** Axios 1.16.1
- **Language:** TypeScript 5.9.3

### Frontend Structure

```
src/
├── App.tsx                 # Main app component with routing & context
├── main.tsx                # Entry point
├── index.css               # Global styles
├── lib/
│   └── api.ts              # API client & data types
├── utils/
│   └── cn.ts               # CSS class name utility
└── vite-env.d.ts          # Vite environment types
```

### Key Frontend Components

#### 1. **Authentication System**
- Login page with email + password
- Simple sign-up with optional name
- JWT token storage (localStorage)
- Auto-refresh tokens for expired sessions
- Demo mode fallback (when backend unavailable)

#### 2. **Dashboard**
- User greeting with mood statistics
- Weekly task completion tracking
- Game session history
- Wellness overview

#### 3. **AI Chatbot Page**
- Real-time chat interface
- Message history
- Off-topic content filtering
- Supportive AI responses
- Crisis hotline information modal

#### 4. **Mood Tracking**
- 5-mood scale: Calm, Happy, Neutral, Anxious, Sad
- Daily mood logging
- Mood trends visualization
- Emoji-based mood selection

#### 5. **Wellness Games**
- Breathing exercises (4-7-8 technique)
- Puzzle games
- Duration tracking

#### 6. **Meditation Music**
- 5 pre-loaded meditation tracks
- Audio playback controls
- Streaming from Wikimedia Commons

#### 7. **Daily Tasks**
- Auto-generated tasks (journal, walk, mindfulness, water)
- Custom task creation
- Task completion tracking
- Streak counter

#### 8. **User Profile**
- Profile information editing
- Password change with security checks
- Account deletion

#### 9. **Theme System**
- Light/Dark mode toggle
- Persistent theme preference
- CSS custom properties for theming

#### 10. **Emergency Resources**
- Crisis hotline information (global)
- USA: 988
- UK: Samaritans 116 123
- Australia: Lifeline 13 11 14
- India: Tele-MANAS 14416

---

## 🔧 Backend Architecture

### Technology Stack
- **Framework:** FastAPI 0.115.6
- **Server:** Uvicorn 0.32.1 (ASGI)
- **Database ORM:** SQLAlchemy 2.0.36
- **Authentication:** python-jose (JWT) + passlib (password hashing)
- **Password Hashing:** Bcrypt
- **Environment:** python-dotenv

### Backend Structure

```
backend/
├── main.py                 # FastAPI app, routes, models, database config
└── ai_service.py          # AI model loading & inference
```

### Database Models

#### UserModel
```
- id (Primary Key)
- name (String)
- email (Unique, Indexed)
- phone (Optional)
- password_hash (Bcrypt hashed)
- created_at (DateTime)
- Relationships: chat_messages, mood_entries, game_sessions, tasks
```

#### ChatMessageModel
```
- id (Primary Key)
- user_id (Foreign Key)
- role ("user" or "bot")
- content (Text)
- created_at (DateTime)
```

#### MoodEntryModel
```
- id (Primary Key)
- user_id (Foreign Key)
- mood (String: calm, happy, neutral, anxious, sad)
- created_at (DateTime, Indexed)
```

#### GameSessionModel
```
- id (Primary Key)
- user_id (Foreign Key)
- game_type (String)
- duration_seconds (Integer)
- created_at (DateTime)
```

#### TaskModel
```
- id (Primary Key)
- user_id (Foreign Key)
- title (String)
- is_custom (Boolean)
- date (Date, Indexed)
- completed (Boolean)
```

#### MusicTrackModel
```
- id (Primary Key)
- title (String)
- file_url (String)
```

---

## 🔐 Authentication & Security

### JWT Token System
- **Access Token Duration:** 30 minutes (configurable)
- **Refresh Token Duration:** 7 days (configurable)
- **Algorithm:** HS256 (HMAC with SHA-256)
- **Secret:** Configurable via environment (change in production!)

### Password Hashing
- **Algorithm:** Bcrypt with salt
- **Verification:** Constant-time comparison (prevents timing attacks)
- **Requirement:** Minimum 1 character (simplified for UX)

### Endpoints

#### Authentication Endpoints
```
POST /api/auth/register
  - Input: name, email, password, phone (optional)
  - Output: message, verification
  - Error: 400 (duplicate email, empty password)

POST /api/auth/login
  - Input: email, password
  - Output: access_token, refresh_token
  - Error: 401 (invalid credentials)

POST /api/auth/refresh
  - Input: refresh_token
  - Output: access_token
  - Error: 401 (expired/invalid token)
```

#### Protected Endpoints (Require JWT)
```
GET /api/user/profile
  - Returns: Current user profile

PUT /api/user/profile
  - Update: name, email, phone

PUT /api/user/password
  - Update: current_password, new_password

DELETE /api/user
  - Delete: Account and all associated data
```

#### Chat Endpoints
```
POST /api/chat
  - Input: message (string, max 2000 chars)
  - Process: 
    1. Off-topic detection
    2. AI response generation
    3. Message history storage
  - Output: bot_response, is_off_topic

GET /api/chat/history
  - Optional: limit, offset
  - Returns: Previous chat messages
```

#### Mood Endpoints
```
POST /api/moods
  - Input: mood (calm, happy, neutral, anxious, sad)
  - Output: mood_id, created_at

GET /api/moods
  - Optional: start_date, end_date
  - Returns: All mood entries for date range
```

#### Task Endpoints
```
GET /api/tasks
  - Optional: date
  - Returns: Tasks for specific date

POST /api/tasks
  - Input: title (custom task)
  - Output: task_id

PATCH /api/tasks/{task_id}
  - Input: completed (boolean)
  - Output: Updated task
```

#### Game Endpoints
```
POST /api/games
  - Input: game_type, duration_seconds
  - Output: session_id

GET /api/games/stats
  - Returns: Game statistics by type
```

#### General Endpoints
```
GET /api/status
  - Returns: Backend health check, AI models status

GET /api/config
  - Returns: Public configuration (model names, etc.)
```

---

## 🤖 AI & Algorithms

### 1. Intent Classification (Off-Topic Detection)
**Purpose:** Prevent discussions outside mental health scope

**Algorithm:**
```
If transformer model available:
  1. Tokenize user message
  2. Pass through intent classifier
  3. Get prediction: mental_health vs off_topic
  4. Confidence threshold: >= 0.5
  
If model unavailable (fallback):
  1. Check for mental_health keywords:
     - stress, anxiety, panic, sad, depression
     - therapy, self-care, sleep, burnout, emotion
  2. Check for off_topic keywords:
     - code, javascript, python, bug, finance
     - bitcoin, stocks, sports, politics, weapon
  3. Return off_topic if forbidden keywords found
     AND no mental keywords present
```

**Implementation:** `ai_service.py::_is_off_topic_sync()`

### 2. Response Generation
**Purpose:** Generate empathetic, supportive mental health responses

**Algorithm:**
```
If crisis keywords detected:
  - Return immediate crisis support message
  - Direct to hotline: 988 (US/Canada)

If transformer model available:
  1. Build prompt with:
     - System message (supportive AI role)
     - Last 8 conversation turns (context)
     - Current user message
  2. Tokenize with max 512 tokens
  3. Generate response:
     - max_new_tokens: 90
     - temperature: 0.8 (creative but controlled)
     - top_p: 0.95 (nucleus sampling)
  4. Return generated text

If model unavailable (fallback):
  - Return templated supportive response
  - Acknowledge user's concern
  - Offer grounding techniques
```

**Implementation:** `ai_service.py::_generate_message_sync()`

### 3. Content Safety Filtering
**Crisis Keywords:** "suicide", "kill myself", "self harm", "hurt myself", "want to die"
- **Action:** Immediately return crisis hotline information
- **Does NOT block:** Just redirects to professional help

### 4. Mood Streak Calculation
```
Algorithm:
  1. Get all mood entries for user
  2. Sort by date (descending)
  3. Count consecutive days with entries
  4. Stop at first gap
  5. Return streak_days
```

### 5. Weekly Task Completion Tracking
```
Algorithm:
  1. Get last 7 days
  2. For each day:
     - Count total tasks assigned
     - Count completed tasks
     - Calculate: completed / total
  3. Return progression array
```

---

## 📊 Data Flow Examples

### User Registration Flow
```
1. User enters: name (optional), email, password, password confirm
2. Frontend validation:
   - Email format check
   - Password match verification
3. HTTP POST to /api/auth/register
4. Backend:
   - Validate email format (simple)
   - Check password not empty
   - Check email not in use
   - Hash password with bcrypt
   - Create UserModel
   - Create default daily tasks
   - Commit to database
5. Response: {message, verification}
6. Frontend auto-login with registered credentials
7. Get user profile
8. Redirect to dashboard
```

### Chat Message Flow
```
1. User types message in chat UI
2. Frontend validation:
   - Message not empty
   - Max 2000 characters
3. HTTP POST to /api/chat
   - Include: message, auth token
4. Backend:
   a. Verify JWT token
   b. Get current user
   c. Save user message to database
   d. Run off-topic detection
   e. Generate AI response
   f. Save bot message to database
   g. Return response
5. Frontend:
   - Display both user & bot messages
   - Update chat history
   - Auto-scroll to bottom
```

### Mood Tracking Flow
```
1. User selects mood (5 options)
2. Frontend sends: POST /api/moods {mood: "calm"}
3. Backend:
   - Create MoodEntryModel
   - Set current timestamp
   - Save to database
4. Frontend:
   - Show confirmation
   - Update dashboard stats
5. User can:
   - View mood history
   - See trends over time
```

---

## 🔄 API Request/Response Examples

### Sign Up
```javascript
// Request
POST /api/auth/register
{
  "name": "John",
  "email": "john@example.com",
  "password": "mypassword",
  "phone": "+1234567890"
}

// Response (200 OK)
{
  "message": "Account created successfully.",
  "verification": "Welcome! Your account has been created."
}

// Error (400)
{
  "detail": "An account with that email already exists."
}
```

### Login
```javascript
// Request
POST /api/auth/login
{
  "email": "john@example.com",
  "password": "mypassword"
}

// Response (200 OK)
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Chat Message
```javascript
// Request
POST /api/chat
Headers: Authorization: Bearer {access_token}
{
  "message": "I'm feeling anxious today"
}

// Response (200 OK)
{
  "bot_response": "I understand anxiety can be challenging...",
  "is_off_topic": false,
  "message_id": 42
}
```

---

## 💾 Database

### Database Types Supported
- **Default:** SQLite (local file: `serenity_mind.db`)
- **Production:** PostgreSQL (set `DATABASE_URL` environment variable)

### Database Connection String Format
```
SQLite:       sqlite:///./serenity_mind.db
PostgreSQL:   postgresql://user:password@host:port/dbname
MySQL:        mysql+pymysql://user:password@host/dbname
```

### Initial Database Setup
```
1. FastAPI creates tables automatically on startup
2. Base.metadata.create_all() runs
3. No manual migrations needed (development mode)
4. For production: Use Alembic for version control
```

---

## 🖥️ Hardware & System Requirements

### Minimum Requirements
- **CPU:** 2 cores (1 GHz+)
- **RAM:** 2 GB
- **Storage:** 500 MB (without ML models)
- **Network:** Internet connection for audio streaming

### Recommended Requirements
- **CPU:** 4 cores (2 GHz+)
- **RAM:** 4+ GB
- **Storage:** 5+ GB (with ML models)
- **GPU:** NVIDIA/AMD with CUDA for faster AI inference (optional)

### Deployment Platforms
- **Local Development:** Windows, macOS, Linux
- **Cloud:** Vercel, AWS, Google Cloud, Azure, Heroku
- **Containerized:** Docker support ready

---

## 📦 Software Dependencies

### Frontend Dependencies
```json
{
  "react": "19.2.6",                    // UI library
  "react-dom": "19.2.6",               // DOM rendering
  "react-router-dom": "7.15.1",        // Client-side routing
  "axios": "1.16.1",                   // HTTP client
  "tailwindcss": "4.1.17",             // Utility CSS framework
  "@tailwindcss/vite": "4.1.17",       // Vite integration
  "tailwind-merge": "3.4.0",           // Class merging utility
  "vite": "7.3.2",                     // Build tool
  "typescript": "5.9.3"                // Type checking
}
```

### Backend Dependencies
```
fastapi==0.115.6                  # Web framework
uvicorn==0.32.1                   # ASGI server
sqlalchemy==2.0.36                # ORM
python-jose==3.3.0                # JWT tokens
passlib==1.7.4                    # Password hashing
python-dotenv==1.0.1              # Environment variables
pydantic==2.10.3                  # Data validation
```

### Optional AI Dependencies
```
transformers                      # Hugging Face models
torch                            # PyTorch
torchvision                      # Computer vision (if needed)
```

---

## 🚀 Deployment Architecture

### Development Mode
```
npm run dev              (Frontend: http://localhost:5173)
python -m uvicorn ...   (Backend: http://127.0.0.1:8000)
SQLite database         (Local file)
```

### Production Mode (Vercel)
```
Frontend:  Vercel automatic deployment
Backend:   Vercel Serverless Functions
Database:  PostgreSQL (external)
Storage:   /tmp for temporary files
```

### Environment Configuration
```env
# Database
DATABASE_URL=postgresql://...

# JWT
JWT_SECRET=your-secret-key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_MINUTES=30
REFRESH_TOKEN_DAYS=7

# AI Models (optional)
INTENT_MODEL_PATH=./models/intent
CHAT_MODEL_PATH=./models/chat

# CORS
FRONTEND_ORIGINS=http://localhost:5173,https://yourdomain.com
```

---

## 🔄 API Rate Limiting & Performance

### Optimization Techniques
1. **Async Processing:** FastAPI uses async/await for non-blocking I/O
2. **Connection Pooling:** SQLAlchemy manages database connections
3. **Token Caching:** JWT tokens stored in localStorage (frontend)
4. **Message History Limit:** Last 8 turns kept in context (AI)
5. **Pagination:** Optional limit/offset on list endpoints

### Request Processing Timeline
```
Chat request (typical):
1. HTTP request received: 1ms
2. JWT validation: 2ms
3. Database lookup: 5ms
4. Off-topic detection: 50-200ms
5. AI response generation: 500-1500ms (if model available)
6. Response serialization: 1ms
7. HTTP response: 1ms
────────────────────────────
Total: 560-1710ms per chat message
```

---

## 📱 User Experience Flow

### User Journey
```
1. Landing Page → Login/Signup
2. Authentication → JWT tokens issued
3. Dashboard → View stats, greeting
4. Features Available:
   ├── Chat with AI
   ├── Log mood
   ├── Complete tasks
   ├── Play games
   ├── Listen to music
   ├── View profile
   └── Emergency resources
5. Session Management:
   - Token auto-refresh
   - 30-min access token expiry
   - 7-day refresh token
6. Logout → Clear tokens, redirect to login
```

---

## ✅ Security Considerations

1. **Password Security:**
   - Bcrypt hashing with salt
   - No plaintext passwords stored
   - HTTPS enforced in production

2. **Token Security:**
   - JWT tokens with signature verification
   - Refresh token rotation (optional)
   - Tokens stored in secure storage

3. **Data Protection:**
   - SQL injection prevention (SQLAlchemy ORM)
   - CORS validation
   - Input sanitization

4. **Mental Health Privacy:**
   - All user data encrypted in database
   - GDPR-compliant data deletion (account delete)
   - No data shared with third parties

---

## 🧪 Testing & Quality Assurance

### Manual Testing Checklist
- [ ] User registration with various inputs
- [ ] Login/logout flow
- [ ] Chat message processing
- [ ] Mood tracking
- [ ] Task completion
- [ ] Game sessions
- [ ] Profile updates
- [ ] Password changes
- [ ] Account deletion
- [ ] Theme switching
- [ ] Responsive design (mobile/tablet/desktop)
- [ ] Error handling

### Automated Testing (Recommended)
```
Frontend:  Jest + React Testing Library
Backend:   pytest + FastAPI TestClient
Database:  SQLite in-memory for tests
```

---

## 🎯 Future Enhancement Possibilities

1. **Advanced AI:**
   - Multi-language support
   - Voice input/output
   - Emotion recognition from text

2. **Social Features:**
   - Peer support groups
   - Therapist directory integration
   - Community challenges

3. **Data Analytics:**
   - Mood trends machine learning
   - Personalized recommendations
   - Mental health insights

4. **Integrations:**
   - Calendar sync
   - Wearable device data
   - SMS/Email notifications

5. **Performance:**
   - WebSocket real-time chat
   - Progressive Web App (PWA)
   - Offline mode

---

## 📚 Running the Project

### Quick Start
```bash
# Terminal 1: Backend
.venv\Scripts\Activate.ps1
python -m uvicorn backend.main:app --reload

# Terminal 2: Frontend
npm run dev
```

### Full Setup
```bash
# Create Python environment
python -m venv .venv
.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt
npm install

# Run development servers
npm run dev  # Frontend
python -m uvicorn backend.main:app --reload  # Backend (separate terminal)
```

---

## 📞 Support & Resources

- **Crisis Hotlines:**
  - USA/Canada: 988
  - UK: 116 123 (Samaritans)
  - Australia: 13 11 14 (Lifeline)

- **Mental Health Resources:**
  - https://www.mentalhealth.gov
  - https://www.mind.org.uk
  - https://www.beyondblue.org.au

---

## 📄 License & Credits

- **Framework:** FastAPI, React
- **Database:** SQLAlchemy, SQLite
- **Audio:** Wikimedia Commons
- **Models:** Hugging Face Transformers (optional)

---

**Last Updated:** May 17, 2026  
**Project Status:** Production Ready ✅
