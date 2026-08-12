const order = {
  items: [
    { name: 'Wireless Mouse', category: 'electronics', price: 0, quantity: 0 },
    { name: 'Coffee Mug', category: 'kitchen', price: 0, quantity: 0 }
  ],
  coupon: {
    type: 'percent',
    value: 10,
    minSubtotal: 0,
    categories: []
  },
  customer: {
    isMember: false,
    loyaltyPoints: 0
  }
};

const CATEGORIES = [
  'electronics',
  'kitchen',
  'books',
  'clothing',
  'home',
  'beauty'
];

const PRODUCTS_BY_CATEGORY = {
  electronics: ['Wireless Mouse', 'Keyboard', 'USB-C Cable', 'Headphones'],
  kitchen: ['Coffee Mug', 'Plate Set', 'Knife Set', 'Cutting Board'],
  books: ['Novel A', 'Novel B', 'Cookbook'],
  clothing: ['T-Shirt', 'Jeans', 'Socks'],
  home: ['Cushion', 'Lamp', 'Blanket'],
  beauty: ['Lipstick', 'Moisturizer']
};

const DEFAULT_PRODUCTS = JSON.parse(JSON.stringify(PRODUCTS_BY_CATEGORY));

const PRICE_PRESETS = [0, 5, 10, 15, 20, 25, 50, 100];
const RECENT_PRICES = [];

const elements = {
  itemsTableBody: document.querySelector('#items-table tbody'),
  addItem: document.querySelector('#add-item'),
  couponType: document.querySelector('#coupon-type'),
  couponValue: document.querySelector('#coupon-value'),
  couponValueError: document.querySelector('#coupon-value-error'),
  couponMinSubtotal: document.querySelector('#coupon-min-subtotal'),
  couponMinSubtotalError: document.querySelector('#coupon-min-subtotal-error'),
  couponCategories: document.querySelector('#coupon-categories'),
  couponCategoriesError: document.querySelector('#coupon-categories-error'),
  isMember: document.querySelector('#is-member'),
  loyaltyPoints: document.querySelector('#loyalty-points'),
  loyaltyPointsError: document.querySelector('#loyalty-points-error'),
  globalErrors: document.querySelector('#global-errors'),
  summarySubtotal: document.querySelector('#summary-subtotal'),
  summaryCoupon: document.querySelector('#summary-coupon'),
  summaryMember: document.querySelector('#summary-member'),
  summaryTax: document.querySelector('#summary-tax'),
  summaryLoyalty: document.querySelector('#summary-loyalty'),
  summaryTotal: document.querySelector('#summary-total')
  ,clearRecentPrices: document.querySelector('#clear-recent-prices')
  ,clearCustomProducts: document.querySelector('#clear-custom-products')
  ,confirmModal: document.querySelector('#confirm-modal')
  ,confirmModalMessage: document.querySelector('#confirm-modal-message')
  ,confirmModalConfirm: document.querySelector('#confirm-modal-confirm')
  ,confirmModalCancel: document.querySelector('#confirm-modal-cancel')
};

function loadProducts() {
  try {
    const raw = localStorage.getItem('products_by_category');
    if (!raw) return;
    const stored = JSON.parse(raw);
    Object.keys(stored).forEach((k) => {
      if (!Array.isArray(stored[k])) return;
      if (!PRODUCTS_BY_CATEGORY[k]) PRODUCTS_BY_CATEGORY[k] = [];
      PRODUCTS_BY_CATEGORY[k] = Array.from(new Set([...PRODUCTS_BY_CATEGORY[k], ...stored[k]]));
    });
  } catch (e) {
    console.warn('Failed to load products_by_category from localStorage', e);
  }
}

function saveProducts() {
  try {
    localStorage.setItem('products_by_category', JSON.stringify(PRODUCTS_BY_CATEGORY));
  } catch (e) {
    console.warn('Failed to save products_by_category to localStorage', e);
  }
}

function showConfirm(message) {
  return new Promise((resolve) => {
    const modal = elements.confirmModal;
    if (!modal) {
      // fallback to native confirm
      resolve(window.confirm(message));
      return;
    }
    const msg = elements.confirmModalMessage;
    const btnConfirm = elements.confirmModalConfirm;
    const btnCancel = elements.confirmModalCancel;

    const cleanup = () => {
      modal.classList.remove('visible');
      document.removeEventListener('keydown', onKey);
      btnConfirm.removeEventListener('click', onConfirm);
      btnCancel.removeEventListener('click', onCancel);
    };

    const onConfirm = () => {
      cleanup();
      resolve(true);
    };

    const onCancel = () => {
      cleanup();
      resolve(false);
    };

    const onKey = (e) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    };

    msg.textContent = message;
    modal.classList.add('visible');
    btnConfirm.addEventListener('click', onConfirm);
    btnCancel.addEventListener('click', onCancel);
    // small timeout to allow listeners to attach before focus
    setTimeout(() => btnConfirm.focus(), 10);
    document.addEventListener('keydown', onKey);
  });
}

async function clearRecentPrices() {
  const ok = await showConfirm('Clear recent prices? This action cannot be undone.');
  if (!ok) return;
  RECENT_PRICES.length = 0;
  saveRecentPrices();
  // re-render items to update price selects
  renderItems();
  updateSummary();
}

async function clearCustomProducts() {
  const ok = await showConfirm('Clear custom products? Built-in products will remain. This will remove user-added entries and cannot be undone.');
  if (!ok) return;
  try {
    // remove stored custom products
    localStorage.removeItem('products_by_category');
    // reset in-memory to defaults
    Object.keys(PRODUCTS_BY_CATEGORY).forEach((k) => delete PRODUCTS_BY_CATEGORY[k]);
    Object.keys(DEFAULT_PRODUCTS).forEach((k) => {
      PRODUCTS_BY_CATEGORY[k] = Array.from(DEFAULT_PRODUCTS[k]);
    });
    renderItems();
    updateSummary();
  } catch (e) {
    console.warn('Failed to clear custom products', e);
  }
}

function loadRecentPrices() {
  try {
    const raw = localStorage.getItem('recent_prices');
    if (!raw) return;
    const stored = JSON.parse(raw);
    if (!Array.isArray(stored)) return;
    stored.forEach((p) => {
      const n = Number(p);
      if (!Number.isNaN(n)) RECENT_PRICES.push(n);
    });
  } catch (e) {
    console.warn('Failed to load recent_prices from localStorage', e);
  }
}

function saveRecentPrices() {
  try {
    const unique = Array.from(new Set(RECENT_PRICES)).slice(0, 10);
    localStorage.setItem('recent_prices', JSON.stringify(unique));
  } catch (e) {
    console.warn('Failed to save recent_prices to localStorage', e);
  }
}

const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

function validateItem(item, index) {
  const errors = [];
  if (!item.name.trim()) {
    errors.push({ field: 'name', index, message: `Item ${index + 1}: product name cannot be empty.` });
  }
  if (!item.category.trim()) {
    errors.push({ field: 'category', index, message: `Item ${index + 1}: category cannot be empty.` });
  }
  if (Number.isNaN(item.price) || item.price < 0) {
    errors.push({ field: 'price', index, message: `Item ${index + 1}: price must be a non-negative number.` });
  }
  if (!Number.isInteger(item.quantity) || item.quantity < 0) {
    errors.push({ field: 'quantity', index, message: `Item ${index + 1}: quantity must be a non-negative integer.` });
  }
  return errors;
}

function validateCoupon(coupon) {
  const errors = [];
  if (coupon.type === 'percent' && (Number.isNaN(coupon.value) || coupon.value < 0 || coupon.value > 100)) {
    errors.push({ field: 'couponValue', message: 'Coupon percent value must be between 0 and 100.' });
  }
  if (coupon.type === 'fixed' && (Number.isNaN(coupon.value) || coupon.value < 0)) {
    errors.push({ field: 'couponValue', message: 'Coupon fixed value must be a non-negative number.' });
  }
  if (Number.isNaN(coupon.minSubtotal) || coupon.minSubtotal < 0) {
    errors.push({ field: 'couponMinSubtotal', message: 'Coupon minimum subtotal must be a non-negative number.' });
  }
  if (coupon.categories.some((category) => !category.trim())) {
    errors.push({ field: 'couponCategories', message: 'Coupon category list must not contain empty values.' });
  }
  return errors;
}

function validateCustomer(customer) {
  const errors = [];
  if (!Number.isInteger(customer.loyaltyPoints) || customer.loyaltyPoints < 0) {
    errors.push({ field: 'loyaltyPoints', message: 'Loyalty points must be a non-negative integer.' });
  }
  return errors;
}

function validateOrder(orderData) {
  const errors = [];
  if (!orderData.items.length) {
    errors.push({ field: 'order', message: 'At least one item is required.' });
  }
  orderData.items.forEach((item, index) => {
    errors.push(...validateItem(item, index));
  });
  errors.push(...validateCoupon(orderData.coupon));
  errors.push(...validateCustomer(orderData.customer));
  return errors;
}

function computePricing(orderData) {
  const subtotal = roundMoney(orderData.items.reduce((sum, item) => sum + item.price * item.quantity, 0));

  let couponDiscount = 0;
  if (orderData.coupon && subtotal >= orderData.coupon.minSubtotal) {
    if (orderData.coupon.type === 'percent') {
      const percent = orderData.coupon.value / 100;
      if (orderData.coupon.categories?.length) {
        couponDiscount = orderData.items.reduce((sum, item) => {
          if (orderData.coupon.categories.includes(item.category.trim().toLowerCase())) {
            return sum + item.price * item.quantity * percent;
          }
          return sum;
        }, 0);
      } else {
        couponDiscount = subtotal * percent;
      }
    } else if (orderData.coupon.type === 'fixed') {
      couponDiscount = Math.min(orderData.coupon.value, subtotal);
    }
  }
  couponDiscount = roundMoney(couponDiscount);

  const afterCoupon = roundMoney(Math.max(subtotal - couponDiscount, 0));
  const memberDiscount = orderData.customer.isMember ? roundMoney(afterCoupon * 0.05) : 0;
  const afterMember = roundMoney(Math.max(afterCoupon - memberDiscount, 0));
  const tax = roundMoney(afterMember * 0.08);
  const afterTax = roundMoney(afterMember + tax);
  const loyaltyRedemption = roundMoney(Math.min(orderData.customer.loyaltyPoints / 100, afterTax));
  const total = roundMoney(Math.max(afterTax - loyaltyRedemption, 0));

  return {
    subtotal,
    couponDiscount,
    memberDiscount,
    tax,
    loyaltyRedemption,
    total
  };
}

function parseCategories(value) {
  return value
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

function clearErrorStates() {
  document.querySelectorAll('.input-error').forEach((element) => {
    element.classList.remove('input-error');
  });
  elements.couponValueError.textContent = '';
  elements.couponMinSubtotalError.textContent = '';
  elements.couponCategoriesError.textContent = '';
  elements.loyaltyPointsError.textContent = '';
  elements.globalErrors.textContent = '';
  elements.globalErrors.classList.remove('visible');
}

function renderItems() {
  elements.itemsTableBody.innerHTML = '';

  order.items.forEach((item, index) => {
    const row = document.createElement('tr');

    const cell = (content) => {
      const td = document.createElement('td');
      td.appendChild(content);
      return td;
    };

    const createSelect = (options, value, onChange, fieldId) => {
      const select = document.createElement('select');
      select.dataset.fieldId = fieldId;
      select.dataset.itemIndex = index;
      const empty = document.createElement('option');
      empty.value = '';
      empty.textContent = '--';
      select.appendChild(empty);
      options.forEach((opt) => {
        const o = document.createElement('option');
        o.value = typeof opt === 'string' ? opt : opt.value;
        o.textContent = typeof opt === 'string' ? opt : opt.label;
        if (String(o.value) === String(value)) o.selected = true;
        select.appendChild(o);
      });
      // add an Other option to allow freeform product names
      const otherOpt = document.createElement('option');
      otherOpt.value = '__other__';
      otherOpt.textContent = 'Other...';
      if (value && options.indexOf(value) === -1) {
        // if current value is not in options, we'll default to showing an input instead of selecting Other here
      } else {
        select.appendChild(otherOpt);
      }
      select.addEventListener('change', (event) => {
        if (event.target.value === '__other__') {
          const input = createInput('text', '', (e) => {
            order.items[index].name = e.target.value;
            updateSummary();
          }, fieldId);
          event.target.replaceWith(input);
          input.focus();
          order.items[index].name = '';
          return;
        }
        onChange(event);
      });
      return select;
    };

    const createInput = (type, value, onChange, fieldId) => {
      const input = document.createElement('input');
      input.type = type;
      input.value = value;
      input.dataset.fieldId = fieldId;
      input.dataset.itemIndex = index;
      input.addEventListener('input', onChange);

      if (fieldId === 'name') {
        input.addEventListener('blur', (e) => {
          const val = String(e.target.value || '').trim();
          if (!val) return;
          const cat = order.items[index].category || 'uncategorized';
          if (!PRODUCTS_BY_CATEGORY[cat]) PRODUCTS_BY_CATEGORY[cat] = [];
          if (!PRODUCTS_BY_CATEGORY[cat].includes(val)) {
            PRODUCTS_BY_CATEGORY[cat].push(val);
            saveProducts();
          }
          const select = createSelect(PRODUCTS_BY_CATEGORY[cat], val, (ev) => {
            order.items[index].name = ev.target.value;
            updateSummary();
          }, 'name');
          input.replaceWith(select);
        });
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') e.target.blur();
        });
      }

      if (fieldId === 'price') {
        input.addEventListener('blur', (e) => {
          const raw = e.target.value;
          const n = Number(raw);
          if (Number.isNaN(n)) return;
          // add to recent prices at front, keep unique and max 10
          const idx = RECENT_PRICES.indexOf(n);
          if (idx !== -1) RECENT_PRICES.splice(idx, 1);
          RECENT_PRICES.unshift(n);
          if (RECENT_PRICES.length > 10) RECENT_PRICES.splice(10);
          saveRecentPrices();
        });
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') e.target.blur();
        });
      }

      return input;
    };

    const createPriceControl = (value, onChange) => {
      const presets = PRICE_PRESETS;
      const numericValue = value === '' || value === null ? '' : Number(value);
      const inPresets = presets.includes(numericValue);
      const inRecent = RECENT_PRICES.includes(numericValue);
      if (!inPresets && !inRecent && numericValue !== '' && !Number.isNaN(numericValue)) {
        return createInput('number', numericValue, onChange, 'price');
      }

      const select = document.createElement('select');
      select.dataset.fieldId = 'price';
      select.dataset.itemIndex = index;
      const empty = document.createElement('option');
      empty.value = '';
      empty.textContent = '--';
      select.appendChild(empty);
      // include recent prices first
      const added = new Set();
      RECENT_PRICES.forEach((p) => {
        if (added.has(p)) return;
        const o = document.createElement('option');
        o.value = p;
        o.textContent = `$${p}`;
        if (p === numericValue) o.selected = true;
        select.appendChild(o);
        added.add(p);
      });
      // then presets (skip duplicates)
      presets.forEach((p) => {
        if (added.has(p)) return;
        const o = document.createElement('option');
        o.value = p;
        o.textContent = `$${p}`;
        if (p === numericValue) o.selected = true;
        select.appendChild(o);
        added.add(p);
      });
      const other = document.createElement('option');
      other.value = '__other__';
      other.textContent = 'Other...';
      select.appendChild(other);
      select.addEventListener('change', (event) => {
        if (event.target.value === '__other__') {
          const input = createInput('number', numericValue || 0, (e) => {
            onChange(e);
          }, 'price');
          event.target.replaceWith(input);
          input.focus();
          return;
        }
        // synthetic event shape expected by existing handlers
        const synthetic = { target: { value: parseFloat(event.target.value) } };
        onChange(synthetic);
      });
      return select;
    };

    const availableProducts = PRODUCTS_BY_CATEGORY[item.category] || Object.values(PRODUCTS_BY_CATEGORY).flat();
    let nameInput;
    if (item.name && availableProducts.indexOf(item.name) === -1) {
      // render a freeform input when the saved product isn't in the list
      nameInput = createInput('text', item.name, (event) => {
        order.items[index].name = event.target.value;
        updateSummary();
      }, 'name');
    } else {
      nameInput = createSelect(
        availableProducts,
        item.name,
        (event) => {
          order.items[index].name = event.target.value;
          updateSummary();
        },
        'name'
      );
    }

    const categoryInput = createSelect(
      CATEGORIES,
      item.category,
      (event) => {
        const newCat = event.target.value;
        order.items[index].category = newCat;
        // update the product select options for this row
        const productElem = document.querySelector(`[data-field-id="name"][data-item-index="${index}"]`);
        const currentProduct = order.items[index].name;
        const opts = PRODUCTS_BY_CATEGORY[newCat] || Object.values(PRODUCTS_BY_CATEGORY).flat();
        if (productElem) {
          if (productElem.tagName === 'SELECT') {
            // rebuild options
            productElem.innerHTML = '';
            const empty = document.createElement('option');
            empty.value = '';
            empty.textContent = '--';
            productElem.appendChild(empty);
            opts.forEach((p) => {
              const o = document.createElement('option');
              o.value = p;
              o.textContent = p;
              if (p === currentProduct) o.selected = true;
              productElem.appendChild(o);
            });
            const other = document.createElement('option');
            other.value = '__other__';
            other.textContent = 'Other...';
            productElem.appendChild(other);
            if (!opts.includes(currentProduct) && currentProduct) {
              // switch to a freeform input to preserve the current custom product
              const input = createInput('text', currentProduct, (e) => {
                order.items[index].name = e.target.value;
                updateSummary();
              }, 'name');
              productElem.replaceWith(input);
            }
          } else if (productElem.tagName === 'INPUT') {
            // if input exists but now the product matches an option, convert back to select
            if (opts.includes(currentProduct) || currentProduct === '') {
              const select = createSelect(opts, currentProduct, (event) => {
                order.items[index].name = event.target.value;
                updateSummary();
              }, 'name');
              productElem.replaceWith(select);
            }
          }
        }
        updateSummary();
      },
      'category'
    );

    const priceInput = createPriceControl(item.price, (event) => {
      order.items[index].price = parseFloat(event.target.value);
      if (Number.isNaN(order.items[index].price)) {
        order.items[index].price = -1;
      }
      updateSummary();
    });

    const quantityInput = createInput('number', item.quantity, (event) => {
      order.items[index].quantity = parseInt(event.target.value, 10);
      if (Number.isNaN(order.items[index].quantity)) {
        order.items[index].quantity = 0;
      }
      updateSummary();
    }, 'quantity');

    row.appendChild(cell(categoryInput));
    row.appendChild(cell(nameInput));
    row.appendChild(cell(priceInput));
    row.appendChild(cell(quantityInput));

    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.type = 'button';
    removeBtn.addEventListener('click', () => {
      order.items.splice(index, 1);
      renderItems();
      updateSummary();
    });
    row.appendChild(cell(removeBtn));

    elements.itemsTableBody.appendChild(row);
  });
}

function collectFormState() {
  order.coupon.type = elements.couponType.value;
  order.coupon.value = parseFloat(elements.couponValue.value);
  order.coupon.minSubtotal = parseFloat(elements.couponMinSubtotal.value);
  order.coupon.categories = parseCategories(elements.couponCategories.value);
  order.customer.isMember = elements.isMember.checked;
  order.customer.loyaltyPoints = parseInt(elements.loyaltyPoints.value, 10);

  if (Number.isNaN(order.coupon.value)) order.coupon.value = -1;
  if (Number.isNaN(order.coupon.minSubtotal)) order.coupon.minSubtotal = -1;
  if (Number.isNaN(order.customer.loyaltyPoints)) order.customer.loyaltyPoints = -1;
}

function renderValidationErrors(errors) {
  clearErrorStates();
  if (!errors.length) return;

  elements.globalErrors.innerHTML = errors.map((error) => `<div>${error.message}</div>`).join('');
  elements.globalErrors.classList.add('visible');

  errors.forEach((error) => {
    if (error.field === 'name' || error.field === 'category' || error.field === 'price' || error.field === 'quantity') {
      const selector = `input[data-field-id="${error.field}"][data-item-index="${error.index}"],select[data-field-id="${error.field}"][data-item-index="${error.index}"]`;
      const input = document.querySelector(selector);
      if (input) input.classList.add('input-error');
      return;
    }

    if (error.field === 'couponValue') {
      elements.couponValueError.textContent = error.message;
      elements.couponValue.classList.add('input-error');
      return;
    }

    if (error.field === 'couponMinSubtotal') {
      elements.couponMinSubtotalError.textContent = error.message;
      elements.couponMinSubtotal.classList.add('input-error');
      return;
    }

    if (error.field === 'couponCategories') {
      elements.couponCategoriesError.textContent = error.message;
      elements.couponCategories.classList.add('input-error');
      return;
    }

    if (error.field === 'loyaltyPoints') {
      elements.loyaltyPointsError.textContent = error.message;
      elements.loyaltyPoints.classList.add('input-error');
    }
  });
}

function updateSummary() {
  collectFormState();
  const validationErrors = validateOrder(order);
  renderValidationErrors(validationErrors);

  if (validationErrors.length) {
    elements.summarySubtotal.textContent = '$0.00';
    elements.summaryCoupon.textContent = '-$0.00';
    elements.summaryMember.textContent = '-$0.00';
    elements.summaryTax.textContent = '$0.00';
    elements.summaryLoyalty.textContent = '-$0.00';
    elements.summaryTotal.textContent = '$0.00';
    return;
  }

  const pricing = computePricing(order);
  elements.summarySubtotal.textContent = `$${pricing.subtotal.toFixed(2)}`;
  elements.summaryCoupon.textContent = `-$${pricing.couponDiscount.toFixed(2)}`;
  elements.summaryMember.textContent = `-$${pricing.memberDiscount.toFixed(2)}`;
  elements.summaryTax.textContent = `$${pricing.tax.toFixed(2)}`;
  elements.summaryLoyalty.textContent = `-$${pricing.loyaltyRedemption.toFixed(2)}`;
  elements.summaryTotal.textContent = `$${pricing.total.toFixed(2)}`;
}

function setupEventListeners() {
  elements.addItem.addEventListener('click', () => {
    collectFormState();
    const validationErrors = validateOrder(order);
    if (validationErrors.length) {
      renderValidationErrors(validationErrors);
      return;
    }

    order.items.push({ name: '', category: '', price: 0, quantity: 1 });
    renderItems();
    updateSummary();
  });

  [
    elements.couponType,
    elements.couponValue,
    elements.couponMinSubtotal,
    elements.couponCategories,
    elements.isMember,
    elements.loyaltyPoints
  ].forEach((element) => element.addEventListener('input', updateSummary));

  if (elements.clearRecentPrices) elements.clearRecentPrices.addEventListener('click', clearRecentPrices);
  if (elements.clearCustomProducts) elements.clearCustomProducts.addEventListener('click', clearCustomProducts);
}

function initialize() {
  loadProducts();
  loadRecentPrices();
  renderItems();
  setupEventListeners();
  updateSummary();
}

initialize();
