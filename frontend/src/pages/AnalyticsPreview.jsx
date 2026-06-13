import { useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Boxes,
  Calculator,
  CheckCircle2,
  ClipboardList,
  Database,
  Layers3,
  ListChecks,
  Network,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

const guideCards = [
  {
    id: 'business-overview',
    title: 'Business Overview',
    summary: 'See what each page contributes to the sales analytics system.',
    icon: BookOpen,
    eyebrow: 'Business Purpose',
    accent: 'bg-sky-50 text-sky-700',
    sections: [
      {
        title: 'How the app supports the business',
        type: 'bullets',
        items: [
          'Sales Entry captures new sales transactions.',
          'Sales Records helps search, filter, and verify transaction-level sales history.',
          'Products explains product master data, category mix, product performance, and regional product behavior.',
          'Dashboard summarizes revenue, orders, product performance, geography trends, and recent sales.',
          'Analytics Guide explains how the system works and how insights are calculated.',
        ],
      },
    ],
  },
  {
    id: 'sales-entry-flow',
    title: 'Sales Entry Flow',
    summary: 'Follow a new sale from form submission to stored transaction.',
    icon: ClipboardList,
    eyebrow: 'Transaction Capture',
    accent: 'bg-emerald-50 text-emerald-700',
    sections: [
      {
        title: 'Step-by-step flow',
        type: 'flow',
        items: [
          'User fills Sales Entry form',
          'React validates required fields',
          'React calculates total sales',
          'React sends POST /api/sales to Flask backend',
          'Flask inserts the record into MySQL sales table',
          'Frontend shows success message',
          'The new sale becomes available in Sales Records, Dashboard, and Products analytics',
        ],
      },
      {
        title: 'Verified example',
        type: 'callout',
        text: 'A sale entered from the frontend was verified in MySQL.',
      },
      {
        title: 'What this proves',
        type: 'inlineFlow',
        items: ['React Frontend', 'Flask Backend', 'MySQL Database'],
      },
    ],
  },
  {
    id: 'product-master-flow',
    title: 'Product Master Flow',
    summary: 'Understand how product master data feeds forms and analytics.',
    icon: Boxes,
    eyebrow: 'Product Catalog',
    accent: 'bg-indigo-50 text-indigo-700',
    sections: [
      {
        title: 'Step-by-step flow',
        type: 'flow',
        items: [
          'Sales Entry page loads',
          'React calls GET /api/products',
          'Flask fetches product_id, product_name, and category from the products table',
          'Product dropdown shows product_name',
          'Selected product_id is submitted with the sale',
          'Product/category data is used in Dashboard and Products analytics',
        ],
      },
      {
        title: 'Key rule',
        type: 'callout',
        text: 'Products are not hardcoded in the form. They come from the MySQL-backed products table.',
      },
    ],
  },
  {
    id: 'data-flow-architecture',
    title: 'Data Flow Architecture',
    summary: 'Review how data moves through the app from entry to visuals.',
    icon: Network,
    eyebrow: 'System Flow',
    accent: 'bg-cyan-50 text-cyan-700',
    sections: [
      {
        title: 'Primary architecture',
        type: 'architecture',
        items: [
          {
            label: 'React Frontend',
            detail: 'User enters sales, views records, searches products, and reads analytics.',
          },
          {
            label: 'Flask REST API',
            detail: 'Handles GET/POST requests for products and sales.',
          },
          {
            label: 'MySQL Database',
            detail: 'Stores product master and sales transaction data.',
          },
          {
            label: 'Frontend Analytics Logic',
            detail: 'Groups revenue by month, product, category, state, city, and customer.',
          },
          {
            label: 'Visual Pages',
            detail: 'Dashboard, Products, Sales Records, and Analytics Guide show business-friendly insights.',
          },
        ],
      },
      {
        title: 'Mini flows',
        type: 'miniFlows',
        items: [
          {
            label: 'A. Insert flow',
            steps: ['Sales Entry', 'POST /api/sales', 'MySQL sales table'],
          },
          {
            label: 'B. Read/analytics flow',
            steps: ['Dashboard / Products / Sales Records', 'GET /api/sales + GET /api/products', 'KPIs, charts, and tables'],
          },
        ],
      },
    ],
  },
  {
    id: 'kpi-guide',
    title: 'KPI Guide',
    summary: 'Read the business meaning behind each dashboard measure.',
    icon: Calculator,
    eyebrow: 'Metric Definitions',
    accent: 'bg-amber-50 text-amber-700',
    sections: [
      {
        title: 'KPI definitions',
        type: 'formulaList',
        items: [
          ['Total Revenue', 'Sum of total_sales', 'Shows the total value of all matching sales transactions.'],
          ['Total Orders', 'Count of sales records', 'Shows how many sales transactions are in the selected view.'],
          ['Average Order Value', 'Total Revenue / Total Orders', 'Shows the average revenue generated per order.'],
          ['Top Product by Revenue', 'Product with highest total_sales', 'Identifies the strongest revenue-generating product.'],
          ['Top Category by Revenue', 'Category with highest total_sales', 'Shows which product category contributes the most revenue.'],
          ['Top State by Revenue', 'State with highest total_sales', 'Highlights the strongest state-level sales market.'],
          ['Top City by Revenue', 'City with highest total_sales', 'Highlights the strongest city-level sales market.'],
          ['Unique Customers', 'Count of distinct customer_name', 'Shows how many different customers appear in the selected sales records.'],
          ['Products With Sales', 'Product master items that appear in sales records', 'Shows catalog items that have generated sales in the selected scope.'],
          ['Products Without Sales', 'Product master items that do not appear in sales records for the selected scope', 'Helps identify catalog items with no sales activity in the selected view.'],
        ],
      },
    ],
  },
  {
    id: 'data-quality-normalization',
    title: 'Data Quality & Normalization',
    summary: 'Learn how clean text values improve grouping and analysis.',
    icon: ShieldCheck,
    eyebrow: 'Data Quality',
    accent: 'bg-rose-50 text-rose-700',
    sections: [
      {
        title: 'Normalization rules',
        type: 'bullets',
        items: [
          'New Sales Entry normalizes city/state values before submit where applicable.',
          'Dashboard/Product grouping should treat ahmedabad, Ahmedabad, and AHMEDABAD as Ahmedabad.',
          'MySQL collation is case-insensitive, but raw stored values can still differ.',
          'Typos like Ahmedahbad need mapping/cleaning, not only case normalization.',
        ],
      },
      {
        title: 'Simple example',
        type: 'mappingExample',
        source: ['ahmedabad', 'AHMEDABAD', 'Ahmedabad'],
        target: 'Ahmedabad',
      },
      {
        title: 'Casing vs spelling',
        type: 'bullets',
        items: [
          'Ahmedabad and AHMEDABAD are casing differences.',
          'Ahmedahbad is a spelling typo and needs a correction mapping.',
        ],
      },
    ],
  },
  {
    id: 'page-usage-guide',
    title: 'Page Usage Guide',
    summary: 'Use each page for the right business review task.',
    icon: ListChecks,
    eyebrow: 'How To Use',
    accent: 'bg-violet-50 text-violet-700',
    sections: [
      {
        title: 'Recommended page usage',
        type: 'usageGrid',
        items: [
          ['Sales Entry', 'Add a new transaction.', ClipboardList],
          ['Sales Records', 'Verify and search transaction history.', Search],
          ['Products', 'Review product catalog, product performance, products with/without sales, and category performance by geography.', Boxes],
          ['Dashboard', 'Review high-level KPIs, trends, top products, top cities, and top states.', BarChart3],
          ['Analytics Guide', 'Understand the system flow, KPI definitions, and data quality rules.', BookOpen],
        ],
      },
    ],
  },
];

function AnalyticsPreview() {
  const [activeGuideId, setActiveGuideId] = useState(guideCards[0].id);
  const activeGuide = useMemo(
    () => guideCards.find((guide) => guide.id === activeGuideId) || guideCards[0],
    [activeGuideId]
  );

  return (
    <section className="page-shell">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="page-eyebrow">Analytics Guide</p>
          <h3 className="page-title">Analytics Guide</h3>
          <p className="page-description">
            Understand how sales data moves through the system and how each insight is calculated.
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 shadow-sm">
          React + Flask + MySQL
        </div>
      </div>

      <article className="rounded-lg border border-slate-200/80 bg-slate-950 p-6 text-white shadow-soft">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/10 text-sky-200">
              <Sparkles className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-sky-200">Completed Sales Analytics System</p>
              <h4 className="mt-2 text-2xl font-bold tracking-normal text-white">
                A practical guide for reviewing transactions, products, KPIs, and data quality.
              </h4>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-200">
            {['Sales Entry', 'Sales Records', 'Products', 'Dashboard', 'Analytics Guide'].map((label, index, items) => (
              <span key={label} className="inline-flex items-center gap-2">
                <span className="rounded-lg bg-white/10 px-3 py-2">{label}</span>
                {index < items.length - 1 && <ArrowRight className="h-4 w-4 text-sky-300" />}
              </span>
            ))}
          </div>
        </div>
      </article>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
          {guideCards.map((guide) => (
            <GuideCard
              key={guide.id}
              guide={guide}
              isActive={guide.id === activeGuide.id}
              onClick={() => setActiveGuideId(guide.id)}
            />
          ))}
        </div>

        <GuideDetail guide={activeGuide} />
      </div>
    </section>
  );
}

function GuideCard({ guide, isActive, onClick }) {
  const Icon = guide.icon;
  const handlePointerDown = (event) => {
    if (event.button === 0) {
      onClick();
    }
  };

  return (
    <button
      type="button"
      data-guide-id={guide.id}
      aria-pressed={isActive}
      onPointerDown={handlePointerDown}
      onClick={onClick}
      className={[
        'group w-full rounded-lg border bg-white p-5 text-left shadow-soft transition duration-200',
        'hover:-translate-y-1 hover:border-sky-200 hover:shadow-xl',
        'focus:outline-none focus:ring-4 focus:ring-sky-100',
        isActive ? 'border-sky-300 ring-2 ring-sky-100' : 'border-slate-200/80',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${guide.accent}`}>
          <Icon className="h-6 w-6" />
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${isActive ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'}`}>
          {isActive ? 'Selected' : 'Open'}
        </span>
      </div>
      <p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{guide.eyebrow}</p>
      <h4 className="mt-2 text-xl font-bold text-slate-950">{guide.title}</h4>
      <p className="mt-3 text-base leading-7 text-slate-600">{guide.summary}</p>
    </button>
  );
}

function GuideDetail({ guide }) {
  const Icon = guide.icon;

  return (
    <article className="overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-soft transition duration-200">
      <div className="border-b border-slate-200 bg-slate-50 px-7 py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${guide.accent}`}>
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-slate-400">{guide.eyebrow}</p>
              <h4 className="mt-1 text-3xl font-bold text-slate-950">{guide.title}</h4>
              <p className="mt-2 max-w-4xl text-base font-semibold leading-7 text-slate-600">{guide.summary}</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-bold text-emerald-700 shadow-sm">
            <CheckCircle2 className="h-4 w-4" />
            Guide selected
          </span>
        </div>
      </div>

      <div className="space-y-7 px-7 py-7">
        {guide.sections.map((section) => (
          <DetailSection key={section.title} section={section} />
        ))}
      </div>
    </article>
  );
}

function DetailSection({ section }) {
  if (section.type === 'flow') {
    return (
      <section>
        <SectionTitle icon={Layers3} title={section.title} />
        <FlowSteps steps={section.items} />
      </section>
    );
  }

  if (section.type === 'inlineFlow') {
    return (
      <section>
        <SectionTitle icon={Network} title={section.title} />
        <InlineFlow steps={section.items} />
      </section>
    );
  }

  if (section.type === 'architecture') {
    return (
      <section>
        <SectionTitle icon={Network} title={section.title} />
        <div className="mt-4 grid gap-4 lg:grid-cols-2 2xl:grid-cols-5">
          {section.items.map((item, index) => (
            <div key={item.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Step {index + 1}</p>
                <Database className="h-4 w-4 text-sky-600" />
              </div>
              <h5 className="mt-3 text-lg font-bold text-slate-950">{item.label}</h5>
              <p className="mt-2 text-base font-semibold leading-7 text-slate-600">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (section.type === 'miniFlows') {
    return (
      <section>
        <SectionTitle icon={ListChecks} title={section.title} />
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {section.items.map((flow) => (
            <div key={flow.label} className="rounded-lg border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-slate-400">{flow.label}</p>
              <InlineFlow steps={flow.steps} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (section.type === 'formulaList') {
    return (
      <section>
        <SectionTitle icon={Calculator} title={section.title} />
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {section.items.map(([label, formula, meaning]) => (
            <div key={label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-lg font-bold text-slate-950">{label}</p>
              <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-base font-bold text-slate-700">{formula}</p>
              <p className="mt-3 text-base font-semibold leading-7 text-slate-600">{meaning}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (section.type === 'mappingExample') {
    return (
      <section>
        <SectionTitle icon={ShieldCheck} title={section.title} />
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-5">
          <div className="flex flex-wrap items-center gap-2 text-base font-bold text-slate-700">
            {section.source.map((value, index) => (
              <span key={value} className="inline-flex items-center gap-2">
                <span className="rounded-lg bg-white px-3 py-2 shadow-sm">{value}</span>
                {index < section.source.length - 1 && <span className="text-slate-400">/</span>}
              </span>
            ))}
            <ArrowRight className="h-5 w-5 text-sky-600" />
            <span className="rounded-lg bg-emerald-100 px-3 py-2 text-emerald-800">{section.target}</span>
          </div>
        </div>
      </section>
    );
  }

  if (section.type === 'usageGrid') {
    return (
      <section>
        <SectionTitle icon={ListChecks} title={section.title} />
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {section.items.map(([label, detail, Icon]) => (
            <div key={label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-950">{label}</p>
                  <p className="mt-2 text-base font-semibold leading-7 text-slate-600">{detail}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (section.type === 'callout') {
    return (
      <section className="rounded-lg border border-sky-100 bg-sky-50 p-5">
        <SectionTitle icon={CheckCircle2} title={section.title} />
        <p className="mt-3 text-base font-semibold leading-7 text-slate-700">{section.text}</p>
      </section>
    );
  }

  return (
    <section>
      <SectionTitle icon={BookOpen} title={section.title} />
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {section.items.map((item) => (
          <div key={item} className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-base font-semibold leading-7 text-slate-700 shadow-sm">
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}

function SectionTitle({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-5 w-5 text-sky-700" />
      <h5 className="text-xl font-bold text-slate-950">{title}</h5>
    </div>
  );
}

function FlowSteps({ steps }) {
  return (
    <div className="mt-4 grid gap-3">
      {steps.map((step, index) => (
        <div key={step} className="flex items-start gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-600 text-sm font-bold text-white">
            {index + 1}
          </div>
          <p className="flex-1 text-base font-bold leading-7 text-slate-800">{step}</p>
        </div>
      ))}
    </div>
  );
}

function InlineFlow({ steps }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {steps.map((step, index) => (
        <span key={step} className="inline-flex items-center gap-2">
          <span className="rounded-lg bg-white px-3 py-2 text-sm font-bold text-slate-800 shadow-sm">{step}</span>
          {index < steps.length - 1 && <ArrowRight className="h-4 w-4 text-sky-600" />}
        </span>
      ))}
    </div>
  );
}

export default AnalyticsPreview;
