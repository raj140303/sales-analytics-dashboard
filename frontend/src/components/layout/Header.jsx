import { CheckCircle2, Code2, Sparkles } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const pageContext = {
  '/': {
    eyebrow: 'Dashboard',
    title: 'Sales Analytics',
  },
  '/sales-entry': {
    eyebrow: 'Sales Entry',
    title: 'New transaction workspace',
  },
  '/sales-records': {
    eyebrow: 'Sales Records',
    title: 'Historical sales workspace',
  },
  '/products': {
    eyebrow: 'Products',
    title: 'Product catalog workspace',
  },
  '/analytics-preview': {
    eyebrow: 'Analytics Preview',
    title: 'Full-stack reporting flow',
  },
};

function Header() {
  const location = useLocation();
  const currentPage = pageContext[location.pathname] || pageContext['/'];

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-400">{currentPage.eyebrow}</p>
          <h2 className="mt-1 text-2xl font-bold tracking-normal text-slate-950 sm:text-3xl">{currentPage.title}</h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm">
            <Code2 className="h-4 w-4 text-slate-500" />
            <span>Portfolio Project</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            <span>Local API</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-sky-50 px-3 py-2 text-sm font-bold text-sky-700">
            <Sparkles className="h-4 w-4" />
            <span>UI Shell</span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
