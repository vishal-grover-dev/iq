import { WebPDFLoader } from "@langchain/community/document_loaders/web/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { ILangchainChunk } from "@/types/ingest.types";

export async function extractTextFromPdfBufferLC(buffer: Buffer): Promise<{ text: string; numPages: number }> {
  const loader = new WebPDFLoader(new Blob([buffer]), { splitPages: true });
  const docs = await loader.load();
  const text = docs.map((d) => d.pageContent).join("\n\n");
  const numPages = docs.length;
  return { text, numPages };
}

export async function chunkTextLC(
  text: string,
  options?: { chunkSize?: number; overlap?: number }
): Promise<ILangchainChunk[]> {
  const chunkSize = options?.chunkSize ?? 1800;
  const overlap = options?.overlap ?? 200;
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize, chunkOverlap: overlap });
  const docs: string[] = await splitter.splitText(text);
  return docs.map((content: string, index: number) => ({
    index,
    content,
    tokens: Math.max(1, Math.ceil(content.length / 4)),
  }));
}
