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
    </div>
  );
}
