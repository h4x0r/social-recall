# Social Recall

Personal CRM for **serial entrepreneurs** and **angel investors**. Turn your professional network into a queryable, opportunity-aware knowledge graph.

## Who It's For

**Serial entrepreneurs** who prioritize personal networking and orchestrate grand strategies by integrating talent across niches to form projects. You think in terms of "who do I know that can..." and need a system that remembers context as deeply as you do.

**Angel investors** who leverage weak ties through mutual connections. Your deal flow comes from intros, and knowing *how* you know someone—who introduced you, what you co-invested in, where you crossed paths—is as important as knowing *that* you know them.

If you measure success by the quality of your network and the opportunities it surfaces, Social Recall is built for you.

## Features

- **Relationship Context**: Track *how* you know someone—intro'd by whom, met at what conference, co-invested in what company, worked together where. The context that powers warm intros.
- **Chrome Extension**: Save LinkedIn profiles with one click
- **AI-Powered Skills**: Automatically infer skills from profiles to find the right person for any need
- **Opportunity Detection**: Get notified when contacts start companies or change roles
- **Google Contacts Sync**: Bi-directional sync to see contacts on your phone
- **Unified Search**: Find anyone by name, company, or skill

## Project Structure

```
social-recall/
├── apps/
│   ├── extension/     # Chrome extension
│   └── web/           # Web application (coming soon)
├── packages/
│   └── shared/        # Shared types and utilities
├── docs/
│   ├── prd/           # Product requirements
│   └── adr/           # Architecture decision records
└── supabase/          # Database migrations and functions
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### Installation

```bash
npm install
```

### Development

```bash
# Build all packages
npm run build

# Build extension only
npm run build --workspace=@social-recall/extension
```

### Chrome Extension

1. Run `npm run build --workspace=@social-recall/extension`
2. Open Chrome and go to `chrome://extensions`
3. Enable "Developer mode"
4. Click "Load unpacked" and select `apps/extension`

## Documentation

- [Product Requirements](docs/prd/PRD-001-personal-crm.md)
- [Tech Stack](docs/adr/ADR-001-tech-stack.md)
- [Data Architecture](docs/adr/ADR-002-data-architecture.md)
- [Skills Taxonomy](docs/adr/ADR-003-skills-taxonomy.md)
- [Sync Strategy](docs/adr/ADR-004-sync-strategy.md)
- [AI Integration](docs/adr/ADR-005-ai-integration.md)

## License

UNLICENSED - Private project
