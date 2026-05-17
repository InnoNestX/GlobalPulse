# Contributing to GlobalPulse

Thank you for your interest in contributing to GlobalPulse!

## Development Setup

```bash
# Clone the repository
git clone git@github.com:InnoNestX/GlobalPulse.git
cd GlobalPulse

# Install dependencies
npm install

# Copy example env file
cp .dev.vars.example .dev.vars

# Start local dev server
npm run dev
```

Open `http://localhost:8787/admin` to access the Admin UI. Set `ADMIN_PASSWORD` in `.dev.vars` before use.

## Code Quality

Before committing, run:

```bash
npm run check    # Runs typecheck and tests
npm run typecheck
npm run test
```

## Project Structure

- `src/` - Main application code
  - `admin-ui.ts` - Admin web UI
  - `config.ts` - Configuration management
  - `providers/` - Push providers (Feishu, WeChat, Telegram)
  - `report.ts` - Report generation logic
  - `scheduler.ts` - Cron scheduling
  - `sources.ts` - News/data source fetching
  - `template.ts` - Message templating

## Pull Request Guidelines

1. Fork the repository and create a feature branch
2. Make your changes and run `npm run check`
3. Write clear commit messages
4. Submit a PR with a description of the changes

## Issue Guidelines

- Use the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.yml) for bugs
- Use the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.yml) for enhancements
- Search existing issues before creating new ones

## Code of Conduct

Be respectful and constructive in all interactions. We follow GitHub's [Community Guidelines](https://help.github.com/articles/github-community-guidelines/).