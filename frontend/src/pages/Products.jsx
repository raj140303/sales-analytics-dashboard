import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  Boxes,
  CircleDollarSign,
  HelpCircle,
  Layers3,
  Loader2,
  MapPin,
  PackageCheck,
  RefreshCcw,
  Search,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api from '../api/api.js';

const initialFilters = {
  search: '',
  category: '',
  state: '',
  sortBy: 'name-asc',
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

function truncateLabel(value, maxLength = 24) {
  const text = String(value || 'Unknown');

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1)}...`;
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

async function fetchAllSales() {
  const limit = 10000;
  const firstResponse = await api.get('/sales', { params: { page: 1, limit } });
  const rows = [...getSalesRows(firstResponse)];
  const pagination = getPagination(firstResponse);
  const totalPages = Number(pagination.pages) || 1;

  for (let page = 2; page <= totalPages; page += 1) {
    const response = await api.get('/sales', { params: { page, limit } });
    rows.push(...getSalesRows(response));
  }

  return rows;
}

function enrichProduct(product, performanceMap) {
  const productId = Number(product.product_id);
  const productName = String(product.product_name || '').trim() || 'Unknown Product';
  const category = titleCase(product.category);
  const performance = performanceMap.get(productId) || {
    orderCount: 0,
    revenue: 0,
    quantity: 0,
  };

  return {
    product_id: productId,
    product_name: productName,
    product_key: normalize(productName),
    category,
    category_key: normalize(category),
    orderCount: performance.orderCount,
    revenue: performance.revenue,
    quantity: performance.quantity,
    averageSellingPrice: performance.quantity > 0 ? performance.revenue / performance.quantity : 0,
  };
}

function buildPerformanceMap(salesRows) {
  const performanceMap = new Map();

  salesRows.forEach((sale) => {
    const productId = Number(sale.product_id);

    if (!productId) {
      return;
    }

    const current = performanceMap.get(productId) || {
      orderCount: 0,
      revenue: 0,
      quantity: 0,
    };

    current.orderCount += 1;
    current.revenue += Number(sale.total_sales ?? sale.revenue) || 0;
    current.quantity += Number(sale.quantity) || 0;
    performanceMap.set(productId, current);
  });

  return performanceMap;
}

function buildProductStatePerformanceMap(salesRows, state) {
  const filteredRows = state
    ? salesRows.filter((sale) => sale.state_key === normalize(state))
    : salesRows;

  return buildPerformanceMap(filteredRows);
}

function enrichSale(sale, productMap) {
  const product = productMap.get(Number(sale.product_id));
  const productName = sale.product_name || product?.product_name || 'Unknown Product';
  const category = sale.category || product?.category || 'Uncategorized';

  return {
    product_id: Number(sale.product_id),
    product_name: String(productName || '').trim() || 'Unknown Product',
    category: titleCase(category),
    category_key: normalize(category),
    state: titleCase(sale.state),
    state_key: normalize(sale.state),
    city: titleCase(sale.city),
    revenue: Number(sale.total_sales) || 0,
    quantity: Number(sale.quantity) || 0,
  };
}

function buildCategoryDistribution(products) {
  const groups = new Map();

  products.forEach((product) => {
    const category = product.category || 'Uncategorized';
    const current = groups.get(category) || {
      category,
      label: truncateLabel(category, 18),
      count: 0,
    };

    current.count += 1;
    groups.set(category, current);
  });

  return [...groups.values()].sort((first, second) => second.count - first.count);
}

function buildCategoryRevenue(salesRows) {
  const groups = new Map();

  salesRows.forEach((sale) => {
    const category = sale.category || 'Uncategorized';
    const current = groups.get(category) || {
      category,
      revenue: 0,
      orders: 0,
    };

    current.revenue += sale.revenue;
    current.orders += 1;
    groups.set(category, current);
  });

  return [...groups.values()].sort((first, second) => second.revenue - first.revenue);
}

function buildCategoryRevenueFromProducts(products) {
  const groups = new Map();

  products.forEach((product) => {
    const category = product.category || 'Uncategorized';
    const current = groups.get(category) || {
      category,
      revenue: 0,
      orders: 0,
    };

    current.revenue += product.revenue;
    current.orders += product.orderCount;
    groups.set(category, current);
  });

  return [...groups.values()].sort((first, second) => second.revenue - first.revenue);
}

function buildGeographyCategoryInsight(salesRows) {
  const stateGroups = new Map();

  salesRows.forEach((sale) => {
    const state = sale.state || 'Unknown';
    const category = sale.category || 'Uncategorized';
    const stateGroup = stateGroups.get(state) || {
      state,
      totalRevenue: 0,
      categories: new Map(),
    };
    const categoryGroup = stateGroup.categories.get(category) || {
      category,
      revenue: 0,
      orders: 0,
    };

    categoryGroup.revenue += sale.revenue;
    categoryGroup.orders += 1;
    stateGroup.totalRevenue += sale.revenue;
    stateGroup.categories.set(category, categoryGroup);
    stateGroups.set(state, stateGroup);
  });

  return [...stateGroups.values()]
    .map((stateGroup) => {
      const topCategory = [...stateGroup.categories.values()].sort((first, second) => second.revenue - first.revenue)[0];

      return {
        state: stateGroup.state,
        topCategory: topCategory?.category || 'No category',
        revenue: topCategory?.revenue || 0,
        orders: topCategory?.orders || 0,
        totalRevenue: stateGroup.totalRevenue,
        share: stateGroup.totalRevenue ? ((topCategory?.revenue || 0) / stateGroup.totalRevenue) * 100 : 0,
      };
    })
    .sort((first, second) => second.totalRevenue - first.totalRevenue);
}

function buildSelectedCategoryGeographyInsight(allSalesRows, filteredCategoryRows, selectedCategory) {
  const stateTotals = new Map();
  const categoryGroups = new Map();

  allSalesRows.forEach((sale) => {
    const state = sale.state || 'Unknown';
    const currentTotal = stateTotals.get(state) || 0;
    stateTotals.set(state, currentTotal + sale.revenue);
  });

  filteredCategoryRows.forEach((sale) => {
    const state = sale.state || 'Unknown';
    const current = categoryGroups.get(state) || {
      state,
      topCategory: selectedCategory,
      revenue: 0,
      orders: 0,
      totalRevenue: stateTotals.get(state) || 0,
      share: 0,
    };

    current.revenue += sale.revenue;
    current.orders += 1;
    current.totalRevenue = stateTotals.get(state) || current.totalRevenue;
    categoryGroups.set(state, current);
  });

  return [...categoryGroups.values()]
    .map((row) => ({
      ...row,
      share: row.totalRevenue ? (row.revenue / row.totalRevenue) * 100 : 0,
    }))
    .sort((first, second) => second.totalRevenue - first.totalRevenue);
}

function buildGeographySummary(rows) {
  const leadingCategoryCounts = new Map();

  rows.forEach((row) => {
    leadingCategoryCounts.set(row.topCategory, (leadingCategoryCounts.get(row.topCategory) || 0) + 1);
  });

  const mostCommonCategory = [...leadingCategoryCounts.entries()].sort((first, second) => second[1] - first[1])[0];
  const strongestPair = [...rows].sort((first, second) => second.revenue - first.revenue)[0];

  return {
    mostCommonCategory: mostCommonCategory?.[0] || 'No category',
    mostCommonCount: mostCommonCategory?.[1] || 0,
    strongestPair,
  };
}

function filterProductScope(products, filters) {
  const searchTerm = normalize(filters.search);

  return products.filter((product) => {
    const searchableText = normalize(`${product.product_name} ${product.category}`);

    return (
      (!searchTerm || searchableText.includes(searchTerm)) &&
      (!filters.category || product.category_key === normalize(filters.category))
    );
  });
}

function sortProducts(products, filters, hasSalesData) {
  return [...products].sort((first, second) => {
    if (filters.sortBy === 'name-desc') {
      return second.product_name.localeCompare(first.product_name);
    }

    if (filters.sortBy === 'category-asc') {
      return first.category.localeCompare(second.category) || first.product_name.localeCompare(second.product_name);
    }

    if (filters.sortBy === 'revenue-desc' && hasSalesData) {
      return second.revenue - first.revenue || first.product_name.localeCompare(second.product_name);
    }

    if (filters.sortBy === 'orders-desc' && hasSalesData) {
      return second.orderCount - first.orderCount || first.product_name.localeCompare(second.product_name);
    }

    return first.product_name.localeCompare(second.product_name);
  });
}

function getRegionalInsight(selectedOrders, compareOrders, compareRevenue, strongRevenueThreshold) {
  if (selectedOrders === 0 && compareOrders > 0 && compareRevenue >= strongRevenueThreshold) {
    return 'Strong regional signal';
  }

  if (selectedOrders === 0 && compareOrders > 0) {
    return 'Performs in compare state';
  }

  if (selectedOrders === 0 && compareOrders === 0) {
    return 'No sales in both states';
  }

  return 'Review regional pattern';
}

function Products() {
  const [products, setProducts] = useState([]);
  const [salesRows, setSalesRows] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [isLoading, setIsLoading] = useState(true);
  const [productError, setProductError] = useState('');
  const [salesError, setSalesError] = useState('');
  const [showWithoutSalesDetail, setShowWithoutSalesDetail] = useState(false);
  const [comparisonState, setComparisonState] = useState('');
  const withoutSalesDetailRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    async function loadProductsPageData() {
      try {
        setIsLoading(true);
        setProductError('');
        setSalesError('');

        const productResponse = await api.get('/products');

        if (isMounted) {
          setProducts(getProducts(productResponse));
        }

        try {
          const loadedSalesRows = await fetchAllSales();

          if (isMounted) {
            setSalesRows(loadedSalesRows);
          }
        } catch (salesLoadError) {
          if (isMounted) {
            setSalesRows([]);
            setSalesError('Sales-based product performance is unavailable because sales records could not be loaded.');
          }
        }
      } catch (loadError) {
        if (isMounted) {
          setProductError('Product catalog could not be loaded. Please check that the Flask backend is running on http://127.0.0.1:5000.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadProductsPageData();

    return () => {
      isMounted = false;
    };
  }, []);

  const hasSalesData = salesRows.length > 0;
  const productLookup = useMemo(() => new Map(products.map((product) => [Number(product.product_id), product])), [products]);
  const enrichedSales = useMemo(() => salesRows.map((sale) => enrichSale(sale, productLookup)), [productLookup, salesRows]);
  const stateFilteredSales = useMemo(
    () => enrichedSales.filter((sale) => !filters.state || sale.state_key === normalize(filters.state)),
    [enrichedSales, filters.state]
  );
  const performanceSales = useMemo(
    () => stateFilteredSales.filter((sale) => !filters.category || sale.category_key === normalize(filters.category)),
    [filters.category, stateFilteredSales]
  );
  const performanceMap = useMemo(() => buildPerformanceMap(performanceSales), [performanceSales]);
  const enrichedProducts = useMemo(
    () => products.map((product) => enrichProduct(product, performanceMap)),
    [performanceMap, products]
  );
  const hasProductScopeFilter = Boolean(normalize(filters.search) || filters.category);
  const scopedProducts = useMemo(
    () => filterProductScope(enrichedProducts, filters),
    [enrichedProducts, filters]
  );

  const categoryOptions = useMemo(
    () => [...new Set(enrichedProducts.map((product) => product.category).filter(Boolean))].sort((first, second) => first.localeCompare(second)),
    [enrichedProducts]
  );

  const stateOptions = useMemo(
    () => [...new Set(enrichedSales.map((sale) => sale.state).filter(Boolean))].sort((first, second) => first.localeCompare(second)),
    [enrichedSales]
  );

  const filteredProducts = useMemo(
    () => sortProducts(scopedProducts, filters, hasSalesData),
    [scopedProducts, filters, hasSalesData]
  );

  const categoryDistribution = useMemo(() => buildCategoryDistribution(scopedProducts), [scopedProducts]);

  const productPerformance = useMemo(() => {
    const productsWithRevenue = scopedProducts.filter((product) => product.revenue > 0 || product.orderCount > 0);

    return {
      topByRevenue: [...productsWithRevenue]
        .sort((first, second) => second.revenue - first.revenue)
        .slice(0, 10)
        .map((product) => ({ ...product, label: truncateLabel(product.product_name, 24) })),
    };
  }, [scopedProducts]);

  const categoryRevenue = useMemo(() => buildCategoryRevenueFromProducts(scopedProducts), [scopedProducts]);
  const geographyCategoryInsight = useMemo(() => {
    if (filters.category) {
      return buildSelectedCategoryGeographyInsight(stateFilteredSales, performanceSales, filters.category);
    }

    return buildGeographyCategoryInsight(stateFilteredSales);
  }, [filters.category, performanceSales, stateFilteredSales]);
  const geographySummary = useMemo(() => buildGeographySummary(geographyCategoryInsight), [geographyCategoryInsight]);
  const productCountDetail = hasProductScopeFilter ? 'Based on current product filters' : 'Count from product master';
  const salesMetricDetail = filters.state
    ? `Within selected scope in ${filters.state}`
    : hasProductScopeFilter
      ? 'Based on current product filters'
      : 'Across all states';

  const kpis = useMemo(() => {
    const topRevenueProduct = productPerformance.topByRevenue[0];
    const topRevenueCategory = categoryRevenue[0];

    return {
      totalProducts: scopedProducts.length,
      totalCategories: categoryDistribution.length,
      topRevenueProduct: topRevenueProduct ? topRevenueProduct.product_name : hasSalesData ? 'No sales yet' : 'Unavailable',
      topRevenueProductValue: topRevenueProduct ? formatInr(topRevenueProduct.revenue) : hasSalesData ? 'No revenue' : 'Sales unavailable',
      topRevenueCategory: topRevenueCategory ? topRevenueCategory.category : hasSalesData ? 'No sales yet' : 'Unavailable',
      topRevenueCategoryValue: topRevenueCategory ? formatInr(topRevenueCategory.revenue) : hasSalesData ? 'No revenue' : 'Sales unavailable',
      productsWithSales: scopedProducts.filter((product) => product.orderCount > 0).length,
      productsWithoutSales: scopedProducts.filter((product) => product.orderCount === 0).length,
    };
  }, [categoryDistribution.length, categoryRevenue, hasSalesData, productPerformance.topByRevenue, scopedProducts]);

  const productsWithoutSales = useMemo(
    () => sortProducts(scopedProducts.filter((product) => product.orderCount === 0), filters, hasSalesData),
    [scopedProducts, filters, hasSalesData]
  );

  const comparisonStateOptions = useMemo(
    () => stateOptions.filter((state) => state !== filters.state),
    [filters.state, stateOptions]
  );

  const regionalComparisonRows = useMemo(() => {
    const selectedStatePerformance = buildProductStatePerformanceMap(enrichedSales, filters.state);
    const compareStatePerformance = comparisonState
      ? buildProductStatePerformanceMap(enrichedSales, comparisonState)
      : new Map();

    const baseRows = productsWithoutSales.map((product) => {
      const selectedPerformance = filters.state
        ? selectedStatePerformance.get(product.product_id)
        : {
            orderCount: product.orderCount,
            revenue: product.revenue,
            quantity: product.quantity,
          };
      const comparePerformance = compareStatePerformance.get(product.product_id);

      return {
        ...product,
        selectedOrders: selectedPerformance?.orderCount || 0,
        selectedRevenue: selectedPerformance?.revenue || 0,
        compareOrders: comparePerformance?.orderCount || 0,
        compareRevenue: comparePerformance?.revenue || 0,
      };
    });

    const positiveCompareRevenues = baseRows
      .map((row) => row.compareRevenue)
      .filter((revenue) => revenue > 0);
    const averageCompareRevenue = positiveCompareRevenues.length
      ? positiveCompareRevenues.reduce((total, revenue) => total + revenue, 0) / positiveCompareRevenues.length
      : 0;

    return baseRows.map((row) => ({
      ...row,
      comparisonInsight: getRegionalInsight(
        row.selectedOrders,
        row.compareOrders,
        row.compareRevenue,
        averageCompareRevenue
      ),
    }));
  }, [comparisonState, enrichedSales, filters.state, productsWithoutSales]);

  useEffect(() => {
    if (showWithoutSalesDetail && productsWithoutSales.length === 0) {
      setShowWithoutSalesDetail(false);
      setComparisonState('');
    }
  }, [productsWithoutSales.length, showWithoutSalesDetail]);

  useEffect(() => {
    if (comparisonState && comparisonState === filters.state) {
      setComparisonState('');
    }
  }, [comparisonState, filters.state]);

  useEffect(() => {
    if (!showWithoutSalesDetail) {
      setComparisonState('');
      return;
    }

    window.setTimeout(() => {
      withoutSalesDetailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }, [showWithoutSalesDetail]);

  function updateFilter(field, value) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [field]: value,
    }));
  }

  function clearFilters() {
    setFilters(initialFilters);
  }

  function openWithoutSalesDetail() {
    if (productsWithoutSales.length === 0) {
      return;
    }

    setShowWithoutSalesDetail(true);
  }

  function closeWithoutSalesDetail() {
    setShowWithoutSalesDetail(false);
    setComparisonState('');
  }

  if (isLoading) {
    return (
      <section className="page-shell">
        <ProductsHeader />
        <article className="placeholder-card flex min-h-[380px] items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-sky-600" />
            <p className="mt-4 text-xl font-bold text-slate-950">Loading live product catalog</p>
            <p className="mt-2 text-base text-slate-500">Fetching product master data and sales performance from the Flask API.</p>
          </div>
        </article>
      </section>
    );
  }

  if (productError) {
    return (
      <section className="page-shell">
        <ProductsHeader />
        <article className="placeholder-card border-rose-200 bg-rose-50">
          <div className="flex items-start gap-3 text-rose-800">
            <AlertCircle className="mt-1 h-6 w-6" />
            <div>
              <h4 className="text-2xl font-bold">Product catalog unavailable</h4>
              <p className="mt-2 text-base font-semibold">{productError}</p>
            </div>
          </div>
        </article>
      </section>
    );
  }

  return (
    <section className="page-shell">
      <ProductsHeader />

      {salesError && (
        <article className="placeholder-card border-amber-200 bg-amber-50">
          <div className="flex items-start gap-3 text-amber-800">
            <AlertCircle className="mt-1 h-6 w-6" />
            <p className="text-base font-semibold">{salesError}</p>
          </div>
        </article>
      )}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard title={hasProductScopeFilter ? 'Filtered Products' : 'Total Products'} value={formatNumber(kpis.totalProducts)} detail={productCountDetail} icon={Boxes} accent="text-sky-600" />
        <KpiCard title="Total Categories" value={formatNumber(kpis.totalCategories)} detail={hasProductScopeFilter ? 'Categories in selected product scope' : 'Unique product categories'} icon={Layers3} accent="text-emerald-600" />
        <KpiCard title="Top Revenue Product" value={kpis.topRevenueProduct} detail={kpis.topRevenueProductValue} icon={PackageCheck} accent="text-indigo-600" />
        <KpiCard title="Top Category by Revenue" value={kpis.topRevenueCategory} detail={kpis.topRevenueCategoryValue} icon={CircleDollarSign} accent="text-amber-600" />
      </div>

      {hasSalesData && (
        <div className="grid gap-4 md:grid-cols-2">
          <SupportingMetric title="Products With Sales" value={formatNumber(kpis.productsWithSales)} detail={salesMetricDetail} />
          <SupportingMetric
            title="Products Without Sales"
            value={formatNumber(kpis.productsWithoutSales)}
            detail={salesMetricDetail}
            onClick={openWithoutSalesDetail}
            isClickable={productsWithoutSales.length > 0}
          />
        </div>
      )}

      <FilterBar
        filters={filters}
        categoryOptions={categoryOptions}
        stateOptions={stateOptions}
        hasSalesData={hasSalesData}
        onChange={updateFilter}
        onClear={clearFilters}
      />

      <section className="grid gap-5 2xl:grid-cols-2">
        <RevenueChartCard hasSalesData={hasSalesData} productPerformance={productPerformance} />
        <ChartCard title="Category Distribution" subtitle="Business question: Which categories dominate the current product scope?">
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={categoryDistribution} margin={{ top: 8, right: 18, left: 0, bottom: 36 }} barCategoryGap="18%">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 13, fontWeight: 700 }} angle={-16} textAnchor="end" height={64} interval={0} />
              <YAxis tick={{ fill: '#475569', fontSize: 13, fontWeight: 700 }} width={42} label={{ value: 'Product Count', angle: -90, position: 'insideLeft', fill: '#475569', fontSize: 13, fontWeight: 700 }} />
              <Tooltip content={<CategoryTooltip />} />
              <Bar dataKey="count" name="Products" fill="#0284c7" radius={[8, 8, 0, 0]} maxBarSize={54} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <GeographyCategoryInsight
        rows={geographyCategoryInsight}
        summary={geographySummary}
        hasSalesData={hasSalesData}
        selectedState={filters.state}
        selectedCategory={filters.category}
      />

      <ProductCatalogTable products={filteredProducts} hasSalesData={hasSalesData} />

      {showWithoutSalesDetail && productsWithoutSales.length > 0 && (
        <ProductsWithoutSalesDetail
          ref={withoutSalesDetailRef}
          products={productsWithoutSales}
          rows={regionalComparisonRows}
          selectedState={filters.state}
          comparisonState={comparisonState}
          comparisonStateOptions={comparisonStateOptions}
          onComparisonStateChange={setComparisonState}
          onClose={closeWithoutSalesDetail}
        />
      )}

      <CatalogUsageCard />
    </section>
  );
}

function ProductsHeader() {
  return (
    <div>
      <p className="page-eyebrow">Products</p>
      <h3 className="page-title">Product Catalog</h3>
      <p className="page-description">
        Browse product master data, category mix, and product-level performance from MySQL-backed sales records.
      </p>
      <p className="mt-3 text-base font-semibold text-slate-500">
        Products listed here power Sales Entry, Sales Records, Dashboard filters, and Power BI reporting.
      </p>
    </div>
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

function SupportingMetric({ title, value, detail, onClick, isClickable = false }) {
  const className = `rounded-lg border border-slate-200 bg-white px-5 py-4 text-left shadow-sm transition ${
    isClickable ? 'cursor-pointer hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-premium' : ''
  }`;
  const content = (
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-slate-400">{title}</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
        </div>
        <p className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{detail}</p>
      </div>
  );

  if (isClickable) {
    return (
      <button type="button" onClick={onClick} onPointerDown={onClick} className={className}>
        {content}
      </button>
    );
  }

  return (
    <article className={className}>
      {content}
    </article>
  );
}

function FilterBar({ filters, categoryOptions, stateOptions, hasSalesData, onChange, onClear }) {
  const sortOptions = [
    { label: 'Product Name A-Z', value: 'name-asc' },
    { label: 'Product Name Z-A', value: 'name-desc' },
    { label: 'Category A-Z', value: 'category-asc' },
  ];

  if (hasSalesData) {
    sortOptions.push(
      { label: 'Revenue High-Low', value: 'revenue-desc' },
      { label: 'Orders High-Low', value: 'orders-desc' }
    );
  }

  return (
    <article className="placeholder-card">
      <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-slate-400">Catalog Search</p>
          <h4 className="mt-1 text-2xl font-bold text-slate-950">Find and sort product master data</h4>
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

      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-[1.4fr_0.8fr_0.8fr_0.9fr]">
        <label className="block">
          <span className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">Search</span>
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-3.5 shadow-sm transition focus-within:border-sky-400 focus-within:ring-4 focus-within:ring-sky-100">
            <Search className="h-5 w-5 text-slate-400" />
            <input
              type="search"
              value={filters.search}
              onChange={(event) => onChange('search', event.target.value)}
              placeholder="Search product name or category"
              className="w-full bg-transparent text-base font-semibold text-slate-800 outline-none placeholder:text-slate-400"
            />
          </div>
        </label>

        <FilterSelect label="Category" value={filters.category} options={categoryOptions} onChange={(value) => onChange('category', value)} />
        <FilterSelect label="State" value={filters.state} options={stateOptions} onChange={(value) => onChange('state', value)} />
        <FilterSelect label="Sort" value={filters.sortBy} options={sortOptions} onChange={(value) => onChange('sortBy', value)} includeAll={false} />
      </div>
    </article>
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

function ChartCard({ title, subtitle, children }) {
  return (
    <article className="placeholder-card p-6">
      <div className="mb-4">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-slate-400">Live Insight</p>
        <h4 className="mt-2 text-2xl font-bold text-slate-950">{title}</h4>
        <p className="mt-2 text-base font-semibold text-slate-500">{subtitle}</p>
      </div>
      {children}
    </article>
  );
}

function RevenueChartCard({ hasSalesData, productPerformance }) {
  if (!hasSalesData) {
    return (
      <article className="placeholder-card flex min-h-[430px] items-center justify-center border-amber-200 bg-amber-50">
        <div className="text-center">
          <BarChart3 className="mx-auto h-10 w-10 text-amber-600" />
          <h4 className="mt-4 text-2xl font-bold text-amber-950">Product performance will appear when sales records are available.</h4>
          <p className="mt-2 text-base font-semibold text-amber-800">The product catalog is still available from product master data.</p>
        </div>
      </article>
    );
  }

  return (
    <ChartCard title="Top 10 Products by Revenue" subtitle="Business question: Which products generate the most revenue?">
      <ResponsiveContainer width="100%" height={360}>
        <BarChart data={productPerformance.topByRevenue} layout="vertical" margin={{ top: 8, right: 24, left: 0, bottom: 30 }} barCategoryGap="16%">
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis type="number" tickFormatter={shortInr} tick={{ fill: '#475569', fontSize: 13, fontWeight: 700 }} tickMargin={8} label={{ value: 'Revenue INR', position: 'insideBottom', offset: -24, fill: '#475569', fontSize: 13, fontWeight: 700 }} />
          <YAxis dataKey="label" type="category" width={142} tick={{ fill: '#475569', fontSize: 13, fontWeight: 700 }} />
          <Tooltip content={<ProductTooltip mode="revenue" />} />
          <Bar dataKey="revenue" fill="#6366f1" radius={[0, 8, 8, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function ProductCatalogTable({ products, hasSalesData }) {
  return (
    <article className="placeholder-card overflow-hidden p-0">
      <div className="border-b border-slate-200 px-7 py-6">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-slate-400">Product Catalog Table</p>
        <h4 className="mt-1 text-2xl font-bold text-slate-950">Live product master list</h4>
        <p className="mt-2 text-base font-semibold text-slate-500">
          Showing {formatNumber(products.length)} products after search and filter settings.
        </p>
      </div>

      {products.length === 0 ? (
        <div className="px-7 py-14 text-center">
          <Boxes className="mx-auto h-10 w-10 text-slate-300" />
          <h5 className="mt-4 text-2xl font-bold text-slate-950">No products match the selected filters.</h5>
          <p className="mt-2 text-base font-semibold text-slate-500">Try clearing filters or using a broader search term.</p>
        </div>
      ) : (
        <div className="max-h-[720px] overflow-auto">
          <table className="w-full min-w-[920px] text-left">
            <thead className="sticky top-0 z-10 bg-slate-50 text-sm font-bold uppercase tracking-[0.1em] text-slate-500 shadow-sm">
              <tr>
                <th className="px-6 py-4">Product ID</th>
                <th className="px-6 py-4">Product Name</th>
                <th className="px-6 py-4">Category</th>
                {hasSalesData && <th className="px-6 py-4">Order Count</th>}
                {hasSalesData && <th className="px-6 py-4">Revenue Generated</th>}
                {hasSalesData && <th className="px-6 py-4">Average Selling Price</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-base">
              {products.map((product) => (
                <tr key={product.product_id} className="transition hover:bg-slate-50">
                  <td className="px-6 py-5 font-bold text-slate-900">#{product.product_id}</td>
                  <td className="px-6 py-5 font-bold text-slate-800">{product.product_name}</td>
                  <td className="px-6 py-5 font-semibold text-slate-600">{product.category}</td>
                  {hasSalesData && <td className="px-6 py-5 font-semibold text-slate-600">{formatNumber(product.orderCount)}</td>}
                  {hasSalesData && <td className="px-6 py-5 font-bold text-emerald-700">{formatInr(product.revenue)}</td>}
                  {hasSalesData && <td className="px-6 py-5 font-semibold text-slate-600">{product.quantity > 0 ? formatInr(product.averageSellingPrice) : 'No sales yet'}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}

const ProductsWithoutSalesDetail = forwardRef(function ProductsWithoutSalesDetail(
  {
    products,
    rows,
    selectedState,
    comparisonState,
    comparisonStateOptions,
    onComparisonStateChange,
    onClose,
  },
  ref
) {
  const hasComparison = Boolean(comparisonState);
  const selectedStateLabel = selectedState || 'Selected Scope';
  const title = selectedState
    ? `Products Without Sales in ${selectedState}`
    : 'Products Without Sales in Current Scope';

  return (
    <article ref={ref} className="placeholder-card overflow-hidden p-0">
      <div className="flex flex-col gap-5 border-b border-slate-200 px-7 py-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-slate-400">Product Detail</p>
          <h4 className="mt-1 text-2xl font-bold text-slate-950">{title}</h4>
          <p className="mt-2 text-base font-semibold text-slate-500">
            Showing {formatNumber(products.length)} product{products.length === 1 ? '' : 's'} with no sales in the selected scope.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block min-w-[260px]">
            <span className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">Compare with state</span>
            <select
              value={comparisonState}
              onChange={(event) => onComparisonStateChange(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-3.5 text-base font-semibold text-slate-800 shadow-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
            >
              <option value="">Select comparison state</option>
              {comparisonStateOptions.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3.5 text-base font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-rose-200 hover:text-rose-700"
          >
            <X className="h-4 w-4" />
            Hide
          </button>
        </div>
      </div>

      {hasComparison && (
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-sky-50/60 px-7 py-4 text-sm font-bold text-slate-600 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 text-sky-800">
            <RefreshCcw className="h-4 w-4" />
            Comparing the same unsold product IDs against {comparisonState}
          </div>
          <span>Uses actual order and revenue values from sales records only.</span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left">
          <thead className="sticky top-0 z-10 bg-slate-50 text-sm font-bold uppercase tracking-[0.1em] text-slate-500 shadow-sm">
            {hasComparison ? (
              <tr>
                <th className="px-6 py-4">Product ID</th>
                <th className="px-6 py-4">Product Name</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">{selectedStateLabel} Orders</th>
                <th className="px-6 py-4">{selectedStateLabel} Revenue</th>
                <th className="px-6 py-4">{comparisonState} Orders</th>
                <th className="px-6 py-4">{comparisonState} Revenue</th>
                <th className="px-6 py-4">Comparison Insight</th>
              </tr>
            ) : (
              <tr>
                <th className="px-6 py-4">Product ID</th>
                <th className="px-6 py-4">Product Name</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Orders</th>
                <th className="px-6 py-4">Revenue Generated</th>
                <th className="px-6 py-4">Average Selling Price</th>
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-slate-100 text-base">
            {rows.map((row) => (
              <tr key={row.product_id} className="transition hover:bg-slate-50">
                <td className="px-6 py-5 font-bold text-slate-900">#{row.product_id}</td>
                <td className="px-6 py-5 font-bold text-slate-800">{row.product_name}</td>
                <td className="px-6 py-5 font-semibold text-slate-600">{row.category}</td>
                {hasComparison ? (
                  <>
                    <td className="px-6 py-5 font-semibold text-slate-600">{formatNumber(row.selectedOrders)}</td>
                    <td className="px-6 py-5 font-semibold text-slate-600">{formatInr(row.selectedRevenue)}</td>
                    <td className="px-6 py-5 font-semibold text-slate-600">{formatNumber(row.compareOrders)}</td>
                    <td className="px-6 py-5 font-bold text-emerald-700">{formatInr(row.compareRevenue)}</td>
                    <td className="px-6 py-5">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">
                        {row.comparisonInsight}
                      </span>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-6 py-5 font-semibold text-slate-600">{formatNumber(row.orderCount)}</td>
                    <td className="px-6 py-5 font-bold text-emerald-700">{formatInr(row.revenue)}</td>
                    <td className="px-6 py-5 font-semibold text-slate-600">
                      {row.quantity > 0 ? formatInr(row.averageSellingPrice) : 'No sales yet'}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
});

function GeographyCategoryInsight({ rows, summary, hasSalesData, selectedState, selectedCategory }) {
  if (!hasSalesData) {
    return null;
  }

  const topRows = rows.slice(0, 8);
  const totalCategoryRevenue = rows.reduce((total, row) => total + row.revenue, 0);
  const averageShare = rows.length ? rows.reduce((total, row) => total + row.share, 0) / rows.length : 0;
  const highestRevenueState = summary.strongestPair;
  const title = selectedCategory ? 'Selected Category Performance by Geography' : 'Category Performance by Geography';
  const subtitle = selectedCategory
    ? 'How does the selected category perform across states?'
    : 'Which category is strongest in each region?';
  const shareText = selectedCategory
    ? "Share shows how much of each state's total revenue comes from this category."
    : "Share shows how much of each state's total revenue comes from its top category.";

  return (
    <article className="placeholder-card min-h-[430px] overflow-hidden p-0">
      <div className="flex flex-col gap-4 border-b border-slate-200 px-7 py-6 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-slate-400">Live Insight</p>
          <h4 className="mt-1 text-2xl font-bold text-slate-950">{title}</h4>
          <p className="mt-2 text-base font-semibold text-slate-500">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-sky-50 px-4 py-3 text-sm font-bold text-sky-700">
          <MapPin className="h-4 w-4" />
          {selectedState || 'All states'}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="px-7 py-12 text-center">
          <MapPin className="mx-auto h-10 w-10 text-slate-300" />
          <h5 className="mt-4 text-2xl font-bold text-slate-950">No geography-category performance available.</h5>
          <p className="mt-2 text-base font-semibold text-slate-500">Choose a broader state filter or wait for more sales records.</p>
        </div>
      ) : (
        <div>
          <div className={`grid gap-3 border-b border-slate-100 px-7 py-4 ${selectedCategory ? 'md:grid-cols-2 xl:grid-cols-4' : 'md:grid-cols-3'}`}>
            {selectedCategory ? (
              <>
                <InsightPill label="Selected Category" value={selectedCategory} />
                <InsightPill
                  label="Highest Revenue State for this Category"
                  value={highestRevenueState ? `${highestRevenueState.state} (${formatInr(highestRevenueState.revenue)})` : 'No state'}
                />
                <InsightPill label="Total Revenue for Selected Category" value={formatInr(totalCategoryRevenue)} />
                <InsightPill label="Average Share Across States" value={`${averageShare.toFixed(1)}%`} />
              </>
            ) : (
              <>
                <InsightPill
                  label="Most common leading category"
                  value={`${summary.mostCommonCategory} leads in ${formatNumber(summary.mostCommonCount)} state${summary.mostCommonCount === 1 ? '' : 's'}`}
                />
                <InsightPill
                  label="Strongest state-category pair"
                  value={summary.strongestPair ? `${summary.strongestPair.state} + ${summary.strongestPair.topCategory}` : 'No pair'}
                />
                <InsightPill
                  label="Top pair revenue"
                  value={summary.strongestPair ? formatInr(summary.strongestPair.revenue) : formatInr(0)}
                />
              </>
            )}
          </div>

          <div className="px-7 py-4">
            <p className="text-sm font-bold text-slate-500">{shareText}</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left">
              <thead className="sticky top-0 z-10 bg-slate-50 text-sm font-bold uppercase tracking-[0.1em] text-slate-500 shadow-sm">
                <tr>
                  <th className="px-6 py-4">State</th>
                  <th className="px-6 py-4">{selectedCategory ? 'Selected Category' : 'Top Category'}</th>
                  <th className="px-6 py-4">Category Revenue</th>
                  <th className="px-6 py-4">Orders</th>
                  <th className="px-6 py-4">State Revenue</th>
                  <th className="px-6 py-4">Share %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-base">
                {topRows.map((row) => (
                  <tr key={row.state} className="transition hover:bg-slate-50">
                    <td className="px-6 py-5 font-bold text-slate-900">{row.state}</td>
                    <td className="px-6 py-5 font-semibold text-slate-700">{row.topCategory}</td>
                    <td className="px-6 py-5 font-bold text-emerald-700">{formatInr(row.revenue)}</td>
                    <td className="px-6 py-5 font-semibold text-slate-600">{formatNumber(row.orders)}</td>
                    <td className="px-6 py-5 font-semibold text-slate-600">{formatInr(row.totalRevenue)}</td>
                    <td className="px-6 py-5 font-semibold text-slate-600">{row.share.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </article>
  );
}

function InsightPill({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-bold text-slate-800">{value}</p>
    </div>
  );
}

function CatalogUsageCard() {
  const points = [
    'Products feed the Sales Entry dropdown.',
    'Product category powers Dashboard filters and grouping.',
    'Product master data supports Power BI slicers and reporting.',
  ];

  return (
    <article className="placeholder-card">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
          <HelpCircle className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-slate-400">Catalog Usage</p>
          <h4 className="mt-2 text-2xl font-bold text-slate-950">Where product master data is used</h4>
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

function CategoryTooltip({ active, payload }) {
  if (!active || !payload?.length) {
    return null;
  }

  const row = payload[0].payload;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm shadow-premium">
      <p className="font-bold text-slate-950">Category: {row.category}</p>
      <p className="mt-1 font-semibold text-sky-700">Products: {formatNumber(row.count)}</p>
    </div>
  );
}

function ProductTooltip({ active, payload, mode }) {
  if (!active || !payload?.length) {
    return null;
  }

  const row = payload[0].payload;

  return (
    <div className="max-w-[320px] rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm shadow-premium">
      <p className="font-bold text-slate-950">{row.product_name}</p>
      <p className="mt-1 font-semibold text-slate-600">Category: {row.category}</p>
      <p className="mt-1 font-semibold text-emerald-700">Revenue: {formatInr(row.revenue)}</p>
      <p className="mt-1 font-semibold text-slate-600">Orders: {formatNumber(row.orderCount)}</p>
      {mode === 'orders' && <p className="mt-1 font-semibold text-slate-600">Quantity Sold: {formatNumber(row.quantity)}</p>}
    </div>
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

export default Products;
