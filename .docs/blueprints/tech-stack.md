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
- **Lucide React** - Beautiful, customizable icons

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

- **Qdrant** - Vector database for RAG content indexing and similarity search
- **Supabase** - Primary database, authentication, and file storage platform
- **PostgreSQL** - Relational database (via Supabase)

### AI/ML Services

- **Langchain.js** - Framework for building AI applications and agents
- **OpenAI SDK** - Official OpenAI API client for JavaScript
- **OpenRouter** - Access to various open-source models via OpenAI-compatible API
- **LangSmith** - Observability and monitoring platform for AI agents

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
- **CORS** - Cross-origin resource sharing protection
- **Rate Limiting** - API request throttling
- **Input Validation** - Sanitization and validation

### Performance Optimization

- **Next.js Image Optimization** - Automatic image optimization
- **Code Splitting** - Dynamic imports for better loading

## Third-Party Integrations

### External Services

- **Supabase Storage** - File storage for documents and assets

