from __future__ import annotations

import asyncio
import os
import re
from datetime import date, datetime, timedelta, timezone
from typing import Any, Literal

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, Field
from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    create_engine,
    func,
)
from sqlalchemy.orm import Session, declarative_base, relationship, sessionmaker
from backend.ai_service import MentalHealthAIService as GeminiMentalHealthAIService

load_dotenv()

DEFAULT_DATABASE_URL = (
    "sqlite:////tmp/serenity_mind.db"
    if os.getenv("VERCEL") == "1"
    else "sqlite:///./serenity_mind.db"
)
DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL)
JWT_SECRET = os.getenv("JWT_SECRET", "change-this-secret-in-production")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_MINUTES = int(os.getenv("ACCESS_TOKEN_MINUTES", "30"))
REFRESH_TOKEN_DAYS = int(os.getenv("REFRESH_TOKEN_DAYS", "7"))
INTENT_MODEL_PATH = os.getenv("INTENT_MODEL_PATH", "")
CHAT_MODEL_PATH = os.getenv("CHAT_MODEL_PATH", "")
FRONTEND_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "FRONTEND_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000",
    ).split(",")
    if origin.strip()
]

sqlite_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=sqlite_connect_args, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
Base = declarative_base()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

ALERT_MESSAGE = (
    "I’m here to support your mental well-being. Please keep the conversation focused on mental health."
)
DEFAULT_TASKS = [
    "Write in journal",
    "Take a 10-minute walk",
    "Practice 5-minute mindfulness",
    "Drink 8 glasses of water",
]
TRACKS = [
    {
        "title": "Rain on Leaves",
        "file_url": "https://upload.wikimedia.org/wikipedia/commons/4/4d/Rain_on_a_roof.ogg",
    },
    {
        "title": "Soft Piano Flow",
        "file_url": "https://upload.wikimedia.org/wikipedia/commons/6/6e/Moonlight_Sonata_%281st_movement%29.ogg",
    },
    {
        "title": "Singing Bowls",
        "file_url": "https://upload.wikimedia.org/wikipedia/commons/7/7e/Singing_bowl.ogg",
    },
    {
        "title": "Ocean Drift",
        "file_url": "https://upload.wikimedia.org/wikipedia/commons/a/a4/Ocean_Waves.ogg",
    },
    {
        "title": "Forest Calm",
        "file_url": "https://upload.wikimedia.org/wikipedia/commons/f/f5/Cello_Suite_No._1_-_Prelude.ogg",
    },
]


# SQLAlchemy models
from sqlalchemy import Column  # noqa: E402


class UserModel(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(50), nullable=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    chat_messages = relationship("ChatMessageModel", cascade="all, delete-orphan", back_populates="user")
    mood_entries = relationship("MoodEntryModel", cascade="all, delete-orphan", back_populates="user")
    game_sessions = relationship("GameSessionModel", cascade="all, delete-orphan", back_populates="user")
    tasks = relationship("TaskModel", cascade="all, delete-orphan", back_populates="user")


class ChatMessageModel(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    role = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("UserModel", back_populates="chat_messages")


class MoodEntryModel(Base):
    __tablename__ = "mood_entries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    mood = Column(String(50), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("UserModel", back_populates="mood_entries")


class GameSessionModel(Base):
    __tablename__ = "game_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    game_type = Column(String(100), nullable=False)
    duration_seconds = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("UserModel", back_populates="game_sessions")


class TaskModel(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    is_custom = Column(Boolean, default=False, nullable=False)
    date = Column(Date, nullable=False, index=True)
    completed = Column(Boolean, default=False, nullable=False)

    user = relationship("UserModel", back_populates="tasks")


class MusicTrackModel(Base):
    __tablename__ = "music_tracks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    file_url = Column(String(500), nullable=False)


# Request schemas
class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    email: str
    password: str
    phone: str | None = None


class LoginRequest(BaseModel):
    email: str
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class ProfileUpdateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    email: str
    phone: str | None = None


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)


class MoodRequest(BaseModel):
    mood: str = Field(min_length=2, max_length=50)


class GameSessionRequest(BaseModel):
    game_type: str = Field(min_length=2, max_length=100)
    duration_seconds: int = Field(ge=1, le=86400)


class TaskCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=255)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def validate_email(email: str) -> str:
    email = email.strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email cannot be empty.")
    return email


def validate_password_strength(password: str) -> None:
    if len(password) < 1:
        raise HTTPException(
            status_code=400,
            detail="Password cannot be empty.",
        )


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    return pwd_context.verify(plain_password, password_hash)


def create_token(*, user_id: int, token_type: Literal["access", "refresh"], expires_delta: timedelta) -> str:
    payload = {
        "sub": str(user_id),
        "type": token_type,
        "exp": utcnow() + expires_delta,
        "iat": utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_access_token(user_id: int) -> str:
    return create_token(
        user_id=user_id,
        token_type="access",
        expires_delta=timedelta(minutes=ACCESS_TOKEN_MINUTES),
    )


def create_refresh_token(user_id: int) -> str:
    return create_token(
        user_id=user_id,
        token_type="refresh",
        expires_delta=timedelta(days=REFRESH_TOKEN_DAYS),
    )


def decode_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired token.") from exc


def serialize_user(user: UserModel) -> dict[str, Any]:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "created_at": user.created_at.isoformat(),
    }


def serialize_chat_message(message: ChatMessageModel) -> dict[str, Any]:
    return {
        "id": message.id,
        "role": message.role,
        "content": message.content,
        "created_at": message.created_at.isoformat(),
    }


def serialize_mood_entry(entry: MoodEntryModel) -> dict[str, Any]:
    return {
        "id": entry.id,
        "mood": entry.mood,
        "created_at": entry.created_at.isoformat(),
    }


def serialize_task(task: TaskModel) -> dict[str, Any]:
    return {
        "id": task.id,
        "title": task.title,
        "is_custom": task.is_custom,
        "date": task.date.isoformat(),
        "completed": task.completed,
    }


def serialize_track(track: MusicTrackModel) -> dict[str, Any]:
    return {
        "id": track.id,
        "title": track.title,
        "url": track.file_url,
    }


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> UserModel:
    payload = decode_token(token)
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid access token.")

    user_id = payload.get("sub")
    user = db.get(UserModel, int(user_id)) if user_id else None
    if not user:
        raise HTTPException(status_code=401, detail="User not found.")
    return user


def ensure_daily_tasks(db: Session, user_id: int, task_date: date) -> None:
    existing_titles = {
        title
        for (title,) in db.query(TaskModel.title)
        .filter(TaskModel.user_id == user_id, TaskModel.date == task_date)
        .all()
    }

    created = False
    for title in DEFAULT_TASKS:
        if title not in existing_titles:
            db.add(
                TaskModel(
                    user_id=user_id,
                    title=title,
                    is_custom=False,
                    date=task_date,
                    completed=False,
                )
            )
            created = True

    if created:
        db.commit()


def seed_music_tracks(db: Session) -> None:
    if db.query(MusicTrackModel).count() > 0:
        return

    for track in TRACKS:
        db.add(MusicTrackModel(title=track["title"], file_url=track["file_url"]))
    db.commit()


class MentalHealthAIService:
    def __init__(self) -> None:
        self._loaded = False
        self._load_error: str | None = None
        self.intent_pipeline = None
        self.chat_model = None
        self.chat_tokenizer = None

    def load_models(self) -> None:
        if self._loaded:
            return

        self._loaded = True
        try:
            from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline

            if INTENT_MODEL_PATH:
                self.intent_pipeline = pipeline(
                    "text-classification",
                    model=INTENT_MODEL_PATH,
                    tokenizer=INTENT_MODEL_PATH,
                )

            if CHAT_MODEL_PATH:
                self.chat_tokenizer = AutoTokenizer.from_pretrained(CHAT_MODEL_PATH)
                self.chat_model = AutoModelForCausalLM.from_pretrained(CHAT_MODEL_PATH)
                if self.chat_tokenizer.pad_token is None:
                    self.chat_tokenizer.pad_token = self.chat_tokenizer.eos_token
        except Exception as exc:  # pragma: no cover - optional dependency/runtime branch
            self._load_error = str(exc)
            self.intent_pipeline = None
            self.chat_model = None
            self.chat_tokenizer = None

    async def is_off_topic(self, message: str) -> bool:
        return await asyncio.to_thread(self._is_off_topic_sync, message)

    async def generate_message(self, message: str, history: list[dict[str, str]]) -> str:
        return await asyncio.to_thread(self._generate_message_sync, message, history)

    def _is_off_topic_sync(self, message: str) -> bool:
        self.load_models()

        if self.intent_pipeline is not None:
            try:
                result = self.intent_pipeline(message, truncation=True)[0]
                label = str(result.get("label", "")).lower()
                score = float(result.get("score", 0.0))
                if "off" in label and score >= 0.5:
                    return True
                if "mental" in label:
                    return False
            except Exception:
                pass

        lower = message.lower()
        mental_keywords = [
            "stress",
            "anxiety",
            "panic",
            "sad",
            "depress",
            "therapy",
            "self-care",
            "self care",
            "mental",
            "well-being",
            "wellbeing",
            "sleep",
            "burnout",
            "relationship",
            "emotion",
            "mood",
            "lonely",
            "overwhelmed",
            "grief",
            "trauma",
        ]
        off_topic_keywords = [
            "code",
            "coding",
            "react",
            "javascript",
            "python",
            "bug",
            "debug",
            "finance",
            "bitcoin",
            "stocks",
            "investment",
            "sports",
            "match score",
            "election",
            "politics",
            "weapon",
            "violence",
            "war strategy",
        ]

        has_mental_keyword = any(keyword in lower for keyword in mental_keywords)
        has_off_topic_keyword = any(keyword in lower for keyword in off_topic_keywords)
        return has_off_topic_keyword and not has_mental_keyword

    def _generate_message_sync(self, message: str, history: list[dict[str, str]]) -> str:
        lower = message.lower()

        if re.search(r"suicide|kill myself|self harm|hurt myself|want to die", lower):
            return (
                "I’m really sorry you’re experiencing this. You deserve immediate human support right now. "
                "Please contact local emergency services or a crisis line immediately—if you’re in the U.S. or Canada, call or text 988. "
                "If you can, also reach out to someone physically near you right away."
            )

        self.load_models()
        if self.chat_model is not None and self.chat_tokenizer is not None:
            try:
                prompt_parts = [
                    "You are a supportive mental health chatbot. Respond with empathy, practical grounding, and clear boundaries."
                ]
                for turn in history[-8:]:
                    role = "User" if turn["role"] == "user" else "Support"
                    prompt_parts.append(f"{role}: {turn['content']}")
                prompt_parts.append(f"User: {message}")
                prompt_parts.append("Support:")
                prompt = "\n".join(prompt_parts)

                inputs = self.chat_tokenizer(prompt, return_tensors="pt", truncation=True, max_length=512)
                output = self.chat_model.generate(
                    **inputs,
                    max_new_tokens=90,
                    do_sample=True,
                    temperature=0.8,
                    top_p=0.92,
                    pad_token_id=self.chat_tokenizer.eos_token_id,
                )
                generated = self.chat_tokenizer.decode(output[0][inputs["input_ids"].shape[-1] :], skip_special_tokens=True)
                cleaned = generated.replace("Support:", "").replace("User:", "").strip().split("\n")[0].strip()
                if cleaned:
                    return cleaned
            except Exception:
                pass

        if any(word in lower for word in ["anxiety", "anxious", "panic", "stress", "nervous"]):
            return (
                "It sounds like your system may be carrying a lot right now. Let’s make this moment smaller: try unclenching your jaw, "
                "dropping your shoulders, and taking one slow inhale for 4 and exhale for 6. What feels like the most intense part of this stress today?"
            )
        if any(word in lower for word in ["sad", "depressed", "hopeless", "crying", "empty"]):
            return (
                "I’m sorry this feels so heavy. When low mood takes over, it can help to lower the bar and choose one gentle action—drink water, sit by a window, "
                "or message someone safe. Would it help to talk about what has been weighing on you most?"
            )
        if any(word in lower for word in ["sleep", "insomnia", "tired", "exhausted"]):
            return (
                "Sleep difficulties can make everything feel sharper. A small wind-down routine may help: dim the lights, reduce screen stimulation, and try three slow breaths. "
                "Would you like help building a 10-minute bedtime reset?"
            )
        if any(word in lower for word in ["relationship", "partner", "friend", "family", "lonely", "alone"]):
            return (
                "Relationships can affect us deeply. It may help to name what you need most right now—comfort, space, reassurance, or clarity. "
                "What happened that left you feeling this way?"
            )
        if any(word in lower for word in ["overwhelmed", "burnout", "too much", "can’t cope", "cannot cope"]):
            return (
                "That sounds overwhelming. Let’s reduce the pressure for a moment: what is one thing that truly must happen today, and what is one thing that can wait? "
                "We can sort it together one small step at a time."
            )
        return (
            "Thank you for sharing that with me. I’m here to support your mental well-being with calm, practical reflection. "
            "Can you tell me a bit more about how this has been affecting your mood, stress, or daily routine?"
        )


ai_service = GeminiMentalHealthAIService()

app = FastAPI(title="Serenity Mind API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event() -> None:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_music_tracks(db)
    ai_service.load_models()


@app.get("/api/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "database": DATABASE_URL,
        "intent_model_configured": bool(INTENT_MODEL_PATH),
        "chat_model_configured": bool(CHAT_MODEL_PATH),
        "gemini_configured": bool(os.getenv("GEMINI_API_KEY", "").strip()),
        "gemini_model": os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip(),
        "model_load_error": ai_service._load_error,
    }


@app.post("/api/auth/register")
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> dict[str, str]:
    try:
        email = validate_email(payload.email)
        if not payload.password or len(payload.password.strip()) == 0:
            raise HTTPException(status_code=400, detail="Password cannot be empty.")

        existing_user = db.query(UserModel).filter(UserModel.email == email).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="An account with that email already exists.")

        user = UserModel(
            name=payload.name.strip() or "User",
            email=email,
            phone=(payload.phone or "").strip() or None,
            password_hash=hash_password(payload.password),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        ensure_daily_tasks(db, user.id, date.today())

        return {
            "message": "Account created successfully.",
            "verification": f"Welcome! Your account has been created.",
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")


@app.post("/api/auth/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> dict[str, str]:
    try:
        email = validate_email(payload.email)
        user = db.query(UserModel).filter(UserModel.email == email).first()

        if not user or not verify_password(payload.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid email or password.")

        return {
            "access_token": create_access_token(user.id),
            "refresh_token": create_refresh_token(user.id),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")



@app.post("/api/auth/refresh")
def refresh_token(payload: RefreshRequest, db: Session = Depends(get_db)) -> dict[str, str]:
    token_data = decode_token(payload.refresh_token)
    if token_data.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token.")

    user_id = token_data.get("sub")
    user = db.get(UserModel, int(user_id)) if user_id else None
    if not user:
        raise HTTPException(status_code=401, detail="User not found.")

    return {"access_token": create_access_token(user.id)}


@app.get("/api/user/profile")
def get_profile(current_user: UserModel = Depends(get_current_user)) -> dict[str, Any]:
    return serialize_user(current_user)


@app.put("/api/user/profile")
def update_profile(
    payload: ProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
) -> dict[str, Any]:
    email = validate_email(payload.email)
    existing_user = (
        db.query(UserModel)
        .filter(UserModel.email == email, UserModel.id != current_user.id)
        .first()
    )
    if existing_user:
        raise HTTPException(status_code=400, detail="That email is already in use.")

    current_user.name = payload.name.strip()
    current_user.email = email
    current_user.phone = (payload.phone or "").strip() or None
    db.commit()
    db.refresh(current_user)
    return serialize_user(current_user)


@app.put("/api/user/password")
def change_password(
    payload: PasswordChangeRequest,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
) -> dict[str, str]:
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")

    validate_password_strength(payload.new_password)
    current_user.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"message": "Password updated successfully."}


@app.delete("/api/user")
def delete_account(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
) -> dict[str, str]:
    db.delete(current_user)
    db.commit()
    return {"message": "Account deleted."}


@app.get("/api/chat/history")
def chat_history(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
) -> list[dict[str, Any]]:
    offset = (page - 1) * limit
    rows = (
        db.query(ChatMessageModel)
        .filter(ChatMessageModel.user_id == current_user.id)
        .order_by(ChatMessageModel.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [serialize_chat_message(item) for item in reversed(rows)]


@app.post("/api/chat/message")
async def send_message(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
) -> dict[str, Any]:
    message = payload.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    is_alert = await ai_service.is_off_topic(message)
    if is_alert:
        return {"response": ALERT_MESSAGE, "is_alert": True}

    history_rows = (
        db.query(ChatMessageModel)
        .filter(ChatMessageModel.user_id == current_user.id)
        .order_by(ChatMessageModel.created_at.desc())
        .limit(8)
        .all()
    )
    history = [
        {"role": item.role, "content": item.content}
        for item in reversed(history_rows)
    ]

    response = await ai_service.generate_message(message, history)

    db.add(ChatMessageModel(user_id=current_user.id, role="user", content=message))
    db.add(ChatMessageModel(user_id=current_user.id, role="bot", content=response))
    db.commit()

    return {"response": response, "is_alert": False}


@app.post("/api/mood")
def save_mood(
    payload: MoodRequest,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
) -> dict[str, Any]:
    entry = MoodEntryModel(user_id=current_user.id, mood=payload.mood.strip().lower())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return serialize_mood_entry(entry)


@app.get("/api/mood/history")
def mood_history(
    days: int = Query(7, ge=1, le=90),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
) -> list[dict[str, Any]]:
    threshold = utcnow() - timedelta(days=days)
    rows = (
        db.query(MoodEntryModel)
        .filter(MoodEntryModel.user_id == current_user.id, MoodEntryModel.created_at >= threshold)
        .order_by(MoodEntryModel.created_at.desc())
        .all()
    )
    return [serialize_mood_entry(item) for item in rows]


@app.post("/api/games/session")
def save_game_session(
    payload: GameSessionRequest,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
) -> dict[str, str]:
    session = GameSessionModel(
        user_id=current_user.id,
        game_type=payload.game_type.strip().lower(),
        duration_seconds=payload.duration_seconds,
    )
    db.add(session)
    db.commit()
    return {"message": "Game session logged."}


@app.get("/api/games/stats")
def game_stats(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
) -> list[dict[str, Any]]:
    rows = (
        db.query(
            GameSessionModel.game_type,
            func.sum(GameSessionModel.duration_seconds).label("total_time_seconds"),
            func.count(GameSessionModel.id).label("sessions"),
        )
        .filter(GameSessionModel.user_id == current_user.id)
        .group_by(GameSessionModel.game_type)
        .order_by(GameSessionModel.game_type.asc())
        .all()
    )

    return [
        {
            "game_type": game_type,
            "total_time_seconds": int(total_time_seconds or 0),
            "sessions": int(sessions or 0),
        }
        for game_type, total_time_seconds, sessions in rows
    ]


@app.get("/api/music/tracks")
def get_music_tracks(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    rows = db.query(MusicTrackModel).order_by(MusicTrackModel.id.asc()).all()
    return [serialize_track(item) for item in rows]


@app.get("/api/tasks")
def get_tasks(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
) -> list[dict[str, Any]]:
    today = date.today()
    ensure_daily_tasks(db, current_user.id, today)

    tasks = (
        db.query(TaskModel)
        .filter(TaskModel.user_id == current_user.id, TaskModel.date == today)
        .order_by(TaskModel.completed.asc(), TaskModel.is_custom.asc(), TaskModel.id.asc())
        .all()
    )
    return [serialize_task(item) for item in tasks]


@app.post("/api/tasks")
def add_task(
    payload: TaskCreateRequest,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
) -> dict[str, Any]:
    task = TaskModel(
        user_id=current_user.id,
        title=payload.title.strip(),
        is_custom=True,
        date=date.today(),
        completed=False,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return serialize_task(task)


@app.put("/api/tasks/{task_id}/toggle")
def toggle_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
) -> dict[str, Any]:
    task = (
        db.query(TaskModel)
        .filter(TaskModel.id == task_id, TaskModel.user_id == current_user.id)
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")

    task.completed = not task.completed
    db.commit()
    db.refresh(task)
    return serialize_task(task)


@app.get("/api/tasks/stats")
def task_stats(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
) -> dict[str, Any]:
    today = date.today()
    ensure_daily_tasks(db, current_user.id, today)

    weekly_progress: list[dict[str, Any]] = []
    for offset in range(6, -1, -1):
        current_date = today - timedelta(days=offset)
        day_tasks = (
            db.query(TaskModel)
            .filter(TaskModel.user_id == current_user.id, TaskModel.date == current_date)
            .all()
        )
        weekly_progress.append(
            {
                "date": current_date.isoformat(),
                "completed": sum(1 for task in day_tasks if task.completed),
                "total": len(day_tasks),
            }
        )

    streak_days = 0
    for offset in range(0, 31):
        current_date = today - timedelta(days=offset)
        day_tasks = (
            db.query(TaskModel)
            .filter(TaskModel.user_id == current_user.id, TaskModel.date == current_date)
            .all()
        )
        if not day_tasks:
            break
        if all(task.completed for task in day_tasks):
            streak_days += 1
        else:
            break

    return {
        "streak_days": streak_days,
        "weekly_progress": weekly_progress,
    }
