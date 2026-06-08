import Link from "next/link";

export const metadata = {
  title: "Page not found · AVS Invest",
};

const links = [
  { icon: "🏠", label: "Dashboard", desc: "Portfolio overview", href: "/" },
  { icon: "📍", label: "Map", desc: "Properties + pipeline on a map", href: "/map" },
  { icon: "🗂", label: "Properties", desc: "Managed properties", href: "/properties" },
  { icon: "📈", label: "Pipeline", desc: "Sourcing deals", href: "/pipeline" },
];

export default function NotFound() {
  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-emerald-200/40 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-teal-200/40 to-transparent rounded-full blur-3xl" />
      </div>
      <div className="relative max-w-4xl mx-auto px-5 sm:px-8 py-20 sm:py-28 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-emerald-200 text-emerald-800 text-xs font-semibold mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          404 · Page not found
        </div>
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900 mb-4 leading-[1.05]">
          We couldn&apos;t<br />
          <span className="bg-gradient-to-br from-emerald-700 to-emerald-900 bg-clip-text text-transparent">
            find that page.
          </span>
        </h1>
        <p className="text-lg text-slate-600 max-w-xl mx-auto mb-10 leading-relaxed">
          The link might be old or the route might have moved. Try one of these instead — or head back to the{" "}
          <Link href="/" className="text-emerald-700 hover:text-emerald-900 underline font-semibold">
            dashboard
          </Link>
          .
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-3xl mx-auto">
          {links.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 text-left hover:border-emerald-300 hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div className="text-3xl mb-3">{l.icon}</div>
              <div className="font-bold text-slate-900 mb-1">{l.label}</div>
              <div className="text-xs text-slate-500">{l.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
