import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { ThemeProvider } from "@/lib/theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chiến Nguyễn Invest — Bảng giá chứng khoán Việt Nam",
  description:
    "Theo dõi VN-Index, HNX-Index, UPCOM-Index và bảng giá cổ phiếu Việt Nam theo thời gian thực.",
};

// Runs before paint to apply the saved theme (defaults to dark) and avoid a flash.
const THEME_INIT_SCRIPT = `
try {
  var t = localStorage.getItem('theme');
  document.documentElement.classList.toggle('dark', t !== 'light');
} catch (e) {
  document.documentElement.classList.add('dark');
}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-white text-neutral-900 dark:bg-[#0a0d0c] dark:text-neutral-50">
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        <ThemeProvider>
          <Header />
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">{children}</main>
          <footer className="border-t border-neutral-200 bg-neutral-50 py-5 text-center text-xs text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-500">
            Dữ liệu được tổng hợp tự động từ nguồn công khai, chỉ mang tính chất tham khảo, không phải khuyến nghị đầu tư.
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
