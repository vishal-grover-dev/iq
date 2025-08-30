### Root

- `package.json`: Project metadata, scripts, and dependencies.
- `pnpm-lock.yaml`: Exact dependency lockfile for reproducible installs.
- `next.config.ts`: Next.js configuration.
- `tsconfig.json`: TypeScript config with path alias `@/*`.
- `eslint.config.mjs`: ESLint flat config (Next + TypeScript rules).
- `postcss.config.mjs`: PostCSS config loading Tailwind plugin.
- `components.json`: shadcn/ui generator config and path aliases.
- `next-env.d.ts`: Next.js type references (auto-generated; do not edit).
- `README.md`: Starter documentation for running and deploying the app.

### .docs/blueprints

- `directory-structure.md`: Enforced directory and naming conventions.
- `tech-stack.md`: Tech stack and architecture overview.
- `prd.md`: Product requirements document.
- `existing-files.md`: This index of current files.

### app

- `globals.css`: Global styles and Tailwind layers.
- `layout.tsx`: Root HTML layout; initializes theme and wraps `ThemeProvider` + `Header`.
- `page.tsx`: Home page route rendering a simple placeholder.

### components/common

- `header.component.tsx`: Application header with brand link and layout styles.
- `logo.component.tsx`: Logo component using `next/image` for `/logo.svg`.
- `themeToggle.component.tsx`: Theme toggle bound to app theme context.

### components/ui

- `switch.tsx`: Radix-based `Switch` component styled to shadcn/ui conventions.

### public

- `logo.svg`: Vector logo asset.
- `logo.png`: Raster logo asset.

### store/providers

- `theme.provider.tsx`: Theme context/provider; persists to localStorage and tracks system preference.

### utils

- `tailwind.utils.ts`: `cn` helper combining `clsx` with `tailwind-merge`.
