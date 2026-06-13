import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ClipboardPlus,
  IndianRupee,
  Loader2,
  MapPin,
  PackageSearch,
  Send,
  UserRound,
} from 'lucide-react';
import api from '../api/api.js';

const initialForm = {
  customer_name: '',
  product_id: '',
  quantity: '1',
  unit_price: '',
  state: '',
  city: '',
  sale_date: new Date().toISOString().slice(0, 10),
};

const formatInr = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);

function getProductsFromResponse(response) {
  if (Array.isArray(response.data?.data)) {
    return response.data.data;
  }

  if (Array.isArray(response.data)) {
    return response.data;
  }

  return [];
}

function toTitleCase(value) {
  return value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getSubmissionValues(form) {
  return {
    customer_name: form.customer_name.trim(),
    product_id: form.product_id,
    quantity: form.quantity,
    unit_price: form.unit_price,
    state: toTitleCase(form.state),
    city: toTitleCase(form.city),
    sale_date: form.sale_date.trim(),
  };
}

function SalesEntry() {
  const [form, setForm] = useState(initialForm);
  const [products, setProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitMessage, setSubmitMessage] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadProducts() {
      try {
        const response = await api.get('/products');
        const loadedProducts = getProductsFromResponse(response);

        if (isMounted) {
          setProducts(loadedProducts);
        }
      } catch (error) {
        if (isMounted) {
          setSubmitMessage({
            type: 'error',
            text: 'Product options could not be loaded. Please check the Flask API and try again.',
          });
        }
      } finally {
        if (isMounted) {
          setIsLoadingProducts(false);
        }
      }
    }

    loadProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedProduct = useMemo(
    () => products.find((product) => String(product.product_id) === String(form.product_id)),
    [form.product_id, products]
  );

  const normalizedPreview = useMemo(
    () => ({
      state: toTitleCase(form.state),
      city: toTitleCase(form.city),
    }),
    [form.state, form.city]
  );

  const quantity = Number(form.quantity);
  const unitPrice = Number(form.unit_price);
  const totalSales = (Number.isFinite(quantity) ? quantity : 0) * (Number.isFinite(unitPrice) ? unitPrice : 0);

  function updateField(field, value) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));

    setErrors((currentErrors) => ({
      ...currentErrors,
      [field]: '',
    }));

    setSubmitMessage(null);
  }

  function validateForm(values) {
    const nextErrors = {};

    if (!values.customer_name) {
      nextErrors.customer_name = 'Customer name is required.';
    }

    if (!values.product_id) {
      nextErrors.product_id = 'Select a product.';
    }

    if (!values.quantity || Number(values.quantity) <= 0) {
      nextErrors.quantity = 'Quantity must be greater than 0.';
    }

    if (values.unit_price === '' || Number(values.unit_price) < 0) {
      nextErrors.unit_price = 'Unit price must be 0 or more.';
    }

    if (!values.state) {
      nextErrors.state = 'State is required.';
    }

    if (!values.city) {
      nextErrors.city = 'City is required.';
    }

    if (!values.sale_date) {
      nextErrors.sale_date = 'Sale date is required.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitMessage(null);

    const values = getSubmissionValues(form);

    if (!validateForm(values)) {
      setSubmitMessage({
        type: 'error',
        text: 'Please fix the highlighted fields before saving the sale.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        customer_name: values.customer_name,
        product_id: Number(values.product_id),
        quantity: Number(values.quantity),
        unit_price: Number(values.unit_price),
        state: values.state,
        city: values.city,
        sale_date: values.sale_date,
      };

      await api.post('/sales', payload);

      setSubmitMessage({
        type: 'success',
        text: 'Sale created successfully and sent to the MySQL-backed Flask API.',
      });
      setForm(initialForm);
      setErrors({});
    } catch (error) {
      const apiMessage = error.response?.data?.message || 'Sale could not be created. Please check the API and try again.';

      setSubmitMessage({
        type: 'error',
        text: apiMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="page-shell">
      <div>
        <p className="page-eyebrow">Sales Entry</p>
        <h3 className="page-title">Create a sale record</h3>
        <p className="page-description">
          Capture a real transaction, calculate the live INR total, and save normalized city and state values through the existing Flask API.
        </p>
      </div>

      {submitMessage && (
        <div
          className={`flex items-start gap-3 rounded-lg border px-5 py-4 text-base font-semibold shadow-sm ${
            submitMessage.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}
        >
          {submitMessage.type === 'success' ? <CheckCircle2 className="mt-0.5 h-5 w-5" /> : <AlertCircle className="mt-0.5 h-5 w-5" />}
          <span>{submitMessage.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[1.55fr_0.9fr]">
        <div className="grid gap-5">
          <article className="placeholder-card">
            <SectionHeader icon={UserRound} title="Customer section" detail="Basic buyer information for the new sales row." />

            <div className="mt-6">
              <FormLabel htmlFor="customer_name">Customer Name</FormLabel>
              <input
                id="customer_name"
                type="text"
                value={form.customer_name}
                onChange={(event) => updateField('customer_name', event.target.value)}
                placeholder="Example: Test Meghalaya Customer"
                className={inputClass(errors.customer_name)}
              />
              <FieldError message={errors.customer_name} />
            </div>
          </article>

          <article className="placeholder-card">
            <SectionHeader icon={PackageSearch} title="Product section" detail="Products and categories are loaded directly from the backend product table." />

            <div className="mt-6 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
              <div>
                <FormLabel htmlFor="product_id">Product</FormLabel>
                <select
                  id="product_id"
                  value={form.product_id}
                  onChange={(event) => updateField('product_id', event.target.value)}
                  disabled={isLoadingProducts}
                  className={inputClass(errors.product_id, 'select')}
                >
                  <option value="">{isLoadingProducts ? 'Loading products...' : 'Select a product'}</option>
                  {products.map((product) => (
                    <option key={product.product_id} value={product.product_id}>
                      {product.product_name}
                    </option>
                  ))}
                </select>
                <FieldError message={errors.product_id} />
              </div>

              <div>
                <FormLabel htmlFor="category">Category</FormLabel>
                <input
                  id="category"
                  type="text"
                  value={selectedProduct?.category || ''}
                  readOnly
                  placeholder="Auto-filled from product"
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-base font-bold text-slate-700 outline-none"
                />
              </div>
            </div>
          </article>

          <article className="placeholder-card">
            <SectionHeader icon={ClipboardPlus} title="Transaction section" detail="Quantity, unit price, and sale date used for the POST request." />

            <div className="mt-6 grid gap-5 md:grid-cols-3">
              <div>
                <FormLabel htmlFor="quantity">Quantity</FormLabel>
                <input
                  id="quantity"
                  type="number"
                  min="1"
                  step="1"
                  value={form.quantity}
                  onChange={(event) => updateField('quantity', event.target.value)}
                  className={inputClass(errors.quantity)}
                />
                <FieldError message={errors.quantity} />
              </div>

              <div>
                <FormLabel htmlFor="unit_price">Unit Price</FormLabel>
                <input
                  id="unit_price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.unit_price}
                  onChange={(event) => updateField('unit_price', event.target.value)}
                  placeholder="79999"
                  className={inputClass(errors.unit_price)}
                />
                <FieldError message={errors.unit_price} />
              </div>

              <div>
                <FormLabel htmlFor="sale_date">Sale Date</FormLabel>
                <input
                  id="sale_date"
                  type="date"
                  value={form.sale_date}
                  onChange={(event) => updateField('sale_date', event.target.value)}
                  className={inputClass(errors.sale_date)}
                />
                <FieldError message={errors.sale_date} />
              </div>
            </div>
          </article>

          <article className="placeholder-card">
            <SectionHeader
              icon={MapPin}
              title="Geography section"
              detail="State and city are open text fields so new Indian locations can be entered without changing backend lookup data."
            />

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div>
                <FormLabel htmlFor="state">State</FormLabel>
                <input
                  id="state"
                  type="text"
                  value={form.state}
                  onChange={(event) => updateField('state', event.target.value)}
                  placeholder="Example: Meghalaya"
                  className={inputClass(errors.state)}
                />
                <FieldError message={errors.state} />
              </div>

              <div>
                <FormLabel htmlFor="city">City</FormLabel>
                <input
                  id="city"
                  type="text"
                  value={form.city}
                  onChange={(event) => updateField('city', event.target.value)}
                  placeholder="Example: Shillong"
                  className={inputClass(errors.city)}
                />
                <FieldError message={errors.city} />
              </div>
            </div>
          </article>
        </div>

        <aside className="grid content-start gap-5">
          <article className="placeholder-card">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <IndianRupee className="h-6 w-6" />
            </div>
            <h4 className="mt-5 text-2xl font-bold text-slate-950">Total sales preview</h4>
            <p className="metric-value">{formatInr(totalSales)}</p>
            <p className="mt-2 text-base leading-7 text-slate-600">Calculated live from quantity x unit price.</p>
          </article>

          <article className="placeholder-card">
            <h4 className="text-xl font-bold text-slate-950">Selected product summary</h4>
            <div className="mt-5 space-y-4">
              <SummaryRow label="Product" value={selectedProduct?.product_name || 'Not selected'} />
              <SummaryRow label="Product ID" value={selectedProduct?.product_id || '-'} />
              <SummaryRow label="Category" value={selectedProduct?.category || 'Auto-filled after selection'} />
            </div>
          </article>

          <article className="placeholder-card">
            <h4 className="text-xl font-bold text-slate-950">Selected location summary</h4>
            <div className="mt-5 space-y-4">
              <SummaryRow label="State" value={normalizedPreview.state || 'Not selected'} />
              <SummaryRow label="City" value={normalizedPreview.city || 'Not selected'} />
              <SummaryRow label="Date" value={form.sale_date || 'Not selected'} />
            </div>
          </article>

          <article className="placeholder-card bg-slate-950 text-white">
            <Send className="h-8 w-8 text-sky-300" />
            <h4 className="mt-5 text-2xl font-bold">Submit sale</h4>
            <p className="mt-2 text-base leading-7 text-slate-300">
              Sends the validated sale to POST /api/sales using normalized text values.
            </p>
            <button
              type="submit"
              disabled={isSubmitting || isLoadingProducts}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 text-base font-bold text-slate-950 shadow-lg transition hover:-translate-y-0.5 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              {isSubmitting ? 'Saving Sale...' : isLoadingProducts ? 'Loading Products...' : 'Save Sale'}
            </button>
          </article>
        </aside>
      </form>
    </section>
  );
}

function SectionHeader({ icon: Icon, title, detail }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-sky-50 p-3 text-sky-700">
        <Icon className="h-7 w-7" />
      </div>
      <div>
        <h4 className="text-2xl font-bold text-slate-950">{title}</h4>
        <p className="mt-2 text-base leading-7 text-slate-600">{detail}</p>
      </div>
    </div>
  );
}

function FormLabel({ htmlFor, children }) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-bold uppercase tracking-[0.14em] text-slate-500">
      {children}
    </label>
  );
}

function FieldError({ message }) {
  if (!message) {
    return null;
  }

  return <p className="mt-2 text-sm font-semibold text-rose-600">{message}</p>;
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
      <span className="text-sm font-bold uppercase tracking-[0.12em] text-slate-400">{label}</span>
      <span className="text-right text-base font-bold text-slate-800">{value}</span>
    </div>
  );
}

function inputClass(hasError, controlType = 'input') {
  return [
    'mt-2 w-full rounded-lg border bg-white px-4 py-3 text-base font-semibold text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400',
    controlType === 'select' ? 'cursor-pointer' : 'cursor-text',
    'focus:border-sky-400 focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500',
    hasError ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100' : 'border-slate-200',
  ].join(' ');
}

export default SalesEntry;
