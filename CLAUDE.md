# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Initial setup (install deps, generate Prisma client, run migrations)
npm run setup

# Development server (Turbopack, localhost:3000)
npm run dev

# Build
npm run build

# Lint
npm lint

# Run all tests
npm test

# Run a single test file
npx vitest run src/components/chat/__tests__/ChatInterface.test.tsx

# Reset database
npm run db:reset
```

## Code style

Use comments sparsely — only on non-obvious or complex logic.

Set `ANTHROPIC_API_KEY` in `.env` to use real AI generation. Without it, a `MockLanguageModel` in `src/lib/provider.ts` returns static component code.

## Architecture

UIGen is a Next.js 15 App Router app where users describe React components in a chat and see them rendered live. Components exist only in a **virtual file system** (in-memory, no disk writes) that is serialized to JSON and stored in the SQLite database for authenticated users.

### Core data flow

1. User types a prompt → `ChatContext` (`src/lib/contexts/chat-context.tsx`) sends it to `POST /api/chat` along with the serialized VFS state
2. `src/app/api/chat/route.ts` streams a response from Claude (or the mock) using Vercel AI SDK's `streamText`
3. Claude calls two tools: `str_replace_editor` (create/edit files) and `file_manager` (rename/delete)
4. Tool calls stream back to the client; `FileSystemContext.handleToolCall` applies them to the in-memory VFS
5. `PreviewFrame` (`src/components/preview/PreviewFrame.tsx`) watches the VFS via `refreshTrigger` and re-renders an iframe using `src/lib/transform/jsx-transformer.ts` which Babel-transforms JSX to browser-runnable JS with an import map

### Key abstractions

- **`VirtualFileSystem`** (`src/lib/file-system.ts`) — in-memory tree of `FileNode`s with CRUD, rename, serialize/deserialize. This is the single source of truth for generated files.
- **`FileSystemContext`** (`src/lib/contexts/file-system-context.tsx`) — React context wrapping VFS, exposes mutation methods and `handleToolCall` which routes `str_replace_editor` and `file_manager` tool calls from Claude into VFS mutations.
- **`ChatContext`** (`src/lib/contexts/chat-context.tsx`) — wraps Vercel AI SDK's `useChat`, passes `fileSystem.serialize()` as the body on every request so the server can reconstruct VFS state.
- **`jsx-transformer.ts`** (`src/lib/transform/jsx-transformer.ts`) — transforms JSX/TSX files via `@babel/standalone` at runtime in the browser, builds an import map resolving `@/` aliases and inter-file imports, and generates the `srcdoc` HTML for the preview iframe.

### Auth

JWT sessions stored in an httpOnly cookie (`auth-token`). `src/lib/auth.ts` is server-only. Middleware (`src/middleware.ts`) protects `/api/projects` and `/api/filesystem`. Anonymous users can generate components but projects are not persisted; `src/lib/anon-work-tracker.ts` saves their work to localStorage so they can reclaim it after signing up.

### Database

The database schema is defined in `prisma/schema.prisma` — reference it whenever you need to understand the DB structure. Prisma with SQLite (`prisma/dev.db`). The Prisma client is generated into `src/generated/prisma/`. Two models: `User` and `Project`. `Project.messages` and `Project.data` are JSON strings storing chat history and serialized VFS respectively.

### AI tools available to Claude during generation

- `str_replace_editor`: `create`, `str_replace`, `insert`, `view` commands operating on the server-side VFS instance
- `file_manager`: `rename`, `delete`, `list` commands

The server reconstructs VFS from the serialized payload sent by the client, Claude mutates it via tools, and the final VFS state is saved back to the database on `onFinish`.
