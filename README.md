# Plate Frontend

Plate Frontend is the Next.js 15 client application powering the Plate AI-Native Team Productivity Platform.
Built with Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, local Fustat variable typography, and Lucide icons.

---

## Architectural Highlights

### 1. Minimalist Monochrome Design System
- High-contrast black-and-white visual identity: pure white backgrounds, deep black typography, subtle `neutral-200` borders, and restrained `blue-500` accents.
- Custom typography utilizing the local **Fustat** variable font with fine-tuned ascent and descent overrides for perfect baseline alignment across browsers and operating systems.

### 2. Task Board & Drag-and-Drop
- **Member Column Stacks**: Horizontally scrollable row of team members, each holding a vertical stack of task cards.
- **Unassigned & Filters**: Dedicated unassigned tasks column with real-time keyword search, status filtering (`inbox`, `todo`, `in_progress`, `in_review`, `done`), and priority filters.
- **Optimistic Drag-and-Drop**: Smooth drag-and-drop between members and workflow columns with optimistic client updates and automated rollback if the backend request fails.
- **In-App File Viewer**: View task attachments, markdown documents, source code, and images directly in a layered modal without redirecting to external URLs or opening new browser tabs.

### 3. Communications Engine (Push-Free HTTP Polling)
- **Zero WebSockets / SSE**: Replaces fragile stateful WebSocket connections with a robust 2-second adaptive HTTP polling engine using monotonic integer cursors (`after_id`).
- **Tab Visibility Awareness**: Automatically pauses polling when the browser tab is hidden (`document.visibilityState === "hidden"`) and immediately resumes when the user returns.
- **Execution Locks**: Non-overlapping request guards prevent race conditions between active polling and user message sends.
- **Cursor Pagination**: Smooth upward pagination (`before_id`) for loading older conversation history.

### 4. AI-Powered Workflows
- **Voice Task Extraction**: Browser-based audio recorder (`MediaRecorder`) and audio file upload. Transcribes audio and extracts structured task proposals with evidence quotes and workspace member matching.
- **Document Analyzer**: Upload PDFs, screenshots, or specifications to generate executive summaries, risk assessments, and follow-up tasks. Analyzed documents are automatically grounded into Team Memory.
- **Admin-Only AI Operations History**: Administrators can review an expandable history of all AI voice transcriptions and document analyses with full parameter and output inspection.
- **Team Memory (RAG)**: Natural language Q&A interface querying workspace history and authoritative live records with citation links.

### 5. Client-Side Upload & Media Validation
- **5MB File Size Limit**: All file upload inputs across the application enforce a strict 5MB limit before transmission (`lib/file-validation.ts`).
- **Video Upload Prohibition**: Video MIME types and file extensions are blocked application-wide.
- **Audio Duration Constraint**: Audio analysis enforces a strict 60-second limit and accepts only a single file at a time.

### 6. Mobile Experience & Safe Back-Stack
- **Mobile Authentication Flow**: On mobile screens, the login form is streamlined into a prominent "Get Started" CTA button in the hero section that slides up an animated bottom sheet drawer with quick demo logins and registration options.
- **Safe Back-Stack Manager (`lib/back-stack.tsx`)**: Synchronizes overlay state (modals, drawers, sheets) with browser history without overwriting Next.js router state or navigating backwards out of the application to the browser's home tab.

---

## Getting Started

### Prerequisites
- Node.js 18.18+ or 20+
- Running instance of `plate-backend` on `http://localhost:8000`

### Installation
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build
```bash
# Typecheck and compile production bundle
npm run build

# Start production server
npm run start
```

---

## Environment Configuration

Create a `.env.local` file in `plate-frontend/`:
```ini
NEXT_PUBLIC_API_URL=http://localhost:8000
```
