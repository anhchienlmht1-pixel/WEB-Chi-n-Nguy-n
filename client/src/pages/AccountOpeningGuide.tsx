export default function AccountOpeningGuide() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="mb-3 text-3xl font-bold text-slate-900 dark:text-slate-100">
          📱 Hướng Dẫn Mở Tài Khoản
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
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

      {/* CTA */}
      <div className="mt-8 text-center">
        <a
          href="https://kafi.vn"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-3 font-bold text-white transition-all hover:from-emerald-500 hover:to-emerald-400"
        >
          🚀 Mở Tài Khoản Ngay
        </a>
      </div>
    </div>
  );
}
