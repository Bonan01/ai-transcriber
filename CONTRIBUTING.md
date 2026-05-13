# Contributing to AI Transcriber

Thank you for your interest in contributing! This guide will help you get started.

## Development Setup

### Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- **Git**

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Linux/macOS
pip install -r ../requirements.txt
```

### Frontend

```bash
cd frontend
npm install
```

### Running Locally

1. Start the frontend dev server:
   ```bash
   cd frontend
   npm run dev
   ```
2. In a separate terminal, start the desktop app:
   ```bash
   python app.py
   ```

## Making Changes

1. **Fork** the repository and create a feature branch:
   ```bash
   git checkout -b feature/my-feature
   ```
2. Make your changes, keeping commits focused and descriptive.
3. Test your changes locally (run the app, verify the UI).
4. Push to your fork and open a **Pull Request** against `main`.

## Coding Style

- **Python**: PEP 8, 4-space indentation, type hints where practical.
- **TypeScript/React**: 2-space indentation, functional components.
- Settings are enforced via `.editorconfig` — make sure your editor supports it.

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add support for DOCX export
fix: prevent crash on empty audio file
chore: update dependencies
docs: add architecture diagram
```

## Reporting Issues

- Use GitHub Issues.
- Include steps to reproduce, expected vs. actual behavior.
- If applicable, include log output and your OS/Python/Node versions.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
