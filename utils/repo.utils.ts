import path from "node:path";

/**
 * parseRepoUrl
 * Extracts { owner, repo } from a GitHub repo URL.
 */
export function parseRepoUrl(repoUrl: string): { owner: string; repo: string } {
  try {
    const url = new URL(repoUrl);
    const [, owner, repo] = url.pathname.replace(/\.git$/, "").split("/");
    if (!owner || !repo) throw new Error("Invalid repo URL");
    return { owner, repo };
  } catch {
    throw new Error("Invalid GitHub repository URL");
  }
}

/**
 * getDefaultBranch
 * Fetches repo metadata to determine the default branch (unauthenticated; rate-limited by GitHub).
 */
export async function getDefaultBranch(owner: string, repo: string): Promise<string> {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
  if (!res.ok) throw new Error(`Failed to resolve default branch: ${res.status}`);
  const data = await res.json();
  return data?.default_branch ?? "main";
}

/**
 * listMarkdownPaths
 * Returns a list of .md/.mdx file paths from the repo tree, filtered by optional prefixes.
 */
export async function listMarkdownPaths(
  owner: string,
  repo: string,
  branch: string,
  prefixes: string[] = []
): Promise<string[]> {
  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`
  );
  if (!treeRes.ok) throw new Error(`Failed to list repo tree: ${treeRes.status}`);
  const tree = await treeRes.json();
  const allPaths: string[] = Array.isArray(tree?.tree)
    ? tree.tree.filter((t: any) => t?.type === "blob").map((t: any) => String(t?.path))
    : [];
  const isMd = (p: string) => p.toLowerCase().endsWith(".md") || p.toLowerCase().endsWith(".mdx");
  const prefixFilter = (p: string) => prefixes.length === 0 || prefixes.some((pre) => p.startsWith(pre));
  return allPaths.filter((p) => isMd(p) && prefixFilter(p));
}

/**
 * fetchRawFile
 * Fetches a raw file from GitHub.
 */
export async function fetchRawFile(owner: string, repo: string, branch: string, filePath: string): Promise<string> {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(branch)}/${filePath}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${filePath}: ${res.status}`);
  return await res.text();
}

/**
 * deriveTitleFromMarkdown
 * Uses the first level-1 heading as title; falls back to filename.
 */
export function deriveTitleFromMarkdown(filePath: string, content: string): string {
  const lines = content.split(/\r?\n/);
  const h1 = lines.find((l) => /^#\s+/.test(l));
  if (h1) return h1.replace(/^#\s+/, "").trim();
  return path.basename(filePath).replace(/\.(md|mdx)$/i, "");
}

/**
 * getRepoMarkdownFiles
 * High-level helper to pull up to maxFiles markdown files and return their contents.
 */
export async function getRepoMarkdownFiles(
  repoUrl: string,
  paths: string[] = [],
  maxFiles: number = 200
): Promise<Array<{ path: string; content: string; title: string }>> {
  const { owner, repo } = parseRepoUrl(repoUrl);
  const branch = await getDefaultBranch(owner, repo);
  const mdPaths = (await listMarkdownPaths(owner, repo, branch, paths)).slice(0, maxFiles);
  const results: Array<{ path: string; content: string; title: string }> = [];
  for (const p of mdPaths) {
    const content = await fetchRawFile(owner, repo, branch, p);
    const title = deriveTitleFromMarkdown(p, content);
    results.push({ path: p, content, title });
  }
  return results;
}
