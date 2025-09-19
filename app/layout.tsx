import "./globals.css";
import Header from "@/components/common/header.component";
import Footer from "@/components/common/footer.component";
import ThemeProvider from "@/store/providers/theme.provider";
import QueryProvider from "@/store/providers/query.provider";
import { Toaster } from "sonner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeInitScript = `(() => { try { const t = localStorage.getItem('theme') || 'system'; const d = t === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : t; const root = document.documentElement; if (d === 'dark') { root.classList.add('dark'); root.setAttribute('data-theme', 'dark'); } else { root.classList.remove('dark'); root.setAttribute('data-theme', 'light'); } } catch (_) {} })()`;
  return (
    <html lang='en' suppressHydrationWarning>
      <head>
        <title>IQ — Intelliqent Questions</title>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ThemeProvider>
          <QueryProvider>
            <div className='flex min-h-screen flex-col'>
              <Header />
              <main className='flex-1'>{children}</main>
              <Footer />
            </div>
            <Toaster richColors position='top-center' closeButton />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
