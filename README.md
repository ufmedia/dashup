# DashUp

**Reimagining the daily standup** - A modern, real-time standup dashboard for agile teams.

## Features

- **📝 Quick Entry Form** (`/submit`): Three simple questions - projects, blockers, and sync needs
- **📊 Live Dashboard** (`/dashboard`): Real-time updates with charts and metrics
- **⚙️ Admin Panel** (`/admin`): Manage team members and projects
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

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page with navigation |
| `/admin` | CRUD interface for team members and projects |
| `/submit` | Daily standup entry form |
| `/dashboard` | Real-time visualization dashboard |

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
