import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  BrowserRouter,
  Link,
  NavLink,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  appApi,
  clearStoredTokens,
  ensureDemoUser,
  getRuntimeMode,
  getStoredTokens,
  type ChatMessage,
  type GameStat,
  type MoodEntry,
  type MusicTrack,
  type RegisterPayload,
  type TaskItem,
  type TaskStats,
  type UserProfile,
} from "./lib/api";

type ThemeMode = "light" | "dark";
type RuntimeMode = "backend" | "demo";

type AuthContextValue = {
  user: UserProfile | null;
  loading: boolean;
  mode: RuntimeMode;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<string>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  setUser: (user: UserProfile | null) => void;
};

type ThemeContextValue = {
  theme: ThemeMode;
  toggleTheme: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const ThemeContext = createContext<ThemeContextValue | null>(null);

const moodChoices = [
  { label: "Calm", emoji: "😌", value: "calm" },
  { label: "Happy", emoji: "🙂", value: "happy" },
  { label: "Neutral", emoji: "😐", value: "neutral" },
  { label: "Anxious", emoji: "😟", value: "anxious" },
  { label: "Sad", emoji: "😔", value: "sad" },
];

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: "⌂" },
  { to: "/chat", label: "AI Chatbot", icon: "◎" },
  { to: "/games", label: "Games", icon: "◈" },
  { to: "/music", label: "Meditation", icon: "♫" },
  { to: "/tasks", label: "Tasks", icon: "✓" },
  { to: "/profile", label: "Profile", icon: "⚙" },
];

const hotlineItems = [
  { region: "United States & Canada", contact: "Call or text 988" },
  { region: "United Kingdom", contact: "Samaritans: 116 123" },
  { region: "Australia", contact: "Lifeline: 13 11 14" },
  { region: "India", contact: "Tele-MANAS: 14416" },
  { region: "Global", contact: "Seek local emergency services or the nearest crisis line" },
];

const breathingPhases = [
  { label: "Inhale", seconds: 4, scale: 1.18 },
  { label: "Hold", seconds: 7, scale: 1.18 },
  { label: "Exhale", seconds: 8, scale: 0.9 },
];

function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthContext.");
  return context;
}

function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeContext.");
  return context;
}

function firstName(name?: string | null) {
  return name?.trim().split(" ")[0] || "there";
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function passwordIsStrong(password: string) {
  return /^(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password);
}

function emailLooksValid(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function AppProviders({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<RuntimeMode>(getRuntimeMode());
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem("serene-mind.theme");
    return stored === "dark" ? "dark" : "light";
  });

  useEffect(() => {
    const handleModeChange = () => setMode(getRuntimeMode());
    window.addEventListener("serene-mode-change", handleModeChange);
    return () => window.removeEventListener("serene-mode-change", handleModeChange);
  }, []);

  useEffect(() => {
    localStorage.setItem("serene-mind.theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      const tokens = getStoredTokens();
      if (!tokens) {
        if (mounted) setLoading(false);
        return;
      }

      try {
        const profile = await appApi.getProfile();
        if (mounted) setUser(profile);
      } catch {
        clearStoredTokens();
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void bootstrap();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (loading || user) return;
    let mounted = true;

    void (async () => {
      const profile = await ensureDemoUser();
      if (mounted) setUser(profile);
    })();

    return () => {
      mounted = false;
    };
  }, [loading, user]);

  const authValue = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      mode,
      async login(email, password) {
        await appApi.login(email, password);
        const profile = await appApi.getProfile();
        setUser(profile);
        setMode(getRuntimeMode());
      },
      async register(payload) {
        const result = await appApi.register(payload);
        await appApi.login(payload.email, payload.password);
        const profile = await appApi.getProfile();
        setUser(profile);
        setMode(getRuntimeMode());
        return result.verification;
      },
      logout() {
        clearStoredTokens();
        setUser(null);
      },
      async refreshProfile() {
        const profile = await appApi.getProfile();
        setUser(profile);
        setMode(getRuntimeMode());
      },
      setUser,
    }),
    [user, loading, mode],
  );

  const themeValue = useMemo<ThemeContextValue>(
    () => ({
      theme,
      toggleTheme: () => setTheme((current) => (current === "light" ? "dark" : "light")),
    }),
    [theme],
  );

  return (
    <ThemeContext.Provider value={themeValue}>
      <AuthContext.Provider value={authValue}>
        <div className={theme === "dark" ? "theme-dark" : "theme-light"}>{children}</div>
      </AuthContext.Provider>
    </ThemeContext.Provider>
  );
}

function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Navigate to="/dashboard" replace />} />
          <Route path="/signup" element={<Navigate to="/dashboard" replace />} />
          <Route element={<ProtectedLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/games" element={<GamesPage />} />
            <Route path="/music" element={<MusicPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="*" element={<DashboardPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProviders>
  );
}

function RootRedirect() {
  const { user, loading } = useAuth();

  if (loading) return <ScreenLoader label="Preparing your calm space..." />;
  return <Navigate to={user ? "/dashboard" : "/login"} replace />;
}

function AuthGate({ route }: { route: "login" | "signup" }) {
  const { user, loading } = useAuth();

  if (loading) return <ScreenLoader label="Loading Serenity Mind..." />;
  if (user) return <Navigate to="/dashboard" replace />;

  return route === "login" ? <LoginPage /> : <SignupPage />;
}

function ProtectedLayout() {
  const { user, loading, logout, mode } = useAuth();
  const { toggleTheme, theme } = useTheme();
  const [helpOpen, setHelpOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const titles: Record<string, string> = {
    "/dashboard": "Home Dashboard",
    "/chat": "AI Mental Health Chatbot",
    "/games": "Wellness Games",
    "/music": "Meditation Music",
    "/tasks": "Daily Tasks",
    "/profile": "Profile & Settings",
  };

  if (loading) return <ScreenLoader label="Loading your wellness dashboard..." />;
  if (!user) return <ScreenLoader label="Loading your wellness dashboard..." />;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] transition-colors duration-500">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 p-4 md:flex-row md:p-6">
        <aside className="glass-panel md:sticky md:top-6 md:h-[calc(100vh-3rem)] md:w-72">
          <div className="flex items-center justify-between gap-3">
            <Brand />
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--muted)] transition hover:text-[var(--text)]"
            >
              {theme === "light" ? "☾" : "☀"}
            </button>
          </div>

          <div className="mt-6 rounded-3xl bg-[var(--soft)] p-4">
            <p className="text-sm text-[var(--muted)]">Welcome back</p>
            <h2 className="mt-1 text-2xl font-semibold">{firstName(user.name)}</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">A gentle space for support, reflection, and daily balance.</p>
          </div>

          <nav className="mt-6 grid gap-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent-shadow)]"
                      : "bg-transparent text-[var(--muted)] hover:bg-[var(--soft)] hover:text-[var(--text)]"
                  }`
                }
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-6 grid gap-3">
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              className="rounded-2xl bg-rose-500 px-4 py-3 text-sm font-semibold text-white transition hover:translate-y-[-1px] hover:bg-rose-600"
            >
              Emergency Help
            </button>
            <button
              type="button"
              onClick={() => {
                logout();
                navigate("/dashboard", { replace: true });
              }}
              className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--soft)]"
            >
              Logout
            </button>
          </div>
        </aside>

        <main className="flex-1">
          <div className="glass-panel min-h-full">
            <header className="mb-8 flex flex-col gap-4 border-b border-[var(--border)] pb-6 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-[var(--muted)]">Serenity Mind</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">{titles[location.pathname] ?? "Serenity Mind"}</h1>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  {mode === "backend" ? "Backend connected" : "Demo preview"}
                </span>
                <span className="rounded-full bg-[var(--soft)] px-4 py-2 text-sm text-[var(--muted)]">
                  {user.email}
                </span>
              </div>
            </header>

            {mode === "demo" && (
              <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
                Frontend preview is in demo mode because the Python API is offline. Start the backend to enable real JWT auth, SQLite persistence, and server-side AI endpoints.
              </div>
            )}

            <Outlet />
          </div>
        </main>
      </div>

      {helpOpen && <EmergencyModal onClose={() => setHelpOpen(false)} />}
    </div>
  );
}

function ScreenLoader({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-6 text-[var(--text)]">
      <div className="glass-panel max-w-md text-center">
        <div className="mx-auto h-14 w-14 animate-[pulse_1.8s_ease-in-out_infinite] rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.95),rgba(106,164,171,0.95))]" />
        <h1 className="mt-6 text-2xl font-semibold">Serenity Mind</h1>
        <p className="mt-3 text-[var(--muted)]">{label}</p>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] text-xl text-white shadow-lg shadow-[var(--accent-shadow)]">
        ✦
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">AI Mental Health</p>
        <h1 className="text-lg font-semibold">Serenity Mind</h1>
      </div>
    </div>
  );
}

function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--bg)] px-4 py-6 text-[var(--text)] transition-colors duration-500 md:px-6">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--card)] shadow-[0_20px_70px_rgba(27,53,73,0.08)] md:grid-cols-[1.15fr_0.95fr]">
        <section className="relative hidden overflow-hidden bg-[linear-gradient(160deg,#dff3f1,#f5fbfb_45%,#dbeeff)] p-10 md:flex md:flex-col md:justify-between dark:bg-[linear-gradient(160deg,#10252c,#10202b_45%,#0f1825)]">
          <div>
            <Brand />
            <div className="mt-16 max-w-xl">
              <h2 className="text-5xl font-semibold leading-tight tracking-tight">
                Gentle support for your daily mental wellness.
              </h2>
              <p className="mt-6 text-lg text-[var(--muted)]">
                Chat safely, track moods, play calming games, listen to soothing meditation audio, and build healthier routines in one clean wellness space.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ["Mood tracking", "Log how you feel in a few seconds."],
              ["Safe AI chat", "Mental-health focused replies with topic filtering."],
              ["Daily rituals", "Tasks, music, and games that support balance."],
            ].map(([heading, copy]) => (
              <div key={heading} className="rounded-3xl border border-white/50 bg-white/60 p-4 backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
                <p className="text-sm font-semibold">{heading}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">{copy}</p>
              </div>
            ))}
          </div>

          <div className="pointer-events-none absolute inset-x-[-10%] bottom-[-12%] h-64 rounded-full bg-[radial-gradient(circle,rgba(111,193,180,0.30),rgba(111,193,180,0))] blur-3xl" />
        </section>

        <section className="flex items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-md">
            <p className="text-sm uppercase tracking-[0.28em] text-[var(--muted)]">Welcome</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-3 text-[var(--muted)]">{subtitle}</p>
            <div className="mt-8">{children}</div>
            <div className="mt-6 text-sm text-[var(--muted)]">{footer}</div>
          </div>
        </section>
      </div>
    </div>
  );
}

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!emailLooksValid(normalizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    try {
      setSubmitting(true);
      await login(normalizedEmail, password);
      navigate("/dashboard", { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleForgotPassword() {
    if (!emailLooksValid(forgotEmail)) {
      setError("Enter a valid email to simulate the reset flow.");
      return;
    }
    setError(null);
    setStatus(`Password reset flow started for ${forgotEmail}. Check your inbox in a real backend deployment.`);
    setForgotOpen(false);
    setForgotEmail("");
  }

  return (
    <AuthShell
      title="Log in"
      subtitle="Enter your details to access your chatbot, tasks, meditation music, and wellness games."
      footer={
        <>
          New here?{" "}
          <Link className="font-semibold text-[var(--accent)]" to="/signup">
            Create an account
          </Link>
        </>
      }
    >
      <form className="grid gap-4" onSubmit={handleSubmit}>
        <Field label="Email address">
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            className="input-field"
            placeholder="you@example.com"
          />
        </Field>
        <Field label="Password">
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            className="input-field"
            placeholder="Enter your password"
          />
        </Field>

        <button
          type="button"
          onClick={() => setForgotOpen((current) => !current)}
          className="justify-self-start text-sm font-medium text-[var(--accent)]"
        >
          Forgot password?
        </button>

        {forgotOpen && (
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--soft)] p-4">
            <p className="text-sm font-medium">Password reset simulation</p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <input
                value={forgotEmail}
                onChange={(event) => setForgotEmail(event.target.value)}
                type="email"
                className="input-field flex-1"
                placeholder="your email"
              />
              <button type="button" onClick={handleForgotPassword} className="primary-button whitespace-nowrap">
                Start reset
              </button>
            </div>
          </div>
        )}

        {error && <Feedback tone="error">{error}</Feedback>}
        {status && <Feedback tone="success">{status}</Feedback>}

        <button type="submit" disabled={submitting} className="primary-button mt-2">
          {submitting ? "Signing in..." : "Log in"}
        </button>
      </form>
    </AuthShell>
  );
}

function SignupPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [verification, setVerification] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setVerification(null);

    if (!form.email.trim()) {
      setError("Please enter an email.");
      return;
    }

    if (!form.password.trim()) {
      setError("Please enter a password.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setSubmitting(true);
      const notice = await register({
        name: form.name.trim() || "User",
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        password: form.password,
      });
      setVerification(notice);
      navigate("/dashboard", { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create your account.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Create account"
      subtitle="Build your private wellness space with mood logs, supportive AI chat, daily tasks, and calm experiences."
      footer={
        <>
          Already have an account?{" "}
          <Link className="font-semibold text-[var(--accent)]" to="/login">
            Log in instead
          </Link>
        </>
      }
    >
      <form className="grid gap-4" onSubmit={handleSubmit}>
        <Field label="Name (optional)">
          <input
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            className="input-field"
            placeholder="Your name"
          />
        </Field>
        <Field label="Email address">
          <input
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            type="email"
            className="input-field"
            placeholder="your@email.com"
          />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Password">
            <input
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              type="password"
              className="input-field"
              placeholder="Your password"
            />
          </Field>
          <Field label="Confirm password">
            <input
              value={form.confirmPassword}
              onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
              type="password"
              className="input-field"
              placeholder="Repeat password"
            />
          </Field>
        </div>

        <p className="rounded-2xl bg-[var(--soft)] px-4 py-3 text-sm text-[var(--muted)]">
          Simple sign-up: Email + password only. That's it!
        </p>

        {error && <Feedback tone="error">{error}</Feedback>}
        {verification && <Feedback tone="success">{verification}</Feedback>}

        <button type="submit" disabled={submitting} className="primary-button mt-2">
          {submitting ? "Creating account..." : "Create account"}
        </button>
      </form>
    </AuthShell>
  );
}

function DashboardPage() {
  const { user } = useAuth();
  const [moods, setMoods] = useState<MoodEntry[]>([]);
  const [taskStats, setTaskStats] = useState<TaskStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  async function loadDashboard() {
    try {
      setLoading(true);
      const [moodHistory, stats] = await Promise.all([appApi.getMoodHistory(7), appApi.getTaskStats()]);
      setMoods(moodHistory);
      setTaskStats(stats);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  async function logMood(mood: string) {
    await appApi.saveMood(mood);
    setMessage(`Mood logged as ${mood}.`);
    await loadDashboard();
  }

  const weeklyCompletion =
    taskStats?.weekly_progress.reduce((sum, day) => sum + day.completed, 0) ?? 0;

  return (
    <div className="grid gap-6">
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="overflow-hidden">
          <div className="relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(111,193,180,0.30),transparent_40%)]" />
            <div className="relative grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
              <div>
                <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">Welcome home</p>
                <h2 className="mt-3 text-4xl font-semibold tracking-tight">Hi {firstName(user?.name)}, how are you feeling today?</h2>
                <p className="mt-4 max-w-xl text-[var(--muted)]">
                  Use your dashboard to check in with yourself, jump into a supportive conversation, or choose a calming activity that helps you feel grounded.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link to="/chat" className="primary-button">
                    Open chatbot
                  </Link>
                  <Link to="/tasks" className="secondary-button">
                    View daily tasks
                  </Link>
                </div>
              </div>
              <div className="grid gap-4">
                <div className="rounded-3xl bg-[var(--soft)] p-5">
                  <p className="text-sm text-[var(--muted)]">Current streak</p>
                  <p className="mt-2 text-3xl font-semibold">{taskStats?.streak_days ?? 0} days</p>
                  <p className="mt-2 text-sm text-[var(--muted)]">Complete all of today’s wellbeing tasks to extend your streak.</p>
                </div>
                <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5">
                  <p className="text-sm text-[var(--muted)]">Weekly completions</p>
                  <p className="mt-2 text-3xl font-semibold">{weeklyCompletion}</p>
                  <p className="mt-2 text-sm text-[var(--muted)]">Tasks completed over the last 7 days.</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <SectionTitle title="Mood tracker" subtitle="Log a quick emotional check-in with one tap." />
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {moodChoices.map((mood) => (
              <button
                key={mood.value}
                type="button"
                onClick={() => void logMood(mood.value)}
                className="rounded-3xl border border-[var(--border)] bg-[var(--card)] px-4 py-5 text-left transition hover:translate-y-[-1px] hover:bg-[var(--soft)]"
              >
                <div className="text-2xl">{mood.emoji}</div>
                <p className="mt-3 font-medium">{mood.label}</p>
              </button>
            ))}
          </div>
          {message && <div className="mt-4"><Feedback tone="success">{message}</Feedback></div>}
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <SectionTitle title="Quick access" subtitle="Move to the area that matches what you need most right now." />
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {[
              {
                to: "/chat",
                title: "AI Chatbot",
                copy: "Share what’s on your mind with a supportive, topic-filtered assistant.",
                accent: "from-[#8ed2c6] to-[#88b9e7]",
              },
              {
                to: "/games",
                title: "Wellness Games",
                copy: "Use breathing, gratitude, and focus games to reset your attention.",
                accent: "from-[#a6dca0] to-[#8fd0cf]",
              },
              {
                to: "/music",
                title: "Meditation Music",
                copy: "Stream ambient tracks and use a gentle focus timer.",
                accent: "from-[#a1c4fd] to-[#c2e9fb]",
              },
              {
                to: "/tasks",
                title: "Daily Tasks",
                copy: "Build consistency with a caring, realistic routine.",
                accent: "from-[#d4f4dd] to-[#a8d8ea]",
              },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="group overflow-hidden rounded-[1.75rem] border border-[var(--border)] bg-[var(--card)] p-5 transition hover:translate-y-[-2px]"
              >
                <div className={`h-2 rounded-full bg-gradient-to-r ${item.accent}`} />
                <h3 className="mt-5 text-xl font-semibold">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{item.copy}</p>
                <p className="mt-5 text-sm font-semibold text-[var(--accent)] transition group-hover:translate-x-1">Open section →</p>
              </Link>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle title="Recent mood history" subtitle="Your latest emotional snapshots from the past week." />
          {loading ? (
            <div className="mt-6"><MiniLoader /></div>
          ) : moods.length ? (
            <div className="mt-5 space-y-3">
              {moods.slice(0, 6).map((entry) => {
                const moodMeta = moodChoices.find((item) => item.value === entry.mood);
                return (
                  <div key={entry.id} className="flex items-center justify-between rounded-2xl bg-[var(--soft)] px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{moodMeta?.emoji ?? "🙂"}</span>
                      <div>
                        <p className="font-medium capitalize">{entry.mood}</p>
                        <p className="text-sm text-[var(--muted)]">Logged check-in</p>
                      </div>
                    </div>
                    <p className="text-sm text-[var(--muted)]">{formatDateTime(entry.created_at)}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState title="No mood entries yet" copy="Tap an emoji above to begin tracking your emotional check-ins." />
          )}
        </Card>
      </section>
    </div>
  );
}

function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadHistory() {
      try {
        setLoading(true);
        const history = await appApi.getChatHistory(1, 50);
        if (mounted) setMessages(history);
      } catch (historyError) {
        if (mounted) {
          setError(historyError instanceof Error ? historyError.message : "Could not load chat history.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadHistory();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    const optimisticMessage: ChatMessage = {
      id: Date.now(),
      role: "user",
      content: trimmed,
      created_at: new Date().toISOString(),
    };

    setMessages((current) => [...current, optimisticMessage]);
    setInput("");
    setSending(true);
    setError(null);

    try {
      const result = await appApi.sendMessage(trimmed);
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: "bot",
          content: result.response,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Unable to send your message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <Card className="flex min-h-[70vh] flex-col">
        <SectionTitle title="Supportive conversation" subtitle="The assistant stays focused on mental health topics and loads your saved chat history." />

        <div ref={listRef} className="mt-6 flex-1 space-y-4 overflow-y-auto rounded-[1.75rem] bg-[var(--soft)] p-4">
          {loading ? (
            <MiniLoader />
          ) : messages.length ? (
            messages.map((message) => (
              <div key={`${message.id}-${message.role}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-[1.5rem] px-4 py-3 shadow-sm ${
                    message.role === "user"
                      ? "bg-[var(--accent)] text-white"
                      : message.content.includes("Please keep the conversation focused on mental health")
                        ? "border border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100"
                        : "bg-[var(--card)] text-[var(--text)]"
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                  <p className={`mt-2 text-[11px] ${message.role === "user" ? "text-white/80" : "text-[var(--muted)]"}`}>
                    {formatDateTime(message.created_at)}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              title="No conversations yet"
              copy="Start with something like: ‘I’ve been feeling anxious at work lately.’"
            />
          )}

          {sending && (
            <div className="flex justify-start">
              <div className="rounded-[1.5rem] bg-[var(--card)] px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                  <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[var(--accent)] [animation-delay:-0.2s]" />
                  <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[var(--accent)] [animation-delay:-0.1s]" />
                  <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[var(--accent)]" />
                  thinking this through...
                </div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSend} className="mt-5 flex flex-col gap-3 sm:flex-row">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Share how you’re feeling, what’s been stressful, or what support you need..."
            className="input-field min-h-28 flex-1 resize-none"
          />
          <button type="submit" disabled={sending} className="primary-button min-w-32 self-stretch sm:self-auto">
            Send
          </button>
        </form>

        {error && <div className="mt-4"><Feedback tone="error">{error}</Feedback></div>}
      </Card>

      <div className="grid gap-6">
        <Card>
          <SectionTitle title="Safe usage guide" subtitle="A gentle reminder about what the chatbot is built for." />
          <ul className="mt-5 space-y-3 text-sm leading-6 text-[var(--muted)]">
            <li>• Best for stress, anxiety, sleep, burnout, low mood, self-care, and relationships.</li>
            <li>• Off-topic queries like coding, finance, or violent requests are politely blocked.</li>
            <li>• In a crisis, please use the Emergency Help button for real human support immediately.</li>
          </ul>
        </Card>

        <Card>
          <SectionTitle title="Conversation prompts" subtitle="Try one of these to get started." />
          <div className="mt-5 grid gap-3">
            {[
              "I’ve been feeling overwhelmed this week and don’t know where to start.",
              "How can I calm down when my anxiety spikes at night?",
              "I’m feeling lonely lately—can you help me reflect on that?",
              "Can you help me build a small self-care plan for today?",
            ].map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => setInput(prompt)}
                className="rounded-2xl border border-[var(--border)] bg-[var(--soft)] px-4 py-3 text-left text-sm transition hover:bg-[var(--card)]"
              >
                {prompt}
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function GamesPage() {
  const [stats, setStats] = useState<GameStat[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  const [breathingActive, setBreathingActive] = useState(false);
  const [breathingPhaseIndex, setBreathingPhaseIndex] = useState(0);
  const [breathingSecondsLeft, setBreathingSecondsLeft] = useState(breathingPhases[0].seconds);
  const breathingStartRef = useRef<number | null>(null);

  const [gratitudeItems, setGratitudeItems] = useState(["", "", ""]);
  const [launchedBalloons, setLaunchedBalloons] = useState<string[]>([]);

  const [cards, setCards] = useState<Array<{ id: number; icon: string; revealed: boolean; matched: boolean }>>([]);
  const [firstPick, setFirstPick] = useState<number | null>(null);
  const [secondPick, setSecondPick] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [puzzleWon, setPuzzleWon] = useState(false);
  const puzzleStartRef = useRef<number | null>(null);

  async function loadStats() {
    const data = await appApi.getGameStats();
    setStats(data);
  }

  useEffect(() => {
    void loadStats();
    resetPuzzle();
  }, []);

  useEffect(() => {
    if (!breathingActive) return undefined;

    const interval = window.setInterval(() => {
      setBreathingSecondsLeft((current) => {
        if (current > 1) return current - 1;
        setBreathingPhaseIndex((phaseIndex) => (phaseIndex + 1) % breathingPhases.length);
        return breathingPhases[(breathingPhaseIndex + 1) % breathingPhases.length].seconds;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [breathingActive, breathingPhaseIndex]);

  useEffect(() => {
    if (!cards.length || puzzleWon || !puzzleStartRef.current) return;
    if (cards.every((card) => card.matched)) {
      setPuzzleWon(true);
      const duration = Math.max(10, Math.round((Date.now() - puzzleStartRef.current) / 1000));
      void appApi.logGameSession({ game_type: "pattern_match", duration_seconds: duration }).then(() => {
        setStatus(`Pattern Match completed in ${duration} seconds.`);
        void loadStats();
      });
    }
  }, [cards, puzzleWon]);

  function startBreathing() {
    breathingStartRef.current = Date.now();
    setBreathingActive(true);
    setBreathingPhaseIndex(0);
    setBreathingSecondsLeft(breathingPhases[0].seconds);
    setStatus("Breathing session started.");
  }

  async function stopBreathing() {
    setBreathingActive(false);
    setBreathingPhaseIndex(0);
    setBreathingSecondsLeft(breathingPhases[0].seconds);
    if (!breathingStartRef.current) return;
    const duration = Math.max(5, Math.round((Date.now() - breathingStartRef.current) / 1000));
    breathingStartRef.current = null;
    await appApi.logGameSession({ game_type: "breathing_exercise", duration_seconds: duration });
    setStatus(`Breathing session logged for ${duration} seconds.`);
    await loadStats();
  }

  async function launchBalloons() {
    const cleanItems = gratitudeItems.map((item) => item.trim()).filter(Boolean);
    if (cleanItems.length < 3) {
      setStatus("Please add 3 gratitude notes before launching your balloons.");
      return;
    }

    setLaunchedBalloons(cleanItems);
    await appApi.logGameSession({ game_type: "gratitude_balloon", duration_seconds: 120 });
    setStatus("Gratitude Balloon session saved.");
    await loadStats();
  }

  function resetPuzzle() {
    const icons = ["☁", "☀", "☾", "❀"];
    const shuffled = [...icons, ...icons]
      .map((icon, index) => ({ id: index + 1, icon, revealed: false, matched: false }))
      .sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setFirstPick(null);
    setSecondPick(null);
    setMoves(0);
    setPuzzleWon(false);
    puzzleStartRef.current = Date.now();
  }

  function handleCardClick(cardId: number) {
    if (secondPick !== null) return;

    const currentCard = cards.find((card) => card.id === cardId);
    if (!currentCard || currentCard.revealed || currentCard.matched) return;

    const nextCards = cards.map((card) => (card.id === cardId ? { ...card, revealed: true } : card));
    setCards(nextCards);

    if (firstPick === null) {
      setFirstPick(cardId);
      return;
    }

    setSecondPick(cardId);
    setMoves((current) => current + 1);

    const firstCard = nextCards.find((card) => card.id === firstPick);
    const secondCard = nextCards.find((card) => card.id === cardId);
    const isMatch = firstCard?.icon === secondCard?.icon;

    window.setTimeout(() => {
      setCards((current) =>
        current.map((card) => {
          if (card.id !== firstPick && card.id !== cardId) return card;
          if (isMatch) return { ...card, matched: true, revealed: true };
          return { ...card, revealed: false };
        }),
      );
      setFirstPick(null);
      setSecondPick(null);
    }, 650);
  }

  const currentPhase = breathingPhases[breathingPhaseIndex];
  const currentScale = breathingActive ? currentPhase.scale : 1;

  return (
    <div className="grid gap-6">
      {status && <Feedback tone="success">{status}</Feedback>}

      <section className="grid gap-6 xl:grid-cols-3">
        <Card>
          <SectionTitle title="1. Breathing Exercise" subtitle="Follow the 4-7-8 rhythm to settle your body." />
          <div className="mt-8 flex flex-col items-center justify-center">
            <div
              className="flex h-44 w-44 items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.95),rgba(111,193,180,0.5),rgba(111,193,180,0.7))] text-center text-white shadow-[0_22px_60px_rgba(111,193,180,0.35)] transition duration-1000"
              style={{ transform: `scale(${currentScale})` }}
            >
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-white/80">{breathingActive ? currentPhase.label : "Ready"}</p>
                <p className="mt-2 text-3xl font-semibold">{breathingActive ? breathingSecondsLeft : "4·7·8"}</p>
              </div>
            </div>
            <div className="mt-8 flex gap-3">
              {!breathingActive ? (
                <button type="button" onClick={startBreathing} className="primary-button">
                  Start session
                </button>
              ) : (
                <button type="button" onClick={() => void stopBreathing()} className="secondary-button">
                  End session
                </button>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <SectionTitle title="2. Gratitude Balloon" subtitle="Write three things you appreciate and let them float upward." />
          <div className="mt-5 grid gap-3">
            {gratitudeItems.map((item, index) => (
              <input
                key={`gratitude-${index + 1}`}
                value={item}
                onChange={(event) =>
                  setGratitudeItems((current) => current.map((entry, itemIndex) => (itemIndex === index ? event.target.value : entry)))
                }
                className="input-field"
                placeholder={`Gratitude note ${index + 1}`}
              />
            ))}
          </div>
          <button type="button" onClick={() => void launchBalloons()} className="primary-button mt-5">
            Launch balloons
          </button>
          <div className="balloon-stage mt-6 min-h-52 overflow-hidden rounded-[1.75rem] bg-[linear-gradient(180deg,rgba(223,243,241,0.9),rgba(255,255,255,0.75))] p-4 dark:bg-[linear-gradient(180deg,rgba(13,29,34,0.95),rgba(10,18,27,0.92))]">
            {launchedBalloons.length ? (
              launchedBalloons.map((balloon, index) => (
                <div
                  key={`${balloon}-${index}`}
                  className="balloon-float absolute bottom-0 rounded-full px-5 py-6 text-center text-sm font-medium text-white shadow-lg"
                  style={{
                    left: `${16 + index * 28}%`,
                    animationDelay: `${index * 0.5}s`,
                    background: ["#7dcfb6", "#88b7ff", "#ff9ec2"][index % 3],
                  }}
                >
                  <span className="block max-w-28">{balloon}</span>
                </div>
              ))
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">
                Your gratitude balloons will rise here.
              </div>
            )}
          </div>
        </Card>

        <Card>
          <SectionTitle title="3. Pattern Match" subtitle="A calm memory game to focus your attention away from spiraling thoughts." />
          <div className="mt-5 flex items-center justify-between text-sm text-[var(--muted)]">
            <span>Moves: {moves}</span>
            <button type="button" onClick={resetPuzzle} className="secondary-button px-4 py-2 text-sm">
              New game
            </button>
          </div>
          <div className="mt-5 grid grid-cols-4 gap-3">
            {cards.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => handleCardClick(card.id)}
                className={`flex aspect-square items-center justify-center rounded-3xl border text-2xl transition ${
                  card.revealed || card.matched
                    ? "border-[var(--accent)] bg-[var(--soft)]"
                    : "border-[var(--border)] bg-[var(--card)] hover:bg-[var(--soft)]"
                }`}
              >
                {card.revealed || card.matched ? card.icon : "•"}
              </button>
            ))}
          </div>
          {puzzleWon && <div className="mt-5"><Feedback tone="success">You completed the puzzle. Nicely done.</Feedback></div>}
        </Card>
      </section>

      <Card>
        <SectionTitle title="Game session insights" subtitle="Every session is stored so you can see which calming tools you use most often." />
        {stats.length ? (
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {stats.map((item) => (
              <div key={item.game_type} className="rounded-3xl bg-[var(--soft)] p-5">
                <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">
                  {item.game_type.split("_").join(" ")}
                </p>
                <p className="mt-3 text-3xl font-semibold">{item.sessions}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">Sessions logged</p>
                <p className="mt-4 text-sm font-medium text-[var(--text)]">Total time: {formatDuration(item.total_time_seconds)}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No game data yet" copy="Start a breathing session, launch gratitude balloons, or finish a puzzle to build your activity log." />
        )}
      </Card>
    </div>
  );
}

function MusicPage() {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.65);
  const [looping, setLooping] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(10);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadTracks() {
      const musicTracks = await appApi.getMusicTracks();
      if (!mounted) return;
      setTracks(musicTracks);
      setSelectedTrack(musicTracks[0] ?? null);
    }

    void loadTracks();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = volume;
    audioRef.current.loop = looping;
  }, [volume, looping]);

  useEffect(() => {
    if (!timerRunning) return undefined;
    if (remainingSeconds <= 0) {
      setTimerRunning(false);
      playChime();
      setMessage("Focus timer complete. Take a gentle breath.");
      return undefined;
    }

    const interval = window.setInterval(() => {
      setRemainingSeconds((current) => current - 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [timerRunning, remainingSeconds]);

  async function togglePlayback() {
    if (!audioRef.current || !selectedTrack) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    try {
      await audioRef.current.play();
      setIsPlaying(true);
    } catch {
      setMessage("Playback was blocked by the browser. Try pressing play again.");
    }
  }

  function startTimer(minutes: number) {
    setTimerMinutes(minutes);
    setRemainingSeconds(minutes * 60);
    setTimerRunning(true);
    setMessage(`Focus timer started for ${minutes} minutes.`);
  }

  function stopTimer() {
    setTimerRunning(false);
    setRemainingSeconds(0);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <Card>
        <SectionTitle title="Meditation player" subtitle="A minimalist audio space with five calming ambient tracks." />
        <audio
          ref={audioRef}
          src={selectedTrack?.url}
          onEnded={() => setIsPlaying(false)}
          onTimeUpdate={(event) => setProgress(event.currentTarget.currentTime)}
          onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
        />

        <div className="mt-6 rounded-[2rem] bg-[linear-gradient(160deg,#dff3f1,#f3fbfb)] p-6 dark:bg-[linear-gradient(160deg,#10252c,#111d26)]">
          <p className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">Now playing</p>
          <h3 className="mt-3 text-2xl font-semibold">{selectedTrack?.title ?? "Select a track"}</h3>
          <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/60 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent),var(--accent-2))]"
              style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-sm text-[var(--muted)]">
            <span>{formatDuration(Math.floor(progress))}</span>
            <span>{formatDuration(Math.floor(duration || 0))}</span>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={() => void togglePlayback()} className="primary-button">
              {isPlaying ? "Pause" : "Play"}
            </button>
            <button type="button" onClick={() => setLooping((current) => !current)} className="secondary-button">
              Loop: {looping ? "On" : "Off"}
            </button>
          </div>
          <div className="mt-6">
            <label className="text-sm font-medium text-[var(--muted)]">Volume</label>
            <input
              value={volume}
              onChange={(event) => setVolume(Number(event.target.value))}
              type="range"
              min="0"
              max="1"
              step="0.01"
              className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-[var(--border)]"
            />
          </div>
        </div>

        {message && <div className="mt-4"><Feedback tone="success">{message}</Feedback></div>}
      </Card>

      <div className="grid gap-6">
        <Card>
          <SectionTitle title="Track library" subtitle="Pick from rain, piano, bowls, ocean, and forest ambience." />
          <div className="mt-5 grid gap-3">
            {tracks.map((track) => (
              <button
                key={track.id}
                type="button"
                onClick={() => {
                  setSelectedTrack(track);
                  setProgress(0);
                  setDuration(0);
                  setIsPlaying(false);
                  setMessage(`Selected ${track.title}.`);
                }}
                className={`rounded-3xl border px-4 py-4 text-left transition ${
                  selectedTrack?.id === track.id
                    ? "border-[var(--accent)] bg-[var(--soft)]"
                    : "border-[var(--border)] bg-[var(--card)] hover:bg-[var(--soft)]"
                }`}
              >
                <p className="font-medium">{track.title}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">Ambient meditation audio</p>
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle title="Focus timer" subtitle="Set a gentle meditation countdown and hear a soft chime when time is up." />
          <div className="mt-5 flex flex-wrap gap-3">
            {[5, 10, 15].map((minutes) => (
              <button
                key={minutes}
                type="button"
                onClick={() => startTimer(minutes)}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  timerMinutes === minutes
                    ? "bg-[var(--accent)] text-white"
                    : "border border-[var(--border)] bg-[var(--card)] text-[var(--text)]"
                }`}
              >
                {minutes} min
              </button>
            ))}
            <button type="button" onClick={stopTimer} className="secondary-button">
              Stop timer
            </button>
          </div>
          <div className="mt-6 rounded-3xl bg-[var(--soft)] p-6 text-center">
            <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">Remaining</p>
            <p className="mt-3 text-5xl font-semibold">{formatDuration(remainingSeconds)}</p>
            <p className="mt-3 text-sm text-[var(--muted)]">{timerRunning ? "Stay with your breath and let the soundscape hold the background." : "Choose a duration to begin."}</p>
          </div>
        </Card>
      </div>
    </div>
  );
}

function TasksPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [newTask, setNewTask] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  async function loadTasks() {
    try {
      setLoading(true);
      const [taskItems, taskStats] = await Promise.all([appApi.getTasks(), appApi.getTaskStats()]);
      setTasks(taskItems);
      setStats(taskStats);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTasks();
  }, []);

  async function toggleTask(taskId: number) {
    await appApi.toggleTask(taskId);
    setMessage("Task updated.");
    await loadTasks();
  }

  async function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newTask.trim()) return;
    await appApi.addTask(newTask.trim());
    setNewTask("");
    setMessage("Custom task added.");
    await loadTasks();
  }

  const completed = tasks.filter((task) => task.completed).length;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.85fr]">
      <div className="grid gap-6">
        <Card>
          <SectionTitle title="Today’s wellbeing tasks" subtitle="Pre-defined habits reset each day, and your completion history is saved." />
          <form onSubmit={addTask} className="mt-5 flex flex-col gap-3 sm:flex-row">
            <input
              value={newTask}
              onChange={(event) => setNewTask(event.target.value)}
              className="input-field flex-1"
              placeholder="Add a custom mental wellness task"
            />
            <button type="submit" className="primary-button whitespace-nowrap">
              Add task
            </button>
          </form>
          {message && <div className="mt-4"><Feedback tone="success">{message}</Feedback></div>}
          <div className="mt-6 space-y-3">
            {loading ? (
              <MiniLoader />
            ) : (
              tasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => void toggleTask(task.id)}
                  className="flex w-full items-center gap-4 rounded-3xl border border-[var(--border)] bg-[var(--card)] px-4 py-4 text-left transition hover:bg-[var(--soft)]"
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full border text-sm ${
                      task.completed
                        ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                        : "border-[var(--border)] text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                  <div className="flex-1">
                    <p className={`font-medium ${task.completed ? "text-[var(--muted)] line-through" : "text-[var(--text)]"}`}>
                      {task.title}
                    </p>
                    <p className="mt-1 text-sm text-[var(--muted)]">{task.is_custom ? "Custom habit" : "Daily default"}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-6">
        <Card>
          <SectionTitle title="Progress summary" subtitle="See today’s momentum at a glance." />
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-3xl bg-[var(--soft)] p-5">
              <p className="text-sm text-[var(--muted)]">Completed today</p>
              <p className="mt-2 text-4xl font-semibold">{completed}/{tasks.length}</p>
            </div>
            <div className="rounded-3xl bg-[var(--soft)] p-5">
              <p className="text-sm text-[var(--muted)]">Current streak</p>
              <p className="mt-2 text-4xl font-semibold">{stats?.streak_days ?? 0}</p>
            </div>
          </div>
        </Card>

        <Card>
          <SectionTitle title="Weekly progress" subtitle="Each day’s bar reflects completed tasks versus total tasks." />
          <div className="mt-5 space-y-4">
            {stats?.weekly_progress.map((day) => {
              const percent = day.total ? Math.round((day.completed / day.total) * 100) : 0;
              return (
                <div key={day.date}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium">{new Date(day.date).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}</span>
                    <span className="text-[var(--muted)]">{day.completed}/{day.total || 0}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-[var(--soft)]">
                    <div className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent),var(--accent-2))]" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

function ProfilePage() {
  const { user, setUser, refreshProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [profileForm, setProfileForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirmPassword: "",
  });
  const [deleteText, setDeleteText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setProfileForm({
      name: user?.name ?? "",
      email: user?.email ?? "",
      phone: user?.phone ?? "",
    });
  }, [user]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!profileForm.name.trim()) {
      setError("Name cannot be empty.");
      return;
    }

    if (!emailLooksValid(profileForm.email)) {
      setError("Please enter a valid email.");
      return;
    }

    const updated = await appApi.updateProfile(profileForm);
    setUser(updated);
    await refreshProfile();
    setMessage("Profile updated successfully.");
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!passwordForm.current_password) {
      setError("Please enter your current password.");
      return;
    }

    if (!passwordForm.new_password) {
      setError("Please enter a new password.");
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    const result = await appApi.changePassword({
      current_password: passwordForm.current_password,
      new_password: passwordForm.new_password,
    });

    setPasswordForm({ current_password: "", new_password: "", confirmPassword: "" });
    setMessage(result.message);
  }

  async function deleteAccount() {
    if (deleteText !== "DELETE") {
      setError("Type DELETE to confirm account removal.");
      return;
    }

    await appApi.deleteAccount();
    logout();
    navigate("/dashboard", { replace: true });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
      <Card>
        <SectionTitle title="Profile details" subtitle="Update your identity and contact details stored in the backend." />
        <form onSubmit={saveProfile} className="mt-5 grid gap-4">
          <Field label="Full name">
            <input
              value={profileForm.name}
              onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))}
              className="input-field"
            />
          </Field>
          <Field label="Email address">
            <input
              value={profileForm.email}
              onChange={(event) => setProfileForm((current) => ({ ...current, email: event.target.value }))}
              type="email"
              className="input-field"
            />
          </Field>
          <Field label="Phone number">
            <input
              value={profileForm.phone}
              onChange={(event) => setProfileForm((current) => ({ ...current, phone: event.target.value }))}
              type="tel"
              className="input-field"
            />
          </Field>
          <button type="submit" className="primary-button mt-2">
            Save changes
          </button>
        </form>
      </Card>

      <div className="grid gap-6">
        <Card>
          <SectionTitle title="Change password" subtitle="Update your password anytime." />
          <form onSubmit={savePassword} className="mt-5 grid gap-4">
            <Field label="Current password">
              <input
                value={passwordForm.current_password}
                onChange={(event) => setPasswordForm((current) => ({ ...current, current_password: event.target.value }))}
                type="password"
                className="input-field"
              />
            </Field>
            <Field label="New password">
              <input
                value={passwordForm.new_password}
                onChange={(event) => setPasswordForm((current) => ({ ...current, new_password: event.target.value }))}
                type="password"
                className="input-field"
              />
            </Field>
            <Field label="Confirm new password">
              <input
                value={passwordForm.confirmPassword}
                onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                type="password"
                className="input-field"
              />
            </Field>
            <button type="submit" className="secondary-button mt-2">
              Update password
            </button>
          </form>
        </Card>

        <Card>
          <SectionTitle title="Delete account" subtitle="This permanently removes your profile, moods, chats, tasks, and game history." />
          <div className="mt-5 space-y-4">
            <p className="text-sm text-[var(--muted)]">Type DELETE to confirm permanent removal.</p>
            <input
              value={deleteText}
              onChange={(event) => setDeleteText(event.target.value)}
              className="input-field"
              placeholder="Type DELETE"
            />
            <button type="button" onClick={() => void deleteAccount()} className="rounded-2xl bg-rose-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-600">
              Delete account permanently
            </button>
          </div>
        </Card>

        {(message || error) && <Feedback tone={error ? "error" : "success"}>{error ?? message}</Feedback>}
      </div>
    </div>
  );
}

function EmergencyModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-rose-500">Emergency help</p>
            <h2 className="mt-2 text-2xl font-semibold">You deserve real human support right now.</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-[var(--border)] px-3 py-2 text-sm text-[var(--muted)]">
            Close
          </button>
        </div>
        <p className="mt-4 text-[var(--muted)]">
          If you are in immediate danger or thinking about harming yourself, contact emergency services or a crisis hotline now.
        </p>
        <div className="mt-6 grid gap-3">
          {hotlineItems.map((item) => (
            <div key={item.region} className="rounded-3xl bg-[var(--soft)] px-4 py-4">
              <p className="font-medium">{item.region}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">{item.contact}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-[var(--muted)]">{label}</span>
      {children}
    </label>
  );
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[0_18px_60px_rgba(18,45,61,0.06)] md:p-6 ${className}`}>{children}</section>;
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 text-[var(--muted)]">{subtitle}</p>
    </div>
  );
}

function Feedback({ children, tone }: { children: ReactNode; tone: "success" | "error" }) {
  const styles =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-100"
      : "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-100";

  return <div className={`rounded-2xl border px-4 py-3 text-sm ${styles}`}>{children}</div>;
}

function EmptyState({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="mt-6 rounded-[1.75rem] border border-dashed border-[var(--border)] bg-[var(--soft)] px-5 py-10 text-center">
      <p className="text-lg font-semibold">{title}</p>
      <p className="mt-2 text-sm text-[var(--muted)]">{copy}</p>
    </div>
  );
}

function MiniLoader() {
  return (
    <div className="flex items-center gap-3 text-sm text-[var(--muted)]">
      <span className="h-3 w-3 animate-pulse rounded-full bg-[var(--accent)]" />
      Loading...
    </div>
  );
}

function playChime() {
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;

  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = 660;
  gain.gain.value = 0.02;

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();

  setTimeout(() => {
    oscillator.stop();
    void context.close();
  }, 700);
}

export default App;
