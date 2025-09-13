# Tech Stack & Architecture - Intelliqent Questions (IQ)

## Frontend Technology Stack

### Core Framework

- **Next.js 15+** - React framework with App Router for server-side rendering and static generation
- **TypeScript** - Type-safe JavaScript for better development experience and code quality
- **React 19** - UI library with concurrent features and hooks

### Styling & UI Components

- **Tailwind CSS v4** - Utility-first CSS framework for rapid UI development
- **shadcn/ui** - High-quality, accessible component library built on Radix UI
- **Radix UI** - Unstyled, accessible UI primitives
- **Phosphor Icons** - Consistent icon set for React.
  - Note: Import components with the `Icon` suffix (e.g., `SunDimIcon`, `MoonIcon`, `LinkedinLogoIcon`).
  - Guideline: Do not use `duotone` icons; prefer `regular`, `bold`, or `fill` weights.

### Motion & Animations

- Purpose: keep interactions feeling responsive, clean, and fluid while respecting accessibility and performance.
- What to animate: prefer opacity and transform (translate/scale) only; avoid layout-affecting properties (width/height/top/left) to prevent jank.
- Durations: micro-interactions 120–200 ms; menus/dialogs 180–280 ms; overlays/pages 250–400 ms. Orchestrations may chain up to ~600 ms total.
- Easing: use gentle ease-out or ease-in-out curves that avoid bouncy/overshoot by default. Reserve spring-like motion for subtle, playful contexts only.
- Consistency: apply consistent timings/easings across similar components (buttons, lists, modals). Keep distances small (5–12 px) and avoid excessive movement.
- Accessibility: honor reduced motion preferences by disabling or simplifying animations. Ensure focus states remain visible and do not rely solely on motion.
- Libraries: use built-in shadcn/Radix transitions for simple states; for entrance/exit, presence, and shared layout transitions prefer a dedicated motion library (e.g., Framer Motion). Lazy-load advanced motion features when possible.
- Performance: limit simultaneous animated elements, prefer GPU-friendly transforms, and avoid animating large backgrounds or heavy shadows.
- Testing: keep animation timings stable; disable long-running animations during visual tests to reduce snapshot flakiness.
- Installed: `framer-motion` is added to the project for smooth, accessible animations.

### State Management

- **Jotai** - Atomic state management for client-side state
- **React Query/TanStack Query** - Server state management and caching
- **React Hook Form** - Performant forms with validation

### Development Tools

- **ESLint** - Code linting and quality enforcement
- **Prettier** - Code formatting

## Backend Technology Stack

### API Framework

- **Next.js API Routes** - Serverless API endpoints within Next.js

### Database & Storage

- **Supabase** - Primary database, authentication, and file storage platform
- **PostgreSQL** - Relational database (via Supabase)
- **pgvector** Extension – Vector embeddings storage for semantic search
- **Postgres Full-Text Search (FTS)** – Keyword search
- **Hybrid Search** – Combines vector and keyword search for improved accuracy

### AI/ML Services

- **Langchain.js** - Framework for building AI applications and agents
- **OpenAI SDK** - Official OpenAI API client for JavaScript
- **LangSmith** - Observability and monitoring platform for AI agents
- **OpenAI Embeddings** - `text-embedding-3-small` (1536‑d) for indexing and queries
- **Reranker** – LLM-as-reranker using `gpt-4o-mini` returning list-wise JSON

### File Processing

- **PDF.js** - PDF parsing and text extraction
- **Mammoth.js** - DOCX file processing
- **Multer** - File upload handling
- **Sharp** - Image processing and optimization

## Infrastructure & Deployment

### Hosting & Platform

- **Netlify** - Primary hosting platform for Next.js deployment

### Environment & Configuration

- **Environment Variables** - Secure configuration management

### Monitoring & Analytics

- **LangSmith** - AI agent observability and monitoring

## Development Workflow

### Version Control

- **Git** - Source code version control
- **GitHub** - Repository hosting and collaboration

### CI/CD Pipeline

- **GitHub Actions** - Automated deployment
- **Netlify** - Automatic deployments on push to main branch

### Testing Strategy

- **No testing framework** - Focus on rapid development and iteration

## Security & Performance

### Security Measures

- **Supabase Auth** - Authentication and authorization
- **Row-Level Security (RLS)** – Fine-grained data protection in Postgres
- **JWT Verification** – For securing API routes
- **CORS** - Cross-origin resource sharing protection
- **Rate Limiting** - API request throttling
- **Input Validation** - Sanitization and validation

### Performance Optimization

- **Next.js Image Optimization** - Automatic image optimization
- **Code Splitting** - Dynamic imports for better loading

## Third-Party Integrations

### External Services

- **Supabase Storage** - File storage for documents and assets

