import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "AP 微观经济学可视化实验室",
  description: "用动态可视化理解 AP Microeconomics 中的核心图模型。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen text-[var(--ink)] [font-family:'Avenir_Next','Segoe_UI',sans-serif] [background:radial-gradient(circle_at_top_left,rgba(191,91,44,0.14),transparent_34%),radial-gradient(circle_at_top_right,rgba(31,110,107,0.16),transparent_28%),linear-gradient(180deg,#fbf6ee_0%,#f4ecdf_100%)]">
        {children}
      </body>
    </html>
  );
}
