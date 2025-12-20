# Social Recall

Personal CRM for investors and founders. Turn your professional network into a queryable, opportunity-aware knowledge graph.

## Features

- **Chrome Extension**: Save LinkedIn profiles with one click
- **AI-Powered Skills**: Automatically infer skills from profiles
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
