import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Database,
  HelpCircle,
  Loader2,
  RefreshCcw,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  TrendingUp,
} from 'lucide-react';
import api from '../api/api.js';

const initialFilters = {
  search: '',
  state: '',
  city: '',
  category: '',
  product_id: '',
  start_date: '',
  end_date: '',
  limit: '10',
};

const formatInr = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);

const formatNumber = (value) => new Intl.NumberFormat('en-IN').format(Number.isFinite(value) ? value : 0);

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function titleCase(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
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
  const fetchLimit = 10000;
  const firstResponse = await api.get('/sales', { params: { page: 1, limit: fetchLimit } });
  const rows = [...getSalesRows(firstResponse)];
  const pagination = getPagination(firstResponse);
  const totalPages = Number(pagination.pages) || 1;

  for (let page = 2; page <= totalPages; page += 1) {
    const response = await api.get('/sales', { params: { page, limit: fetchLimit } });
    rows.push(...getSalesRows(response));
  }

  return rows;
}

function enrichSale(sale, productMap) {
  const product = productMap.get(Number(sale.product_id));
  const productName = sale.product_name || product?.product_name || 'Unknown Product';
  const category = sale.category || product?.category || 'Uncategorized';
  const state = titleCase(sale.state);
  const city = titleCase(sale.city);
  const categoryName = titleCase(category);
  const productDisplay = String(productName || '').trim() || 'Unknown Product';

  return {
    ...sale,
    sale_id: Number(sale.sale_id),
    product_id: Number(sale.product_id),
    product_name: productDisplay,
    product_key: normalize(productDisplay),
    category: categoryName,
    category_key: normalize(categoryName),
    customer_name: String(sale.customer_name || '').trim() || 'Unknown Customer',
    quantity: Number(sale.quantity) || 0,
    unit_price: Number(sale.unit_price) || 0,
    total_sales: Number(sale.total_sales) || 0,
    state,
    state_key: normalize(state),
    city,
    city_key: normalize(city),
    sale_date: sale.sale_date || '',
  };
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((first, second) => first.localeCompare(second));
}

function filterSales(rows, filters) {
  const searchTerm = normalize(filters.search);

  return rows.filter((sale) => {
    const searchableText = normalize(
      [
        sale.sale_id,
        sale.customer_name,
        sale.product_name,
        sale.category,
        sale.state,
        sale.city,
        sale.sale_date,
      ].join(' ')
    );

    return (
      (!searchTerm || searchableText.includes(searchTerm)) &&
      (!filters.state || sale.state_key === normalize(filters.state)) &&
      (!filters.city || sale.city_key === normalize(filters.city)) &&
      (!filters.category || sale.category_key === normalize(filters.category)) &&
      (!filters.product_id || String(sale.product_id) === String(filters.product_id)) &&
      (!filters.start_date || sale.sale_date >= filters.start_date) &&
      (!filters.end_date || sale.sale_date <= filters.end_date)
    );
  });
}

function SalesRecords() {
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadRecords() {
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
          setError('Sales records could not be loaded. Please check that the Flask backend is running on http://127.0.0.1:5000.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadRecords();

    return () => {
      isMounted = false;
    };
  }, []);

  async function refreshRecords() {
    try {
      setIsLoading(true);
      setError('');

      const [salesRows, productResponse] = await Promise.all([fetchAllSales(), api.get('/products')]);

      setSales(salesRows);
      setProducts(getProducts(productResponse));
    } catch (refreshError) {
      setError('Sales records could not be loaded. Please check that the Flask backend is running on http://127.0.0.1:5000.');
    } finally {
      setIsLoading(false);
    }
  }

  const enrichedSales = useMemo(() => {
    const productMap = new Map(products.map((product) => [Number(product.product_id), product]));
    return sales.map((sale) => enrichSale(sale, productMap));
  }, [sales, products]);

  const filterOptions = useMemo(() => {
    const stateFilteredRows = enrichedSales.filter((sale) => !draftFilters.state || sale.state_key === normalize(draftFilters.state));
    const categoryFilteredProducts = products.filter((product) => !draftFilters.category || normalize(product.category) === normalize(draftFilters.category));

    return {
      states: uniqueSorted(enrichedSales.map((sale) => sale.state)),
      cities: uniqueSorted(stateFilteredRows.map((sale) => sale.city)),
      categories: uniqueSorted([
        ...products.map((product) => titleCase(product.category)),
        ...enrichedSales.map((sale) => sale.category),
      ]),
      products: categoryFilteredProducts.length > 0 ? categoryFilteredProducts : products,
    };
  }, [draftFilters.category, draftFilters.state, enrichedSales, products]);

  const filteredSales = useMemo(() => filterSales(enrichedSales, appliedFilters), [appliedFilters, enrichedSales]);
  const limit = Number(appliedFilters.limit) || 10;
  const totalPages = Math.max(1, Math.ceil(filteredSales.length / limit));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * limit;
  const pagedRows = filteredSales.slice(startIndex, startIndex + limit);

  const kpis = useMemo(() => {
    const revenueShown = filteredSales.reduce((sum, sale) => sum + sale.total_sales, 0);
    const latestSaleDate = filteredSales.reduce((latest, sale) => (sale.sale_date > latest ? sale.sale_date : latest), '');

    return {
      recordsShown: filteredSales.length,
      revenueShown,
      averageOrderValue: filteredSales.length ? revenueShown / filteredSales.length : 0,
      latestSaleDate: latestSaleDate || 'No records',
    };
  }, [filteredSales]);

  function updateDraftFilter(field, value) {
    setDraftFilters((currentFilters) => {
      const nextFilters = {
        ...currentFilters,
        [field]: value,
      };

      if (field === 'state') {
        nextFilters.city = '';
      }

      if (field === 'category') {
        nextFilters.product_id = '';
      }

      return nextFilters;
    });
  }

  async function applyFilters(event) {
    event.preventDefault();
    setAppliedFilters(draftFilters);
    setCurrentPage(1);
    await refreshRecords();
  }

  async function clearFilters() {
    setDraftFilters(initialFilters);
    setAppliedFilters(initialFilters);
    setCurrentPage(1);
    await refreshRecords();
  }

  function changeLimit(value) {
    setDraftFilters((currentFilters) => ({ ...currentFilters, limit: value }));
    setAppliedFilters((currentFilters) => ({ ...currentFilters, limit: value }));
    setCurrentPage(1);
  }

  return (
    <section className="page-shell">
      <div>
        <p className="page-eyebrow">Sales Records</p>
        <h3 className="page-title">Sales Records</h3>
        <p className="page-description">
          Browse, search, filter, and verify sales transactions stored in the MySQL database.
        </p>
        <p className="mt-3 text-base font-semibold text-slate-500">
          Use this page to confirm that sales entered from the Sales Entry form are stored and available for reporting.
        </p>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard title="Records Shown" value={formatNumber(kpis.recordsShown)} detail="Records after active filters" icon={Database} accent="text-sky-600" />
            <KpiCard title="Revenue Shown" value={formatInr(kpis.revenueShown)} detail="Sum of total_sales" icon={CircleDollarSign} accent="text-emerald-600" />
            <KpiCard title="Average Order Value" value={formatInr(kpis.averageOrderValue)} detail="Revenue divided by records" icon={TrendingUp} accent="text-indigo-600" />
            <KpiCard title="Latest Sale Date" value={kpis.latestSaleDate} detail="Latest date in result set" icon={ShoppingBag} accent="text-amber-600" />
          </div>

          <FilterBar
            filters={draftFilters}
            filterOptions={filterOptions}
            onChange={updateDraftFilter}
            onApply={applyFilters}
            onClear={clearFilters}
            onLimitChange={changeLimit}
          />

          <SalesTable
            rows={pagedRows}
            currentPage={safeCurrentPage}
            totalPages={totalPages}
            totalRecords={filteredSales.length}
            startIndex={startIndex}
            limit={limit}
            onPrevious={() => setCurrentPage((page) => Math.max(1, page - 1))}
            onNext={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            onLimitChange={changeLimit}
          />

          <HowToUseCard />
        </>
      )}
    </section>
  );
}

function LoadingState() {
  return (
    <article className="placeholder-card flex min-h-[380px] items-center justify-center">
      <div className="text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-sky-600" />
        <p className="mt-4 text-xl font-bold text-slate-950">Loading live sales records</p>
        <p className="mt-2 text-base text-slate-500">Fetching MySQL-backed sales transactions from the Flask API.</p>
      </div>
    </article>
  );
}

function ErrorState({ message }) {
  return (
    <article className="placeholder-card border-rose-200 bg-rose-50">
      <div className="flex items-start gap-3 text-rose-800">
        <AlertCircle className="mt-1 h-6 w-6" />
        <div>
          <h4 className="text-2xl font-bold">Backend unavailable</h4>
          <p className="mt-2 text-base font-semibold">{message}</p>
        </div>
      </div>
    </article>
  );
}

function KpiCard({ title, value, detail, icon: Icon, accent }) {
  return (
    <article className="placeholder-card min-h-[190px]">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-50">
        <Icon className={`h-6 w-6 ${accent}`} />
      </div>
      <h4 className="mt-5 text-lg font-bold text-slate-700">{title}</h4>
      <p className="mt-4 text-3xl font-bold tracking-normal text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{detail}</p>
    </article>
  );
}

function FilterBar({ filters, filterOptions, onChange, onApply, onClear, onLimitChange }) {
  return (
    <form onSubmit={onApply} className="placeholder-card">
      <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-slate-400">Search And Filters</p>
          <h4 className="mt-1 text-2xl font-bold text-slate-950">Find and verify transactions</h4>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-base font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-700"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Apply Filters
          </button>
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-base font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:text-sky-700"
          >
            <RefreshCcw className="h-4 w-4" />
            Clear Filters
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-[1.7fr_1fr_1fr_1fr_1.2fr_1fr_1fr_0.8fr]">
        <label className="block">
          <span className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">Search</span>
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-3.5 shadow-sm transition focus-within:border-sky-400 focus-within:ring-4 focus-within:ring-sky-100">
            <Search className="h-5 w-5 text-slate-400" />
            <input
              type="search"
              value={filters.search}
              onChange={(event) => onChange('search', event.target.value)}
              placeholder="Search customer, product, category, state, city, or sale ID"
              className="w-full bg-transparent text-base font-semibold text-slate-800 outline-none placeholder:text-slate-400"
            />
          </div>
        </label>

        <FilterSelect label="State" value={filters.state} options={filterOptions.states} onChange={(value) => onChange('state', value)} />
        <FilterSelect label="City" value={filters.city} options={filterOptions.cities} onChange={(value) => onChange('city', value)} />
        <FilterSelect label="Category" value={filters.category} options={filterOptions.categories} onChange={(value) => onChange('category', value)} />
        <FilterSelect
          label="Product"
          value={filters.product_id}
          options={filterOptions.products.map((product) => ({ label: product.product_name, value: String(product.product_id) }))}
          onChange={(value) => onChange('product_id', value)}
        />
        <FilterInput label="Start Date" type="date" value={filters.start_date} onChange={(value) => onChange('start_date', value)} />
        <FilterInput label="End Date" type="date" value={filters.end_date} onChange={(value) => onChange('end_date', value)} />
        <FilterSelect
          label="Limit"
          value={filters.limit}
          options={[
            { label: '10', value: '10' },
            { label: '25', value: '25' },
            { label: '50', value: '50' },
          ]}
          onChange={onLimitChange}
          includeAll={false}
        />
      </div>
    </form>
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

function FilterSelect({ label, value, options, onChange, includeAll = true }) {
  const normalizedOptions = options.map((option) =>
    typeof option === 'string' ? { label: option, value: option } : option
  );

  return (
    <label className="block">
      <span className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-3.5 text-base font-semibold text-slate-800 shadow-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
      >
        {includeAll && <option value="">All</option>}
        {normalizedOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SalesTable({ rows, currentPage, totalPages, totalRecords, startIndex, limit, onPrevious, onNext, onLimitChange }) {
  const firstVisible = totalRecords === 0 ? 0 : startIndex + 1;
  const lastVisible = Math.min(startIndex + limit, totalRecords);

  return (
    <article className="placeholder-card overflow-hidden p-0">
      <div className="flex flex-col gap-4 border-b border-slate-200 px-7 py-6 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-slate-400">Live Sales Table</p>
          <h4 className="mt-1 text-2xl font-bold text-slate-950">MySQL transaction records</h4>
          <p className="mt-2 text-base font-semibold text-slate-500">
            Showing {formatNumber(firstVisible)}-{formatNumber(lastVisible)} of {formatNumber(totalRecords)} filtered records.
          </p>
        </div>
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          limit={String(limit)}
          onPrevious={onPrevious}
          onNext={onNext}
          onLimitChange={onLimitChange}
        />
      </div>

      {rows.length === 0 ? (
        <div className="px-7 py-14 text-center">
          <Database className="mx-auto h-10 w-10 text-slate-300" />
          <h5 className="mt-4 text-2xl font-bold text-slate-950">No sales records found for the selected filters.</h5>
          <p className="mt-2 text-base font-semibold text-slate-500">Try clearing filters or broadening your search terms.</p>
        </div>
      ) : (
        <div className="max-h-[720px] overflow-auto">
          <table className="w-full min-w-[1180px] text-left">
            <thead className="sticky top-0 z-10 bg-slate-50 text-sm font-bold uppercase tracking-[0.1em] text-slate-500 shadow-sm">
              <tr>
                <th className="px-6 py-4">Sale ID</th>
                <th className="px-6 py-4">Customer Name</th>
                <th className="px-6 py-4">Product Name</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Qty</th>
                <th className="px-6 py-4">Unit Price</th>
                <th className="px-6 py-4">Total Sales</th>
                <th className="px-6 py-4">State</th>
                <th className="px-6 py-4">City</th>
                <th className="px-6 py-4">Sale Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-base">
              {rows.map((sale) => (
                <tr key={sale.sale_id} className="transition hover:bg-slate-50">
                  <td className="px-6 py-5 font-bold text-slate-900">#{sale.sale_id}</td>
                  <td className="px-6 py-5 font-bold text-slate-800">{sale.customer_name}</td>
                  <td className="px-6 py-5 font-semibold text-slate-700">{sale.product_name}</td>
                  <td className="px-6 py-5 font-semibold text-slate-600">{sale.category}</td>
                  <td className="px-6 py-5 font-semibold text-slate-600">{formatNumber(sale.quantity)}</td>
                  <td className="px-6 py-5 font-semibold text-slate-600">{formatInr(sale.unit_price)}</td>
                  <td className="px-6 py-5 font-bold text-emerald-700">{formatInr(sale.total_sales)}</td>
                  <td className="px-6 py-5 font-semibold text-slate-600">{sale.state}</td>
                  <td className="px-6 py-5 font-semibold text-slate-600">{sale.city}</td>
                  <td className="px-6 py-5 font-semibold text-slate-600">{sale.sale_date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-col gap-4 border-t border-slate-200 px-7 py-5 xl:flex-row xl:items-center xl:justify-between">
        <p className="text-base font-semibold text-slate-500">
          Page {formatNumber(currentPage)} of {formatNumber(totalPages)}
        </p>
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          limit={String(limit)}
          onPrevious={onPrevious}
          onNext={onNext}
          onLimitChange={onLimitChange}
        />
      </div>
    </article>
  );
}

function PaginationControls({ currentPage, totalPages, limit, onPrevious, onNext, onLimitChange }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={onPrevious}
        disabled={currentPage <= 1}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-sky-200 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ChevronLeft className="h-4 w-4" />
        Previous
      </button>
      <span className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-bold text-white">
        Page {formatNumber(currentPage)} / {formatNumber(totalPages)}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={currentPage >= totalPages}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-sky-200 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </button>
      <select
        value={limit}
        onChange={(event) => onLimitChange(event.target.value)}
        className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 shadow-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
      >
        <option value="10">10 rows</option>
        <option value="25">25 rows</option>
        <option value="50">50 rows</option>
      </select>
    </div>
  );
}

function HowToUseCard() {
  const points = [
    'Search for a customer or product to verify transactions.',
    'Use filters to inspect revenue by geography, category, or date.',
    'Use pagination to browse the MySQL-backed sales history.',
  ];

  return (
    <article className="placeholder-card">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
          <HelpCircle className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-slate-400">How To Use This Page</p>
          <h4 className="mt-2 text-2xl font-bold text-slate-950">Transaction review workflow</h4>
          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            {points.map((point) => (
              <div key={point} className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-base font-semibold text-slate-700">
                {point}
              </div>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

export default SalesRecords;
