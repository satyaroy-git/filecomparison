# FileDiff Pro - Browser-Based File Comparison Tool

A powerful browser-based tool for comparing **delimited files** (CSV, TSV, pipe-separated) and **fixed-width files** — with no server required. 100% client-side processing.

## Features

### File Format Support
- **Delimited files**: CSV, TSV, pipe-separated, semicolon, custom delimiter
- **Fixed-width files**: Define column positions and lengths, or auto-detect boundaries
- **Auto-detection**: Delimiter type, header row, and column boundaries

### Comparison Engine
- **Position-based matching**: Row-by-row comparison
- **Key-column matching**: Match rows by ID, email, or composite keys
- **Fuzzy matching**: Levenshtein similarity-based matching for approximate data
- **Character-level diffs**: See exactly which characters changed within a cell
- **Configurable tolerance**: Numeric tolerance, case sensitivity, whitespace handling

### Fixed-Width Specialization (Unique in Market!)
- Visual field definition editor
- COBOL copybook layout import
- JSON schema import/export for reusable layouts
- Auto-detect column boundaries via space frequency analysis
- Multiple trim modes (none, left, right, both)

### Performance
- Web Workers for non-blocking parsing and comparison
- Virtual scrolling (handles 1M+ rows)
- Streaming file parsing for large files

### UI
- Drag-and-drop file upload
- Step-by-step workflow (Upload → Configure → Results)
- Color-coded diff results (added/removed/modified)
- Filter by change type
- Export results to CSV
- Column-level statistics

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Tech Stack

- **React 19** + TypeScript
- **Vite 8** (build tool)
- **TailwindCSS 4** (styling)
- **Zustand** (state management)
- **PapaParse** (delimited file parsing)
- **Comlink** (Web Worker communication)
- **TanStack Virtual** (virtual scrolling)
- **Lucide React** (icons)

## Project Structure

```
src/
├── core/               # Parsing & diff engines
│   ├── delimited-parser.ts
│   ├── delimiter-detector.ts
│   ├── fixed-width-parser.ts
│   └── diff-engine.ts
├── workers/            # Web Workers (off-main-thread)
│   ├── parser.worker.ts
│   └── diff.worker.ts
├── stores/             # Zustand state management
├── components/         # React UI components
│   ├── upload/         # File upload with drag & drop
│   ├── config/         # Format & comparison settings
│   ├── results/        # Diff table with virtual scroll
│   ├── layout/         # App header & navigation
│   └── ui/             # Reusable UI primitives
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

## License

MIT
