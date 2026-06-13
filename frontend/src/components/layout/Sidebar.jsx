import { BarChart3, Boxes, CheckCircle2, Database, LayoutDashboard, LineChart, PlusCircle } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const navigationItems = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard, end: true },
  { label: 'Sales Entry', to: '/sales-entry', icon: PlusCircle },
  { label: 'Sales Records', to: '/sales-records', icon: BarChart3 },
  { label: 'Products', to: '/products', icon: Boxes },
  { label: 'Analytics Preview', to: '/analytics-preview', icon: LineChart },
];

function Sidebar() {
  return (
    <aside className="flex h-full w-full flex-col border-r border-slate-200 bg-white/90 px-5 py-5 shadow-[8px_0_40px_rgba(15,23,42,0.04)] backdrop-blur-xl">
      <div className="mb-7 rounded-lg border border-slate-200 bg-slate-950 p-5 text-white shadow-lg shadow-slate-200/80">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white text-slate-950">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-200">Sales Analytics</p>
            <h1 className="mt-1 text-2xl font-bold tracking-normal">Command Center</h1>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-300">Premium local analytics shell for Indian sales operations.</p>
      </div>

      <p className="mb-3 px-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Workspace</p>
      <nav className="flex flex-1 gap-2 overflow-x-auto lg:flex-col lg:overflow-x-visible">
        {navigationItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  'group flex min-w-max items-center gap-3 rounded-lg px-4 py-3 text-base font-semibold transition duration-200',
                  isActive
                    ? 'bg-sky-600 text-white shadow-lg shadow-sky-100'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 hover:shadow-sm',
                ].join(' ')
              }
            >
              <Icon className="h-5 w-5 shrink-0 transition duration-200 group-hover:scale-110" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
        <div className="flex items-center gap-2 text-emerald-700">
          <CheckCircle2 className="h-5 w-5" />
          <p className="text-base font-bold">Backend Connected</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-700 shadow-sm">Local Mode</span>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 shadow-sm">
            <Database className="mr-1 inline h-3.5 w-3.5" />
            MySQL + Flask
          </span>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
