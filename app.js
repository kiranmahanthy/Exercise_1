const order = {
  items: [
    { name: 'Wireless Mouse', category: 'electronics', price: 29.99, quantity: 1 },
    { name: 'Coffee Mug', category: 'kitchen', price: 12.5, quantity: 2 }
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
};

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

    const createInput = (type, value, onChange, fieldId) => {
      const input = document.createElement('input');
      input.type = type;
      input.value = value;
      input.dataset.fieldId = fieldId;
      input.dataset.itemIndex = index;
      input.addEventListener('input', onChange);
      return input;
    };

    const nameInput = createInput('text', item.name, (event) => {
      order.items[index].name = event.target.value;
      updateSummary();
    }, 'name');

    const categoryInput = createInput('text', item.category, (event) => {
      order.items[index].category = event.target.value;
      updateSummary();
    }, 'category');

    const priceInput = createInput('number', item.price, (event) => {
      order.items[index].price = parseFloat(event.target.value);
      if (Number.isNaN(order.items[index].price)) {
        order.items[index].price = -1;
      }
      updateSummary();
    }, 'price');

    const quantityInput = createInput('number', item.quantity, (event) => {
      order.items[index].quantity = parseInt(event.target.value, 10);
      if (Number.isNaN(order.items[index].quantity)) {
        order.items[index].quantity = -1;
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
      const selector = `input[data-field-id="${error.field}"][data-item-index="${error.index}"]`;
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

    order.items.push({ name: 'New Item', category: '', price: 0, quantity: 1 });
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
}

function initialize() {
  renderItems();
  setupEventListeners();
  updateSummary();
}

initialize();
