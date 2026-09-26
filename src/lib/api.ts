import axios, { AxiosError } from "axios";

export type UserProfile = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  created_at: string;
};

export type AuthTokens = {
  access_token: string;
  refresh_token: string;
};

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  phone?: string;
};

export type ChatMessage = {
  id: number;
  role: "user" | "bot";
  content: string;
  created_at: string;
};

export type MoodEntry = {
  id: number;
  mood: string;
  created_at: string;
};

export type GameStat = {
  game_type: string;
  total_time_seconds: number;
  sessions: number;
};

export type MusicTrack = {
  id: number;
  title: string;
  url: string;
};

export type TaskItem = {
  id: number;
  title: string;
  is_custom: boolean;
  date: string;
  completed: boolean;
};

export type TaskStats = {
  streak_days: number;
  weekly_progress: Array<{
    date: string;
    completed: number;
    total: number;
  }>;
};

type StoredTokens = AuthTokens | null;

type DemoUser = UserProfile & {
  password: string;
};

type DemoMoodEntry = MoodEntry & {
  user_id: number;
};

type DemoGameSession = {
  id: number;
  user_id: number;
  game_type: string;
  duration_seconds: number;
  created_at: string;
};

type DemoTask = TaskItem & {
  user_id: number;
};

type DemoChatMessage = ChatMessage & {
  user_id: number;
};

type DemoDb = {
  users: DemoUser[];
  moods: DemoMoodEntry[];
  gameSessions: DemoGameSession[];
  tasks: DemoTask[];
  chats: DemoChatMessage[];
  musicTracks: MusicTrack[];
  lastIds: Record<string, number>;
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? "http://localhost:8000" : "");
const TOKENS_KEY = "serene-mind.tokens";
const DEMO_DB_KEY = "serene-mind.demo-db";
const DEMO_MODE_KEY = "serene-mind.demo-mode";
const DEMO_SESSION_KEY = "serene-mind.demo-user";
const ALERT_MESSAGE =
  "I’m here to support your mental well-being. Please keep the conversation focused on mental health.";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 12000,
});

function emitModeChange() {
  window.dispatchEvent(new CustomEvent("serene-mode-change", { detail: getRuntimeMode() }));
}

export function getRuntimeMode() {
  return localStorage.getItem(DEMO_MODE_KEY) === "true" ? "demo" : "backend";
}

function setRuntimeMode(mode: "demo" | "backend") {
  localStorage.setItem(DEMO_MODE_KEY, String(mode === "demo"));
  emitModeChange();
}

export function getStoredTokens(): StoredTokens {
  const raw = localStorage.getItem(TOKENS_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthTokens;
  } catch {
    return null;
  }
}

export function setStoredTokens(tokens: AuthTokens) {
  localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
}

export function clearStoredTokens() {
  localStorage.removeItem(TOKENS_KEY);
  localStorage.removeItem(DEMO_SESSION_KEY);
  localStorage.removeItem(DEMO_MODE_KEY);
}

function normalizeError(error: unknown): Error {
  if (axios.isAxiosError(error)) {
    const detail =
      (error.response?.data as { detail?: string | { msg?: string }[] } | undefined)?.detail;

    if (typeof detail === "string") {
      return new Error(detail);
    }

    if (Array.isArray(detail) && detail[0]?.msg) {
      return new Error(detail[0].msg);
    }

    return new Error(error.message || "Something went wrong.");
  }

  if (error instanceof Error) return error;
  return new Error("Something went wrong.");
}

function isOfflineError(error: unknown) {
  return axios.isAxiosError(error) && !error.response;
}

function todayString(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function defaultMusicTracks(): MusicTrack[] {
  return [
    {
      id: 1,
      title: "Rain on Leaves",
      url: "https://upload.wikimedia.org/wikipedia/commons/4/4d/Rain_on_a_roof.ogg",
    },
    {
      id: 2,
      title: "Soft Piano Flow",
      url: "https://upload.wikimedia.org/wikipedia/commons/6/6e/Moonlight_Sonata_%281st_movement%29.ogg",
    },
    {
      id: 3,
      title: "Singing Bowls",
      url: "https://upload.wikimedia.org/wikipedia/commons/7/7e/Singing_bowl.ogg",
    },
    {
      id: 4,
      title: "Ocean Drift",
      url: "https://upload.wikimedia.org/wikipedia/commons/a/a4/Ocean_Waves.ogg",
    },
    {
      id: 5,
      title: "Forest Calm",
      url: "https://upload.wikimedia.org/wikipedia/commons/f/f5/Cello_Suite_No._1_-_Prelude.ogg",
    },
  ];
}

function getDemoDb(): DemoDb {
  const raw = localStorage.getItem(DEMO_DB_KEY);
  if (!raw) {
    const seed: DemoDb = {
      users: [],
      moods: [],
      gameSessions: [],
      tasks: [],
      chats: [],
      musicTracks: defaultMusicTracks(),
      lastIds: { users: 0, moods: 0, gameSessions: 0, tasks: 0, chats: 0 },
    };
    localStorage.setItem(DEMO_DB_KEY, JSON.stringify(seed));
    return seed;
  }

  try {
    const parsed = JSON.parse(raw) as DemoDb;
    if (!parsed.musicTracks?.length) parsed.musicTracks = defaultMusicTracks();
    return parsed;
  } catch {
    localStorage.removeItem(DEMO_DB_KEY);
    return getDemoDb();
  }
}

function saveDemoDb(db: DemoDb) {
  localStorage.setItem(DEMO_DB_KEY, JSON.stringify(db));
}

function nextId(db: DemoDb, key: keyof DemoDb["lastIds"]) {
  db.lastIds[key] += 1;
  return db.lastIds[key];
}

function getDemoSessionUserId() {
  const raw = localStorage.getItem(DEMO_SESSION_KEY);
  return raw ? Number(raw) : null;
}

function setDemoSessionUserId(userId: number) {
  localStorage.setItem(DEMO_SESSION_KEY, String(userId));
}

function getDemoUserOrThrow() {
  const db = getDemoDb();
  const userId = getDemoSessionUserId();
  const user = db.users.find((item) => item.id === userId);
  if (!user) throw new Error("Please sign in to continue.");
  return { db, user };
}

function ensureTodayTasks(db: DemoDb, userId: number) {
  const today = todayString();
  const defaults = [
    "Write in journal",
    "Take a 10-minute walk",
    "Practice 5-minute mindfulness",
    "Drink 8 glasses of water",
  ];

  for (const title of defaults) {
    const exists = db.tasks.some(
      (task) => task.user_id === userId && task.date === today && task.title === title,
    );

    if (!exists) {
      db.tasks.push({
        id: nextId(db, "tasks"),
        user_id: userId,
        title,
        is_custom: false,
        date: today,
        completed: false,
      });
    }
  }
}

function supportiveResponse(message: string) {
  const lower = message.toLowerCase();

  if (/(suicide|kill myself|self harm|hurt myself|want to die)/.test(lower)) {
    return "I’m really sorry you’re carrying this right now. You deserve immediate human support. Please contact local emergency services or a crisis line now—if you’re in the U.S. or Canada, call or text 988. If you’re elsewhere, reach out to your local crisis hotline or someone physically near you right away.";
  }

  if (/(anxious|anxiety|panic|nervous|stress)/.test(lower)) {
    return "It sounds like your nervous system may be overloaded right now. Let’s make this moment smaller: relax your shoulders, inhale for 4, hold for 4, exhale for 6, and name 3 things you can see. What feels like the biggest source of stress today?";
  }

  if (/(sad|depressed|empty|hopeless|crying|down)/.test(lower)) {
    return "I’m sorry this feels so heavy. When sadness builds up, it can help to lower the goal for today to one gentle step—drink water, sit by a window, or message someone safe. Would you like to talk about what has been weighing on you most?";
  }

  if (/(sleep|insomnia|tired|exhausted)/.test(lower)) {
    return "Sleep struggles can make everything feel sharper. A gentle wind-down routine can help: dim lights, lower stimulation, put the phone aside for a few minutes, and try slow breathing. Do you want help creating a simple bedtime reset?";
  }

  if (/(relationship|partner|friend|family|alone|lonely)/.test(lower)) {
    return "Relationships can deeply affect our mental well-being. It may help to name what you’re needing most right now—comfort, space, reassurance, or clarity. What happened that left you feeling this way?";
  }

  if (/(overwhelmed|burnout|too much|can.t cope|cannot cope)/.test(lower)) {
    return "That sounds overwhelming. Let’s reduce the pressure: what is one thing that truly must happen today, and what is one thing that can wait? We can sort it together one step at a time.";
  }

  return "Thank you for sharing that with me. I’m here to support your mental well-being with calm, practical reflection. Can you tell me a little more about how this has been affecting your mood, stress, or daily routine?";
}

function isOffTopic(message: string) {
  const lower = message.toLowerCase();
  const mentalHealthHints = [
    "stress",
    "anxiety",
    "panic",
    "sad",
    "depressed",
    "lonely",
    "therapy",
    "mental",
    "wellbeing",
    "well-being",
    "mindfulness",
    "sleep",
    "burnout",
    "relationship",
    "emotion",
    "mood",
    "self care",
    "self-care",
    "overwhelmed",
    "grief",
    "trauma",
  ];
  const offTopicHints = [
    "code",
    "coding",
    "javascript",
    "react",
    "python",
    "debug",
    "finance",
    "stock",
    "bitcoin",
    "investment",
    "betting",
    "sports",
    "football",
    "cricket",
    "politics",
    "election",
    "war strategy",
    "weapon",
    "violence",
  ];

  const hasMentalHealthHint = mentalHealthHints.some((hint) => lower.includes(hint));
  const hasOffTopicHint = offTopicHints.some((hint) => lower.includes(hint));

  return hasOffTopicHint && !hasMentalHealthHint;
}

async function withFallback<T>(request: () => Promise<T>, fallback: () => Promise<T>) {
  if (getRuntimeMode() === "demo") {
    return fallback();
  }

  try {
    const result = await request();
    setRuntimeMode("backend");
    return result;
  } catch (error) {
    if (isOfflineError(error)) {
      setRuntimeMode("demo");
      return fallback();
    }
    throw normalizeError(error);
  }
}

api.interceptors.request.use((config) => {
  const tokens = getStoredTokens();
  if (tokens?.access_token) {
    config.headers.Authorization = `Bearer ${tokens.access_token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosError["config"] & { _retry?: boolean };

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      const tokens = getStoredTokens();

      if (!tokens?.refresh_token) {
        clearStoredTokens();
        return Promise.reject(error);
      }

      try {
        const response = await axios.post<{ access_token: string }>(`${API_BASE_URL}/api/auth/refresh`, {
          refresh_token: tokens.refresh_token,
        });

        const nextTokens = {
          ...tokens,
          access_token: response.data.access_token,
        };
        setStoredTokens(nextTokens);
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${response.data.access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        clearStoredTokens();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export const appApi = {
  async register(payload: RegisterPayload) {
    return withFallback(
      async () => {
        const response = await api.post<{ message: string; verification: string }>(
          "/api/auth/register",
          payload,
        );
        return response.data;
      },
      async () => {
        const db = getDemoDb();
        if (db.users.some((user) => user.email.toLowerCase() === payload.email.toLowerCase())) {
          throw new Error("An account with that email already exists.");
        }

        const user: DemoUser = {
          id: nextId(db, "users"),
          name: payload.name,
          email: payload.email,
          phone: payload.phone ?? "",
          password: payload.password,
          created_at: new Date().toISOString(),
        };

        db.users.push(user);
        saveDemoDb(db);
        return {
          message: "Account created successfully.",
          verification: `Verification email simulated for ${payload.email}.`,
        };
      },
    );
  },

  async login(email: string, password: string) {
    return withFallback(
      async () => {
        const response = await api.post<AuthTokens>("/api/auth/login", { email, password });
        setStoredTokens(response.data);
        return response.data;
      },
      async () => {
        const db = getDemoDb();
        const user = db.users.find((item) => item.email.toLowerCase() === email.toLowerCase());
        if (!user || user.password !== password) {
          throw new Error("Invalid email or password.");
        }

        const tokens = {
          access_token: `demo-access-${user.id}-${Date.now()}`,
          refresh_token: `demo-refresh-${user.id}-${Date.now()}`,
        };
        setDemoSessionUserId(user.id);
        setStoredTokens(tokens);
        return tokens;
      },
    );
  },

  async getProfile() {
    return withFallback(
      async () => {
        const response = await api.get<UserProfile>("/api/user/profile");
        return response.data;
      },
      async () => {
        const { user } = getDemoUserOrThrow();
        const { password: _password, ...profile } = user;
        return profile;
      },
    );
  },

  async updateProfile(payload: { name: string; email: string; phone?: string }) {
    return withFallback(
      async () => {
        const response = await api.put<UserProfile>("/api/user/profile", payload);
        return response.data;
      },
      async () => {
        const { db, user } = getDemoUserOrThrow();
        const emailTaken = db.users.some(
          (item) => item.id !== user.id && item.email.toLowerCase() === payload.email.toLowerCase(),
        );

        if (emailTaken) throw new Error("That email is already in use.");

        user.name = payload.name;
        user.email = payload.email;
        user.phone = payload.phone ?? "";
        saveDemoDb(db);
        const { password: _password, ...profile } = user;
        return profile;
      },
    );
  },

  async changePassword(payload: { current_password: string; new_password: string }) {
    return withFallback(
      async () => {
        const response = await api.put<{ message: string }>("/api/user/password", payload);
        return response.data;
      },
      async () => {
        const { db, user } = getDemoUserOrThrow();
        if (user.password !== payload.current_password) {
          throw new Error("Current password is incorrect.");
        }
        user.password = payload.new_password;
        saveDemoDb(db);
        return { message: "Password updated successfully." };
      },
    );
  },

  async deleteAccount() {
    return withFallback(
      async () => {
        const response = await api.delete<{ message: string }>("/api/user");
        clearStoredTokens();
        return response.data;
      },
      async () => {
        const { db, user } = getDemoUserOrThrow();
        db.users = db.users.filter((item) => item.id !== user.id);
        db.moods = db.moods.filter((item) => item.user_id !== user.id);
        db.gameSessions = db.gameSessions.filter((item) => item.user_id !== user.id);
        db.tasks = db.tasks.filter((item) => item.user_id !== user.id);
        db.chats = db.chats.filter((item) => item.user_id !== user.id);
        saveDemoDb(db);
        clearStoredTokens();
        return { message: "Account deleted." };
      },
    );
  },

  async getChatHistory(page = 1, limit = 50) {
    return withFallback(
      async () => {
        const response = await api.get<ChatMessage[]>("/api/chat/history", { params: { page, limit } });
        return response.data;
      },
      async () => {
        const { db, user } = getDemoUserOrThrow();
        return db.chats
          .filter((item) => item.user_id === user.id)
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          .slice(-limit);
      },
    );
  },

  async sendMessage(message: string) {
    return withFallback(
      async () => {
        const response = await api.post<{ response: string; is_alert: boolean }>("/api/chat/message", {
          message,
        });
        return response.data;
      },
      async () => {
        const { db, user } = getDemoUserOrThrow();

        if (isOffTopic(message)) {
          return {
            response: ALERT_MESSAGE,
            is_alert: true,
          };
        }

        const userMessage: DemoChatMessage = {
          id: nextId(db, "chats"),
          user_id: user.id,
          role: "user",
          content: message,
          created_at: new Date().toISOString(),
        };

        const botMessage: DemoChatMessage = {
          id: nextId(db, "chats"),
          user_id: user.id,
          role: "bot",
          content: supportiveResponse(message),
          created_at: new Date().toISOString(),
        };

        db.chats.push(userMessage, botMessage);
        saveDemoDb(db);

        return {
          response: botMessage.content,
          is_alert: false,
        };
      },
    );
  },

  async saveMood(mood: string) {
    return withFallback(
      async () => {
        const response = await api.post<MoodEntry>("/api/mood", { mood });
        return response.data;
      },
      async () => {
        const { db, user } = getDemoUserOrThrow();
        const entry: DemoMoodEntry = {
          id: nextId(db, "moods"),
          user_id: user.id,
          mood,
          created_at: new Date().toISOString(),
        };
        db.moods.push(entry);
        saveDemoDb(db);
        return entry;
      },
    );
  },

  async getMoodHistory(days = 7) {
    return withFallback(
      async () => {
        const response = await api.get<MoodEntry[]>("/api/mood/history", { params: { days } });
        return response.data;
      },
      async () => {
        const { db, user } = getDemoUserOrThrow();
        const threshold = Date.now() - days * 24 * 60 * 60 * 1000;
        return db.moods
          .filter((item) => item.user_id === user.id)
          .filter((item) => new Date(item.created_at).getTime() >= threshold)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      },
    );
  },

  async logGameSession(payload: { game_type: string; duration_seconds: number }) {
    return withFallback(
      async () => {
        const response = await api.post<{ message: string }>("/api/games/session", payload);
        return response.data;
      },
      async () => {
        const { db, user } = getDemoUserOrThrow();
        db.gameSessions.push({
          id: nextId(db, "gameSessions"),
          user_id: user.id,
          game_type: payload.game_type,
          duration_seconds: payload.duration_seconds,
          created_at: new Date().toISOString(),
        });
        saveDemoDb(db);
        return { message: "Session logged." };
      },
    );
  },

  async getGameStats() {
    return withFallback(
      async () => {
        const response = await api.get<GameStat[]>("/api/games/stats");
        return response.data;
      },
      async () => {
        const { db, user } = getDemoUserOrThrow();
        const sessions = db.gameSessions.filter((item) => item.user_id === user.id);
        const grouped = new Map<string, GameStat>();

        for (const session of sessions) {
          const current = grouped.get(session.game_type) ?? {
            game_type: session.game_type,
            total_time_seconds: 0,
            sessions: 0,
          };
          current.total_time_seconds += session.duration_seconds;
          current.sessions += 1;
          grouped.set(session.game_type, current);
        }

        return Array.from(grouped.values());
      },
    );
  },

  async getMusicTracks() {
    return withFallback(
      async () => {
        const response = await api.get<MusicTrack[]>("/api/music/tracks");
        return response.data;
      },
      async () => {
        const db = getDemoDb();
        return db.musicTracks;
      },
    );
  },

  async getTasks() {
    return withFallback(
      async () => {
        const response = await api.get<TaskItem[]>("/api/tasks");
        return response.data;
      },
      async () => {
        const { db, user } = getDemoUserOrThrow();
        ensureTodayTasks(db, user.id);
        saveDemoDb(db);
        return db.tasks
          .filter((item) => item.user_id === user.id && item.date === todayString())
          .sort((a, b) => Number(a.completed) - Number(b.completed));
      },
    );
  },

  async addTask(title: string) {
    return withFallback(
      async () => {
        const response = await api.post<TaskItem>("/api/tasks", { title });
        return response.data;
      },
      async () => {
        const { db, user } = getDemoUserOrThrow();
        const task: DemoTask = {
          id: nextId(db, "tasks"),
          user_id: user.id,
          title,
          is_custom: true,
          date: todayString(),
          completed: false,
        };
        db.tasks.push(task);
        saveDemoDb(db);
        return task;
      },
    );
  },

  async toggleTask(taskId: number) {
    return withFallback(
      async () => {
        const response = await api.put<TaskItem>(`/api/tasks/${taskId}/toggle`);
        return response.data;
      },
      async () => {
        const { db, user } = getDemoUserOrThrow();
        const task = db.tasks.find((item) => item.id === taskId && item.user_id === user.id);
        if (!task) throw new Error("Task not found.");
        task.completed = !task.completed;
        saveDemoDb(db);
        return task;
      },
    );
  },

  async getTaskStats() {
    return withFallback(
      async () => {
        const response = await api.get<TaskStats>("/api/tasks/stats");
        return response.data;
      },
      async () => {
        const { db, user } = getDemoUserOrThrow();
        const weeklyProgress = Array.from({ length: 7 }, (_, index) => {
          const date = todayString(index - 6);
          const dayTasks = db.tasks.filter((task) => task.user_id === user.id && task.date === date);
          return {
            date,
            completed: dayTasks.filter((task) => task.completed).length,
            total: dayTasks.length,
          };
        });

        let streakDays = 0;
        for (let i = 0; i < 30; i += 1) {
          const date = todayString(-i);
          const dayTasks = db.tasks.filter((task) => task.user_id === user.id && task.date === date);
          if (!dayTasks.length) break;
          if (dayTasks.every((task) => task.completed)) {
            streakDays += 1;
          } else {
            break;
          }
        }

        return {
          streak_days: streakDays,
          weekly_progress: weeklyProgress,
        };
      },
    );
  },
};

export async function ensureDemoUser(): Promise<UserProfile> {
  const tokens = getStoredTokens();

  if (tokens) {
    try {
      return await appApi.getProfile();
    } catch {
      clearStoredTokens();
    }
  }

  const db = getDemoDb();
  let user = db.users.find((item) => item.email === "guest@serene-mind.local");

  if (!user) {
    user = {
      id: nextId(db, "users"),
      name: "Guest User",
      email: "guest@serene-mind.local",
      phone: "",
      password: "demo",
      created_at: new Date().toISOString(),
    };
    db.users.push(user);
    saveDemoDb(db);
  }

  setDemoSessionUserId(user.id);
  setStoredTokens({
    access_token: `demo-access-${user.id}-${Date.now()}`,
    refresh_token: `demo-refresh-${user.id}-${Date.now()}`,
  });
  setRuntimeMode("demo");

  const { password: _password, ...profile } = user;
  return profile;
}
