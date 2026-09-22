import { Smartphone } from "lucide-react";

export default function AccountOpeningGuide() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-600 dark:text-slate-400">Hướng dẫn</h2>
        <h1 className="mt-1 mb-2 flex items-center gap-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
          <Smartphone className="h-7 w-7 text-slate-400" strokeWidth={1.75} />
          Mở Tài Khoản Chứng Khoán
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Xem video hướng dẫn chi tiết cách mở tài khoản giao dịch chứng khoán
        </p>
      </div>

      {/* Video */}
      <div className="aspect-video overflow-hidden rounded-lg bg-slate-900">
        <iframe
          width="100%"
          height="100%"
          src="https://www.youtube.com/embed/CyUYSWOAavw"
          title="Hướng dẫn mở tài khoản chứng khoán"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
}
