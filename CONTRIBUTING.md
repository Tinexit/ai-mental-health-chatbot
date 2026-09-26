# Contributing to Serenity Mind

Thank you for your interest in contributing to **Serenity Mind**! Every contribution helps make mental wellness support more accessible. 💚

## 🚀 Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/ai-mental-health-chatbot.git
   cd ai-mental-health-chatbot
   ```
3. **Set up** the development environment (see [README.md](README.md#-quick-start))
4. **Create** a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## 📝 Guidelines

### Code Quality
- Follow existing code style and patterns
- Use TypeScript types properly — avoid `any`
- Add comments for complex logic
- Keep functions small and focused

### Commit Messages
Use clear, descriptive commit messages:
```
feat: add breathing exercise timer
fix: resolve mood tracker date display
docs: update API reference table
style: improve dark mode contrast
```

### Pull Requests
- Write a clear description of what your PR does
- Reference any related issues
- Include screenshots for UI changes
- Ensure the app runs without errors

## 🧪 Testing Locally

### Frontend
```bash
npm run dev
```

### Backend
```bash
uvicorn backend.main:app --reload --port 8000
```

### Build Check
```bash
npm run build
```

## 💡 Ideas for Contributions

- 🌍 Internationalization (i18n) support
- 📊 Advanced mood analytics & charts
- 🎮 New wellness games
- 🔊 Additional meditation tracks
- 🧪 Unit & integration tests
- ♿ Accessibility improvements
- 📱 PWA support
- 🔒 Two-factor authentication

## ⚠️ Important Notes

- **Never commit** `.env` files or API keys
- **Respect** the sensitive nature of mental health — ensure all chatbot responses are empathetic and appropriate
- **Do not** add features that could be harmful to users in vulnerable states

## 📄 License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).

---

Thank you for helping make mental wellness tools more accessible! 🙏
