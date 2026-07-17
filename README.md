# DashUp

**Reimagining the daily standup** - A modern, real-time standup dashboard for agile teams.

## Features

- **� Magic Link Authentication**: Passwordless email-based login
- **📝 Quick Entry Form** (`/submit`): Three simple questions - projects, blockers, and sync needs
- **📊 Live Dashboard** (`/dashboard`): Real-time updates with charts and metrics
- **⚙️ Admin Panel** (`/admin`): Manage team members, projects, and allowed email domains
- **⏱️ Context Switch Tracking**: Automatically calculates time lost (23 min per switch)
- **🔄 Real-time Updates**: Dashboard polls every 5 seconds for live data

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: SQLite (better-sqlite3)
- **Charts**: Recharts

## Quick Start

```bash
# Install dependencies
npm install

# Approve native module scripts (required for SQLite)
npm approve-scripts better-sqlite3

# Set up environment variables
cp .env.example .env.local
# Edit .env.local to set DASHUP_MASTER_PASSWORD

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DASHUP_MASTER_PASSWORD` | Master password for accessing /admin settings page | Yes |
| `NEXT_PUBLIC_BASE_URL` | Base URL for magic links (e.g., https://dashup.example.com) | Production only |
| `MAILGUN_API_KEY` | Mailgun API key | Yes (for email) |
| `MAILGUN_DOMAIN` | Mailgun sending domain (e.g., mg.example.com) | Yes (for email) |
| `MAILGUN_FROM` | From address (default: noreply@{domain}) | No |
| `MAILGUN_EU` | Set to "true" for EU Mailgun endpoint | No |
| `NEXT_PUBLIC_APP_NAME` | App name shown in emails (default: DashUp) | No |
| `MYSQL_HOST` | MySQL host (if using MySQL instead of SQLite) | No |
| `MYSQL_PORT` | MySQL port (default: 3306) | No |
| `MYSQL_USER` | MySQL username | No |
| `MYSQL_PASSWORD` | MySQL password | No |
| `MYSQL_DATABASE` | MySQL database name | No |

## Authentication

DashUp uses magic link authentication:

1. **Email Login**: Users enter their email on the landing page
2. **Domain Validation**: Email domain must be in the allowed list (configured in /admin)
3. **Magic Link**: A secure login link is sent via Mailgun
4. **Registration**: First-time users are prompted to enter their name
5. **Sessions**: Login sessions last 7 days

### Setting Up Authentication

1. Set `DASHUP_MASTER_PASSWORD` in your environment
2. Go to `/admin` and enter the master password
3. Add allowed email domains (e.g., `company.com`)
4. Users can now sign in with emails from those domains

## Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page with email login |
| `/admin` | Settings (requires master password) |
| `/submit` | Daily standup entry form |
| `/dashboard` | Real-time visualization dashboard |
| `/auth/register` | New user registration (after magic link) |

## Getting Started

1. **Setup Data**: Go to `/admin` and add team members and projects
2. **Submit Entries**: Team members visit `/submit` to submit their daily standup
3. **View Dashboard**: Display `/dashboard` on a shared screen during standup

## Data Model

```
TeamMember: id, name, created_at
Project: id, name, created_at
Submission: id, team_member_id, blocked_by_text, created_at
SubmissionProject: submission_id, project_id (junction table)
SubmissionTalkTo: submission_id, team_member_id (junction table)
```

## Dashboard Visualizations

1. **Effort Distribution**: Pie chart showing project selection frequency
2. **Developers per Project**: Bar chart showing team spread
3. **Context Switching Metric**: Total time lost calculated as (N-1) × 23 minutes per submission
4. **Who Needs to Talk to Who**: List of sync requests between team members
5. **Current Blockers**: List of reported blockers

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/team-members` | List all team members |
| POST | `/api/team-members` | Create team member |
| PUT | `/api/team-members/[id]` | Update team member |
| DELETE | `/api/team-members/[id]` | Delete team member |
| GET | `/api/projects` | List all projects |
| POST | `/api/projects` | Create project |
| PUT | `/api/projects/[id]` | Update project |
| DELETE | `/api/projects/[id]` | Delete project |
| GET | `/api/submissions` | Get today's submissions |
| POST | `/api/submissions` | Create submission |
| GET | `/api/dashboard` | Get dashboard analytics data |

## Production Build

```bash
npm run build
npm start
```

## Database

The SQLite database file (`dashup.db`) is created automatically in the project root. For a fresh start, simply delete this file.

## License

MIT
