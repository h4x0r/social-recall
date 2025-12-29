# Social Recall - Project Context

## Domains

- **Production:** https://www.socialrecall.now
- **Privacy Policy:** https://www.socialrecall.now/privacy
- **Vercel (legacy):** https://social-recall.vercel.app

## Testing

- Always use headless browser for testing, unless headed browser is absolutely required
- Chrome extensions require headed mode but use `--window-position=-2400,-2400` to keep browser off-screen

## Extension Build System (apps/extension/)

Uses hybrid dist/ pattern (see chrome-extension-development skill for general guidance).

### Project-Specific Files

| File | Location | Notes |
|------|----------|-------|
| TypeScript | `src/*.ts` | Compiled to `dist/*.js` |
| Panel CSS | `src/panel.css` | Bundled into content.js |
| Popup/Settings HTML/CSS | `dist/` | **Manually maintained** |
| Tarot cards | `dist/tarot/` | Static card images |

### Note

All extension source files are in `dist/` (HTML, CSS, manifest) or `src/` (TypeScript). No HTML/CSS in root.
