import Link from "next/link";

export const metadata = {
  title: "Page not found · Owner Hub",
};

export default function NotFound() {
  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white relative overflow-hidden flex items-center">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-purple-500/20 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-pink-500/20 to-transparent rounded-full blur-3xl" />
      </div>
      <div className="relative max-w-3xl mx-auto px-5 sm:px-8 py-20 text-center w-full">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-purple-400/30 text-purple-200 text-xs font-semibold mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          404 · Page not found
        </div>
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-4 leading-[1.05]">
          We couldn&apos;t<br />
          <span className="bg-gradient-to-br from-purple-300 to-pink-300 bg-clip-text text-transparent">
            find that page.
          </span>
        </h1>
        <p className="text-lg text-slate-300 max-w-xl mx-auto mb-10 leading-relaxed">
          The link might be old or the route might have moved. Head back to the Owner Hub overview.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-semibold shadow-lg shadow-purple-900/40 transition-all"
        >
          Back to Owner Hub →
        </Link>
      </div>
    </section>
  );
}
