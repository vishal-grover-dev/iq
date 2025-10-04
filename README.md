This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3050](http://localhost:3050) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Ontology & Interview Weights

The app uses a **lazy-loading** system for ontology (topics/subtopics) and interview target weights:

- **Automatic generation**: On first request, if no cache exists, the system automatically:
  - Queries the database for topics/subtopics
  - Calls LLM (gpt-4o-mini) to generate interview archetypes and target weights
  - Caches results in memory (8h TTL) and persists to `data/ontology-cache.json`

- **Background refresh**: When cache is stale (8h-48h old), stale data is served while refreshing in background

- **Optional pre-warming** (not required): Run `pnpm generate:ontology` to pre-generate the cache before deployment. This is purely for optimization—the app works fine without it.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
