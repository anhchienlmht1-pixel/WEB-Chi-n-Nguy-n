import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VStock — Bảng giá chứng khoán Việt Nam",
  description:
    "Theo dõi VN-Index, HNX-Index, UPCOM-Index và bảng giá cổ phiếu Việt Nam theo thời gian thực.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-neutral-50 text-neutral-900">
        <Header />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
        <footer className="border-t border-neutral-200 bg-white py-4 text-center text-xs text-neutral-400">
          Dữ liệu được tổng hợp tự động từ nguồn công khai, chỉ mang tính chất tham khảo, không phải khuyến nghị đầu tư.
        </footer>
      </body>
    </html>
  );
}
