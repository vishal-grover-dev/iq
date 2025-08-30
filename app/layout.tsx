import "./globals.css";
import Header from "@/components/common/header.component";
import ThemeProvider from "@/store/providers/theme.provider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeInitScript = `(() => { try { const t = localStorage.getItem('theme') || 'system'; const d = t === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : t; const root = document.documentElement; if (d === 'dark') { root.classList.add('dark'); root.setAttribute('data-theme', 'dark'); } else { root.classList.remove('dark'); root.setAttribute('data-theme', 'light'); } } catch (_) {} })()`;
  return (
    <html lang='en' suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ThemeProvider>
          <Header />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
