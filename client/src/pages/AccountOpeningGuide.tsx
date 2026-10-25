import { Smartphone } from "lucide-react";

export default function AccountOpeningGuide() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="display-heading flex items-center gap-2 text-4xl leading-[1.1] text-slate-900 dark:text-slate-100 sm:text-5xl">
          <Smartphone className="h-8 w-8 shrink-0 text-slate-400" strokeWidth={1.75} />
          Mở tài khoản chứng khoán
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Xem video hướng dẫn chi tiết cách mở tài khoản giao dịch chứng khoán.
        </p>
      </div>

      {/* Video */}
      <div className="aspect-video overflow-hidden rounded-md bg-slate-900">
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
