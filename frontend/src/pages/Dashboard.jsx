import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  CircleDollarSign,
  Crown,
  Loader2,
  PackageCheck,
  RefreshCcw,
  ShoppingBag,
  UserRound,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api from '../api/api.js';

const chartColors = ['#0284c7', '#10b981', '#6366f1', '#f59e0b', '#64748b'];

const initialFilters = {
  year: '',
  startDate: '',
  state: '',
  city: '',
  category: '',
  product: '',
};

const formatInr = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);

const formatNumber = (value) => new Intl.NumberFormat('en-IN').format(Number.isFinite(value) ? value : 0);

function titleCase(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function truncateLabel(value, maxLength = 22) {
  if (!value || value.length <= maxLength) {
    return value || 'Unknown';
  }

  return `${value.slice(0, maxLength - 1)}...`;
}

function getSalesRows(response) {
  if (Array.isArray(response.data?.data?.items)) {
    return response.data.data.items;
  }

  if (Array.isArray(response.data?.data)) {
    return response.data.data;
  }

  if (Array.isArray(response.data)) {
    return response.data;
  }

  return [];
}

function getPagination(response) {
  return response.data?.data?.pagination || {};
}

function getProducts(response) {
  if (Array.isArray(response.data?.data)) {
    return response.data.data;
  }

  if (Array.isArray(response.data)) {
    return response.data;
  }

  return [];
}

async function fetchAllSales() {
  const limit = 10000;
  const firstResponse = await api.get('/sales', { params: { limit, page: 1 } });
  const firstRows = getSalesRows(firstResponse);
  const pagination = getPagination(firstResponse);
  const totalPages = Number(pagination.pages) || 1;
  const salesRows = [...firstRows];

  for (let page = 2; page <= totalPages; page += 1) {
    const response = await api.get('/sales', { params: { limit, page } });
    salesRows.push(...getSalesRows(response));
  }

  return salesRows;
}

function enrichSale(sale, productMap) {
  const product = productMap.get(Number(sale.product_id));
  const productName = sale.product_name || product?.product_name || 'Unknown Product';
  const category = sale.category || product?.category || 'Uncategorized';

  return {
    ...sale,
    product_id: Number(sale.product_id),
    product_name: productName,
    product_key: titleCase(productName),
    product_label: truncateLabel(titleCase(productName), 24),
    category: titleCase(category),
    customer_name: String(sale.customer_name || '').trim() || 'Unknown Customer',
    state: titleCase(sale.state),
    city: titleCase(sale.city),
    sale_date: sale.sale_date,
    quantity: Number(sale.quantity) || 0,
    total_sales: Number(sale.total_sales) || 0,
  };
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((first, second) => first.localeCompare(second));
}

function aggregateBy(rows, key, extraMapper) {
  const groups = new Map();

  rows.forEach((row) => {
    const name = row[key] || 'Unknown';
    const current = groups.get(name) || {
      name,
      label: truncateLabel(name),
      revenue: 0,
      orders: 0,
      extra: extraMapper ? extraMapper(row) : '',
    };

    current.revenue += row.total_sales;
    current.orders += 1;

    if (extraMapper && !current.extra) {
      current.extra = extraMapper(row);
    }

    groups.set(name, current);
  });

  return [...groups.values()].sort((first, second) => second.revenue - first.revenue);
}

function buildMonthlyTrend(rows) {
  const groups = new Map();

  rows.forEach((row) => {
    if (!row.sale_date) {
      return;
    }

    const date = new Date(row.sale_date);
    if (Number.isNaN(date.getTime())) {
      return;
    }

    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    const current = groups.get(key) || { key, month: label, revenue: 0, orders: 0 };

    current.revenue += row.total_sales;
    current.orders += 1;
    groups.set(key, current);
  });

  return [...groups.values()].sort((first, second) => first.key.localeCompare(second.key));
}

function calculateMetrics(rows) {
  const totalRevenue = rows.reduce((sum, sale) => sum + sale.total_sales, 0);
  const totalOrders = rows.length;

  return {
    totalRevenue,
    totalOrders,
    averageOrderValue: totalOrders ? totalRevenue / totalOrders : 0,
    uniqueCustomers: new Set(rows.map((sale) => sale.customer_name.toLowerCase())).size,
  };
}

function calculateComparison(currentValue, previousValue) {
  if (!previousValue || previousValue <= 0) {
    return {
      label: 'No prior comparison',
      tone: 'neutral',
    };
  }

  const change = ((currentValue - previousValue) / previousValue) * 100;
  const direction = change >= 0 ? 'up' : 'down';

  return {
    label: `${Math.abs(change).toFixed(1)}% vs previous period`,
    tone: direction,
  };
}

function buildComparisonRows(rows, filters) {
  if (filters.year) {
    const previousYear = String(Number(filters.year) - 1);

    return rows.filter((sale) => {
      const saleYear = sale.sale_date ? String(new Date(sale.sale_date).getFullYear()) : '';

      return (
        saleYear === previousYear &&
        matchesNonDateFilters(sale, filters)
      );
    });
  }

  if (filters.startDate) {
    const currentStart = new Date(filters.startDate);
    const latestDate = rows.reduce((latest, sale) => {
      const saleDate = new Date(sale.sale_date);
      return !Number.isNaN(saleDate.getTime()) && saleDate > latest ? saleDate : latest;
    }, currentStart);
    const periodDays = Math.max(1, Math.round((latestDate - currentStart) / 86400000) + 1);
    const previousEnd = new Date(currentStart);
    previousEnd.setDate(previousEnd.getDate() - 1);
    const previousStart = new Date(previousEnd);
    previousStart.setDate(previousStart.getDate() - periodDays + 1);

    return rows.filter((sale) => {
      const saleDate = new Date(sale.sale_date);

      return (
        !Number.isNaN(saleDate.getTime()) &&
        saleDate >= previousStart &&
        saleDate <= previousEnd &&
        matchesNonDateFilters(sale, filters)
      );
    });
  }

  return [];
}

function matchesNonDateFilters(sale, filters) {
  return (
    (!filters.state || sale.state === filters.state) &&
    (!filters.city || sale.city === filters.city) &&
    (!filters.category || sale.category === filters.category) &&
    (!filters.product || sale.product_key === filters.product)
  );
}

function Dashboard() {
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      try {
        setIsLoading(true);
        setError('');

        const [salesRows, productResponse] = await Promise.all([fetchAllSales(), api.get('/products')]);

        if (isMounted) {
          setSales(salesRows);
          setProducts(getProducts(productResponse));
        }
      } catch (loadError) {
        if (isMounted) {
          setError('Dashboard data could not be loaded. Please check that the Flask backend is running on http://127.0.0.1:5000.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, []);

  const enrichedSales = useMemo(() => {
    const productMap = new Map(products.map((product) => [Number(product.product_id), product]));
    return sales.map((sale) => enrichSale(sale, productMap));
  }, [sales, products]);

  const filterOptions = useMemo(
    () => ({
      years: uniqueSorted(enrichedSales.map((sale) => (sale.sale_date ? String(new Date(sale.sale_date).getFullYear()) : ''))).reverse(),
      states: uniqueSorted(enrichedSales.map((sale) => sale.state)),
      cities: uniqueSorted(enrichedSales.filter((sale) => !filters.state || sale.state === filters.state).map((sale) => sale.city)),
      categories: uniqueSorted(enrichedSales.map((sale) => sale.category)),
      products: uniqueSorted(enrichedSales.filter((sale) => !filters.category || sale.category === filters.category).map((sale) => sale.product_key)),
    }),
    [enrichedSales, filters.category, filters.state]
  );

  const filteredSales = useMemo(
    () =>
      enrichedSales.filter((sale) => {
        const saleDate = sale.sale_date || '';
        const saleYear = saleDate ? String(new Date(saleDate).getFullYear()) : '';

        return (
          (!filters.year || saleYear === filters.year) &&
          (!filters.startDate || saleDate >= filters.startDate) &&
          matchesNonDateFilters(sale, filters)
        );
      }),
    [enrichedSales, filters]
  );

  const dashboardData = useMemo(() => {
    const currentMetrics = calculateMetrics(filteredSales);
    const previousMetrics = calculateMetrics(buildComparisonRows(enrichedSales, filters));
    const productLeaders = aggregateBy(filteredSales, 'product_key');
    const cityLeaders = aggregateBy(filteredSales, 'city', (sale) => sale.state);
    const stateLeaders = aggregateBy(filteredSales, 'state');
    const categoryRevenue = aggregateBy(filteredSales, 'category').map((row) => ({
      ...row,
      share: currentMetrics.totalRevenue ? (row.revenue / currentMetrics.totalRevenue) * 100 : 0,
    }));

    return {
      ...currentMetrics,
      comparisons: {
        totalRevenue: calculateComparison(currentMetrics.totalRevenue, previousMetrics.totalRevenue),
        totalOrders: calculateComparison(currentMetrics.totalOrders, previousMetrics.totalOrders),
        averageOrderValue: calculateComparison(currentMetrics.averageOrderValue, previousMetrics.averageOrderValue),
        uniqueCustomers: calculateComparison(currentMetrics.uniqueCustomers, previousMetrics.uniqueCustomers),
      },
      topProduct: productLeaders[0],
      topCity: cityLeaders[0],
      topState: stateLeaders[0],
      monthlyTrend: buildMonthlyTrend(filteredSales),
      categoryRevenue,
      stateRevenue: stateLeaders.slice(0, 8),
      productLeaders: productLeaders.slice(0, 10).map((row) => ({ ...row, label: truncateLabel(row.name, 24) })),
      cityLeaders: cityLeaders.slice(0, 10).map((row) => ({ ...row, label: truncateLabel(row.name, 18) })),
      recentSales: [...filteredSales]
        .sort((first, second) => {
          const firstDate = `${first.sale_date || ''}-${first.created_at || ''}`;
          const secondDate = `${second.sale_date || ''}-${second.created_at || ''}`;
          return secondDate.localeCompare(firstDate);
        })
        .slice(0, 10),
    };
  }, [enrichedSales, filteredSales, filters]);

  function updateFilter(field, value) {
    setFilters((currentFilters) => {
      const nextFilters = {
        ...currentFilters,
        [field]: value,
      };

      if (field === 'state') {
        nextFilters.city = '';
      }

      if (field === 'category') {
        nextFilters.product = '';
      }

      return nextFilters;
    });
  }

  function clearFilters() {
    setFilters(initialFilters);
  }

  if (isLoading) {
    return (
      <section className="page-shell">
        <DashboardTitle />
        <div className="placeholder-card flex min-h-[460px] items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-sky-600" />
            <p className="mt-4 text-xl font-bold text-slate-950">Loading live sales dashboard</p>
            <p className="mt-2 text-base text-slate-500">Fetching sales and product records from the Flask API.</p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="page-shell">
        <DashboardTitle />
        <div className="placeholder-card border-rose-200 bg-rose-50">
          <div className="flex items-start gap-3 text-rose-800">
            <AlertCircle className="mt-1 h-6 w-6" />
            <div>
              <h4 className="text-2xl font-bold">Backend unavailable</h4>
              <p className="mt-2 text-base font-semibold">{error}</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page-shell">
      <DashboardTitle />

      <FilterBar filters={filters} filterOptions={filterOptions} onChange={updateFilter} onClear={clearFilters} />

      {filteredSales.length === 0 ? (
        <div className="placeholder-card border-amber-200 bg-amber-50">
          <h4 className="text-2xl font-bold text-amber-900">No sales match the selected filters</h4>
          <p className="mt-2 text-base font-semibold text-amber-800">Clear filters or choose a broader date, product, or geography range.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-4">
            <KpiCard title="Total Revenue" value={formatInr(dashboardData.totalRevenue)} detail="Sum of total_sales" icon={CircleDollarSign} accent="text-emerald-600" comparison={dashboardData.comparisons.totalRevenue} />
            <KpiCard title="Total Orders" value={formatNumber(dashboardData.totalOrders)} detail="Count of sales records" icon={ShoppingBag} accent="text-sky-600" comparison={dashboardData.comparisons.totalOrders} />
            <KpiCard title="Average Order Value" value={formatInr(dashboardData.averageOrderValue)} detail="Revenue divided by orders" icon={BarChart3} accent="text-indigo-600" comparison={dashboardData.comparisons.averageOrderValue} />
            <KpiCard title="Unique Customers" value={formatNumber(dashboardData.uniqueCustomers)} detail="Unique customer_name values" icon={UserRound} accent="text-amber-600" comparison={dashboardData.comparisons.uniqueCustomers} />
          </div>

          <div className="grid gap-5 xl:grid-cols-3">
            <LeaderCard title="Top Product by Revenue" name={dashboardData.topProduct?.name} value={formatInr(dashboardData.topProduct?.revenue || 0)} icon={PackageCheck} />
            <LeaderCard title="Top City by Revenue" name={dashboardData.topCity?.name} value={formatInr(dashboardData.topCity?.revenue || 0)} icon={Building2} />
            <LeaderCard title="Top State by Revenue" name={dashboardData.topState?.name} value={formatInr(dashboardData.topState?.revenue || 0)} icon={Crown} />
          </div>

          <ChartCard title="Monthly Revenue Trend" subtitle="Business question: how is revenue changing month by month?" className="min-h-[500px]">
            <ResponsiveContainer width="100%" height={370}>
              <LineChart data={dashboardData.monthlyTrend} margin={{ top: 22, right: 34, left: 20, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fill: '#475569', fontSize: 13, fontWeight: 700 }} tickMargin={12} />
                <YAxis tickFormatter={shortInr} tick={{ fill: '#475569', fontSize: 13, fontWeight: 700 }} tickMargin={10} label={{ value: 'Revenue INR', angle: -90, position: 'insideLeft', fill: '#475569', fontSize: 13, fontWeight: 700 }} />
                <Tooltip content={<RevenueTooltip labelName="Month" />} />
                <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#0284c7" strokeWidth={3.5} dot={{ r: 4 }} activeDot={{ r: 7 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="grid gap-5 2xl:grid-cols-2">
            <ChartCard title="Revenue by Category" subtitle="Business question: which product categories generate the most revenue?">
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={dashboardData.categoryRevenue} margin={{ top: 20, right: 28, left: 12, bottom: 46 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 13, fontWeight: 700 }} angle={-18} textAnchor="end" height={76} interval={0} />
                  <YAxis tickFormatter={shortInr} tick={{ fill: '#475569', fontSize: 13, fontWeight: 700 }} width={72} label={{ value: 'Revenue INR', angle: -90, position: 'insideLeft', fill: '#475569', fontSize: 13, fontWeight: 700 }} />
                  <Tooltip content={<RevenueTooltip labelName="Category" showShare />} />
                  <Bar dataKey="revenue" name="Revenue" radius={[8, 8, 0, 0]}>
                    {dashboardData.categoryRevenue.map((entry, index) => (
                      <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Revenue by State" subtitle="Business question: which states are driving sales revenue?">
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={dashboardData.stateRevenue} layout="vertical" margin={{ top: 20, right: 34, left: 20, bottom: 28 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tickFormatter={shortInr} tick={{ fill: '#475569', fontSize: 13, fontWeight: 700 }} tickMargin={8} label={{ value: 'Revenue INR', position: 'insideBottom', offset: -18, fill: '#475569', fontSize: 13, fontWeight: 700 }} />
                  <YAxis dataKey="name" type="category" width={112} tick={{ fill: '#475569', fontSize: 13, fontWeight: 700 }} />
                  <Tooltip content={<RevenueTooltip labelName="State" />} />
                  <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="grid gap-5 2xl:grid-cols-2">
            <ChartCard title="Top 10 Products by Revenue" subtitle="Business question: which products lead revenue contribution?">
              <ResponsiveContainer width="100%" height={440}>
                <BarChart data={dashboardData.productLeaders} layout="vertical" margin={{ top: 20, right: 32, left: 28, bottom: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tickFormatter={shortInr} tick={{ fill: '#475569', fontSize: 13, fontWeight: 700 }} tickMargin={8} label={{ value: 'Revenue INR', position: 'insideBottom', offset: -16, fill: '#475569', fontSize: 13, fontWeight: 700 }} />
                  <YAxis dataKey="label" type="category" width={160} tick={{ fill: '#475569', fontSize: 12.5, fontWeight: 700 }} />
                  <Tooltip content={<RevenueTooltip labelName="Product" />} />
                  <Bar dataKey="revenue" name="Revenue" fill="#6366f1" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Top 10 Cities by Revenue" subtitle="Business question: which cities are the strongest sales markets?">
              <ResponsiveContainer width="100%" height={440}>
                <BarChart data={dashboardData.cityLeaders} layout="vertical" margin={{ top: 20, right: 32, left: 18, bottom: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tickFormatter={shortInr} tick={{ fill: '#475569', fontSize: 13, fontWeight: 700 }} tickMargin={8} label={{ value: 'Revenue INR', position: 'insideBottom', offset: -16, fill: '#475569', fontSize: 13, fontWeight: 700 }} />
                  <YAxis dataKey="label" type="category" width={116} tick={{ fill: '#475569', fontSize: 13, fontWeight: 700 }} />
                  <Tooltip content={<RevenueTooltip labelName="City" showExtra />} />
                  <Bar dataKey="revenue" name="Revenue" fill="#f59e0b" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <RecentSalesTable rows={dashboardData.recentSales} />
        </>
      )}
    </section>
  );
}

function DashboardTitle() {
  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <p className="page-eyebrow">Dashboard</p>
        <h3 className="page-title">Sales Performance Dashboard</h3>
        <p className="page-description">
          Revenue, customer, product, and geography performance from MySQL-backed sales data.
        </p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 shadow-sm">
        Live MySQL + Flask data
      </div>
    </div>
  );
}

function FilterBar({ filters, filterOptions, onChange, onClear }) {
  return (
    <article className="placeholder-card">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-slate-400">Dashboard Filters</p>
          <h4 className="mt-1 text-2xl font-bold text-slate-950">Refine the sales view</h4>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-base font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:text-sky-700"
        >
          <RefreshCcw className="h-4 w-4" />
          Clear Filters
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <FilterSelect label="Year" value={filters.year} options={filterOptions.years} onChange={(value) => onChange('year', value)} />
        <FilterInput label="From Date" type="date" value={filters.startDate} onChange={(value) => onChange('startDate', value)} />
        <FilterSelect label="State" value={filters.state} options={filterOptions.states} onChange={(value) => onChange('state', value)} />
        <FilterSelect label="City" value={filters.city} options={filterOptions.cities} onChange={(value) => onChange('city', value)} />
        <FilterSelect label="Category" value={filters.category} options={filterOptions.categories} onChange={(value) => onChange('category', value)} />
        <FilterSelect label="Product" value={filters.product} options={filterOptions.products} onChange={(value) => onChange('product', value)} />
      </div>
    </article>
  );
}

function FilterInput({ label, type, value, onChange }) {
  return (
    <label className="block">
      <span className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-3.5 text-base font-semibold text-slate-800 shadow-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
      />
    </label>
  );
}

function FilterSelect({ label, value, options, onChange }) {
  return (
    <label className="block">
      <span className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-3.5 text-base font-semibold text-slate-800 shadow-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function KpiCard({ title, value, detail, icon: Icon, accent, comparison }) {
  return (
    <article className="placeholder-card min-h-[220px]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-50">
          <Icon className={`h-6 w-6 ${accent}`} />
        </div>
        <ComparisonBadge comparison={comparison} />
      </div>
      <h4 className="mt-5 text-lg font-bold text-slate-700">{title}</h4>
      <p className="mt-4 text-3xl font-bold tracking-normal text-slate-950 2xl:text-4xl">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{detail}</p>
    </article>
  );
}

function ComparisonBadge({ comparison }) {
  if (!comparison || comparison.tone === 'neutral') {
    return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">No prior comparison</span>;
  }

  const isUp = comparison.tone === 'up';
  const Icon = isUp ? ArrowUpRight : ArrowDownRight;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${isUp ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
      <Icon className="h-3.5 w-3.5" />
      {comparison.label}
    </span>
  );
}

function LeaderCard({ title, name, value, icon: Icon }) {
  return (
    <article className="placeholder-card min-h-[170px]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-slate-400">{title}</p>
          <h4 className="mt-3 text-2xl font-bold text-slate-950">{name || 'No data'}</h4>
          <p className="mt-2 text-lg font-bold text-emerald-600">{value}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </article>
  );
}

function ChartCard({ title, subtitle, children, className = '' }) {
  return (
    <article className={`placeholder-card p-7 ${className}`}>
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-slate-400">Live Chart</p>
          <h4 className="mt-2 text-2xl font-bold text-slate-950">{title}</h4>
          <p className="mt-2 text-base font-semibold text-slate-500">{subtitle}</p>
        </div>
      </div>
      {children}
    </article>
  );
}

function RevenueTooltip({ active, payload, label, labelName, showShare = false, showExtra = false }) {
  if (!active || !payload?.length) {
    return null;
  }

  const row = payload[0].payload;

  return (
    <div className="max-w-[320px] rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm shadow-premium">
      <p className="font-bold text-slate-950">
        {labelName}: {row.name || label}
      </p>
      <p className="mt-1 font-semibold text-emerald-600">Revenue: {formatInr(row.revenue)}</p>
      {'orders' in row && <p className="mt-1 font-semibold text-slate-600">Orders: {formatNumber(row.orders)}</p>}
      {showShare && <p className="mt-1 font-semibold text-slate-600">Share: {row.share.toFixed(1)}%</p>}
      {showExtra && row.extra && <p className="mt-1 font-semibold text-slate-600">State: {row.extra}</p>}
    </div>
  );
}

function RecentSalesTable({ rows }) {
  return (
    <article className="placeholder-card overflow-hidden p-0">
      <div className="border-b border-slate-200 px-7 py-6">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-slate-400">Recent Sales</p>
        <h4 className="mt-1 text-2xl font-bold text-slate-950">Latest 10 transactions after filters</h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left">
          <thead className="bg-slate-50 text-sm font-bold uppercase tracking-[0.1em] text-slate-500">
            <tr>
              <th className="px-6 py-4">Customer Name</th>
              <th className="px-6 py-4">Product Name</th>
              <th className="px-6 py-4">Category</th>
              <th className="px-6 py-4">State</th>
              <th className="px-6 py-4">City</th>
              <th className="px-6 py-4">Total Sales</th>
              <th className="px-6 py-4">Sale Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-base">
            {rows.map((sale) => (
              <tr key={sale.sale_id} className="transition hover:bg-slate-50">
                <td className="px-6 py-5 font-bold text-slate-800">{sale.customer_name}</td>
                <td className="px-6 py-5 font-semibold text-slate-700">{sale.product_name}</td>
                <td className="px-6 py-5 font-semibold text-slate-600">{sale.category}</td>
                <td className="px-6 py-5 font-semibold text-slate-600">{sale.state}</td>
                <td className="px-6 py-5 font-semibold text-slate-600">{sale.city}</td>
                <td className="px-6 py-5 font-bold text-emerald-700">{formatInr(sale.total_sales)}</td>
                <td className="px-6 py-5 font-semibold text-slate-600">{sale.sale_date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function shortInr(value) {
  if (Math.abs(value) >= 10000000) {
    return `INR ${(value / 10000000).toFixed(1)}Cr`;
  }

  if (Math.abs(value) >= 100000) {
    return `INR ${(value / 100000).toFixed(1)}L`;
  }

  if (Math.abs(value) >= 1000) {
    return `INR ${(value / 1000).toFixed(0)}K`;
  }

  return `INR ${value}`;
}

export default Dashboard;
