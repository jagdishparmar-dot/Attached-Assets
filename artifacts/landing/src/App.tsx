import {
  LayoutDashboard,
  MapPin,
  Package,
  Truck,
  Clock,
  Shield,
  Upload,
  Radio,
  ArrowRight,
  Smartphone,
  ChevronRight,
  CheckCircle2,
  Star,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL;

const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=app.coldverse.in";
const ADMIN_URL = "/admin";

const FEATURES = [
  {
    icon: LayoutDashboard,
    title: "Operations Overview",
    desc: "Real-time dashboard showing deliveries in progress, staff status, and hub activity at a glance.",
    color: "bg-blue-50 text-blue-600",
  },
  {
    icon: MapPin,
    title: "Live Driver Tracking",
    desc: "See every driver's GPS location on an interactive map, updated every 30 seconds.",
    color: "bg-cyan-50 text-cyan-600",
  },
  {
    icon: Package,
    title: "Delivery & Assignment",
    desc: "Create, assign, and track deliveries end-to-end — from warehouse dispatch to customer doorstep.",
    color: "bg-indigo-50 text-indigo-600",
  },
  {
    icon: Truck,
    title: "Fleet Management",
    desc: "Manage your entire vehicle fleet and workforce from a single unified console.",
    color: "bg-violet-50 text-violet-600",
  },
  {
    icon: Clock,
    title: "Geo-fenced Attendance",
    desc: "Drivers check in and out from the hub using GPS — the system verifies they are within the geofence before recording.",
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    icon: Shield,
    title: "Role-based Access",
    desc: "Six distinct roles — driver, picker, sorter, loader, supervisor, and security — each with tailored permissions.",
    color: "bg-amber-50 text-amber-600",
  },
  {
    icon: Upload,
    title: "Bulk Uploads",
    desc: "Import hundreds of deliveries, customers, or staff members from CSV in seconds with built-in validation.",
    color: "bg-rose-50 text-rose-600",
  },
  {
    icon: Radio,
    title: "Real-time GPS Pings",
    desc: "Mobile app transmits location pings every 30 seconds, keeping admin maps and ETAs always up to date.",
    color: "bg-teal-50 text-teal-600",
  },
];

const STATS = [
  { value: "6", label: "Staff Roles" },
  { value: "30s", label: "GPS Refresh" },
  { value: "500m", label: "Geo-fence Radius" },
  { value: "∞", label: "Deliveries" },
];

export default function App() {
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* ── Navbar ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[#0F172A]/95 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <img
            src={`${BASE}logo.png`}
            alt="Coldverse"
            className="h-8 w-auto"
          />
          <nav className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              className="text-sm text-slate-300 hover:text-white transition-colors"
            >
              Features
            </a>
            <a
              href="#screenshots"
              className="text-sm text-slate-300 hover:text-white transition-colors"
            >
              Screenshots
            </a>
            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-slate-300 hover:text-white transition-colors"
            >
              Android App
            </a>
          </nav>
          <a
            href={ADMIN_URL}
            className="flex items-center gap-2 bg-[#0284C7] hover:bg-[#0369A1] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Admin Console
            <ChevronRight className="h-4 w-4" />
          </a>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="relative bg-[#0F172A] overflow-hidden">
        {/* Background glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full bg-[#0284C7]/15 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-[400px] h-[400px] rounded-full bg-[#06B6D4]/10 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 pt-24 pb-20 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-[#0284C7]/15 border border-[#0284C7]/30 text-[#38BDF8] text-xs font-semibold px-4 py-1.5 rounded-full mb-8 uppercase tracking-widest">
            <Star className="h-3 w-3 fill-current" />
            Cold-Chain Logistics Platform
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight mb-6 max-w-4xl mx-auto">
            End-to-end delivery management{" "}
            <span className="text-[#38BDF8]">for cold-chain logistics</span>
          </h1>

          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Coldverse DMS gives your operations team live GPS tracking, geo-fenced
            attendance, and full delivery lifecycle management — all in one place.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
            <a
              href={ADMIN_URL}
              className="flex items-center gap-2 bg-[#0284C7] hover:bg-[#0369A1] text-white font-bold px-7 py-3.5 rounded-xl transition-colors shadow-lg shadow-blue-900/40 text-base"
            >
              Open Admin Console
              <ArrowRight className="h-5 w-5" />
            </a>

            <div className="flex flex-col items-center gap-2">
              <a
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold px-7 py-3.5 rounded-xl transition-colors text-base"
              >
                <Smartphone className="h-5 w-5 text-[#38BDF8]" />
                Download for Android
              </a>
              <span className="text-xs text-slate-500 flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-600" />
                iOS — Coming Soon
              </span>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/10 rounded-2xl overflow-hidden max-w-2xl mx-auto">
            {STATS.map((s) => (
              <div
                key={s.label}
                className="bg-[#0F172A] px-6 py-5 text-center"
              >
                <div className="text-2xl font-bold text-[#38BDF8]">
                  {s.value}
                </div>
                <div className="text-xs text-slate-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────── */}
      <section id="features" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="inline-block text-[#0284C7] text-xs font-bold uppercase tracking-widest mb-3">
              Platform Features
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#0F172A] mb-4">
              Everything your team needs
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              From live GPS tracking to bulk data imports — Coldverse covers every
              touchpoint of your cold-chain delivery operation.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="bg-white rounded-2xl p-7 border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div
                    className={`inline-flex items-center justify-center w-11 h-11 rounded-xl mb-5 ${f.color}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-[#0F172A] mb-2 text-[15px]">
                    {f.title}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Screenshots ───────────────────────────────────── */}
      <section id="screenshots" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="inline-block text-[#0284C7] text-xs font-bold uppercase tracking-widest mb-3">
              See It In Action
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#0F172A] mb-4">
              Web Admin + Mobile App
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              A powerful browser-based Admin Console for operations managers,
              paired with a native Android app for drivers and field staff.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-10 items-start">
            {/* Admin Panel — browser frame */}
            <div className="group">
              <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-xl bg-[#E8EDF2]">
                {/* Browser chrome */}
                <div className="bg-[#E2E7EE] px-4 py-3 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-400/70" />
                    <span className="w-3 h-3 rounded-full bg-yellow-400/70" />
                    <span className="w-3 h-3 rounded-full bg-green-400/70" />
                  </div>
                  <div className="flex-1 bg-white/80 rounded-md h-6 mx-2 flex items-center px-3">
                    <span className="text-[10px] text-slate-400 truncate">
                      compassdeliveryops.replit.app/admin
                    </span>
                  </div>
                </div>
                <img
                  src={`${BASE}screenshot-admin.jpg`}
                  alt="Coldverse Admin Console — Live Tracking view"
                  className="w-full block"
                />
              </div>
              <div className="mt-5 px-1">
                <h3 className="font-bold text-[#0F172A] text-lg">
                  Admin Console
                </h3>
                <p className="text-slate-500 text-sm mt-1">
                  Browser-based operations dashboard with live GPS map,
                  delivery pipeline, staff management, and hub oversight.
                </p>
                <a
                  href={ADMIN_URL}
                  className="inline-flex items-center gap-1.5 text-[#0284C7] text-sm font-semibold mt-3 hover:underline"
                >
                  Open Admin Console <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>

            {/* Mobile App — phone frame */}
            <div className="flex flex-col items-center lg:items-start group">
              <div className="relative w-[260px] mx-auto lg:mx-0">
                {/* Phone chrome */}
                <div className="bg-[#1C1C1E] rounded-[40px] p-3 shadow-2xl ring-1 ring-white/10">
                  {/* Notch */}
                  <div className="absolute top-6 left-1/2 -translate-x-1/2 w-24 h-6 bg-[#1C1C1E] rounded-full z-10" />
                  <div className="rounded-[32px] overflow-hidden">
                    <img
                      src={`${BASE}screenshot-mobile.jpg`}
                      alt="Coldverse Driver App — Login screen"
                      className="w-full block"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-6 px-1 max-w-sm">
                <h3 className="font-bold text-[#0F172A] text-lg">
                  Android Driver App
                </h3>
                <p className="text-slate-500 text-sm mt-1">
                  Role-aware mobile app for drivers and field staff — GPS
                  attendance check-in, delivery tracking, and live location
                  sharing.
                </p>
                <ul className="mt-3 space-y-1.5">
                  {[
                    "Geo-fenced attendance (500 m radius)",
                    "Background GPS location pings",
                    "Delivery status updates on the go",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-slate-500 text-sm"
                    >
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="flex items-center gap-3 mt-5">
                  <a
                    href={PLAY_STORE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-[#0F172A] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#1E293B] transition-colors"
                  >
                    <Smartphone className="h-4 w-4" />
                    Google Play
                  </a>
                  <span className="text-xs text-slate-400 bg-slate-100 px-3 py-2 rounded-lg">
                    iOS — Coming Soon
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Banner ────────────────────────────────────── */}
      <section className="bg-[#0284C7] py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Ready to streamline your cold-chain operations?
          </h2>
          <p className="text-blue-100 mb-8 text-base">
            Open the Admin Console to get started — no setup required.
          </p>
          <a
            href={ADMIN_URL}
            className="inline-flex items-center gap-2 bg-white text-[#0284C7] font-bold px-8 py-3.5 rounded-xl hover:bg-blue-50 transition-colors text-base"
          >
            Admin Login →
          </a>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer className="bg-[#0F172A] py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img
              src={`${BASE}logo.png`}
              alt="Coldverse"
              className="h-7 w-auto"
            />
            <div className="h-5 w-px bg-white/20" />
            <span className="text-slate-400 text-sm">
              Coldverse DMS
            </span>
          </div>

          <p className="text-slate-500 text-sm text-center">
            © 2026 Coldverse Supply Chain Pvt. Ltd.
          </p>

          <nav className="flex items-center gap-6">
            <a
              href={ADMIN_URL}
              className="text-slate-400 hover:text-white text-sm transition-colors"
            >
              Admin Console
            </a>
            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-white text-sm transition-colors"
            >
              Android App
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
