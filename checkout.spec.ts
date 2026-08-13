/* eslint-disable @typescript-eslint/no-var-requires */
const { computePricing } = require('./app.js');

describe('Checkout pricing SPEC (source of truth)', () => {
  test('subtotal = sum(price * quantity) and no other rules', () => {
    const order = {
      items: [
        { name: 'A', category: 'x', price: 10, quantity: 2 }, // 20
        { name: 'B', category: 'y', price: 5, quantity: 1 }   // 5
      ],
      coupon: { type: 'percent', value: 0, minSubtotal: 0, categories: [] },
      customer: { isMember: false, loyaltyPoints: 0 }
    };

    const res = computePricing(order);
    // subtotal = 25
    expect(res.subtotal).toBeCloseTo(25.00, 2);
    // no coupon, no member, tax 8% on 25 = 2.00 => total 27.00
    expect(res.couponDiscount).toBeCloseTo(0.00, 2);
    expect(res.memberDiscount).toBeCloseTo(0.00, 2);
    expect(res.tax).toBeCloseTo(2.00, 2);
    expect(res.total).toBeCloseTo(27.00, 2);
  });

  test('percent coupon applies to whole order when categories empty', () => {
    const order = {
      items: [ { name: 'X', category: 'c', price: 50, quantity: 1 } ], // subtotal 50
      coupon: { type: 'percent', value: 10, minSubtotal: 0, categories: [] },
      customer: { isMember: false, loyaltyPoints: 0 }
    };

    const res = computePricing(order);
    // coupon = 10% of 50 = 5
    expect(res.couponDiscount).toBeCloseTo(5.00, 2);
    // after coupon 45, tax 8% = 3.6 => total 48.6
    expect(res.tax).toBeCloseTo(3.60, 2);
    expect(res.total).toBeCloseTo(48.60, 2);
  });

  test('percent coupon with categories applies only to matching items', () => {
    const order = {
      items: [
        { name: 'Mouse', category: 'electronics', price: 100, quantity: 1 },
        { name: 'Mug', category: 'kitchen', price: 50, quantity: 1 }
      ], // subtotal 150
      coupon: { type: 'percent', value: 10, minSubtotal: 0, categories: ['electronics'] },
      customer: { isMember: false, loyaltyPoints: 0 }
    };

    const res = computePricing(order);
    // coupon applies only to electronics: 10% of 100 = 10
    expect(res.couponDiscount).toBeCloseTo(10.00, 2);
    // after coupon 140, tax 11.2, total 151.2
    expect(res.tax).toBeCloseTo(11.20, 2);
    expect(res.total).toBeCloseTo(151.20, 2);
  });

  test('coupon only applies if subtotal >= minSubtotal', () => {
    const order = {
      items: [ { name: 'P', category: 'a', price: 49, quantity: 1 } ], // subtotal 49
      coupon: { type: 'percent', value: 50, minSubtotal: 50, categories: [] },
      customer: { isMember: false, loyaltyPoints: 0 }
    };

    const res = computePricing(order);
    // coupon shouldn't apply (49 < 50)
    expect(res.couponDiscount).toBeCloseTo(0.00, 2);
    // tax 8% of 49 = 3.92 -> total 52.92
    expect(res.tax).toBeCloseTo(3.92, 2);
    expect(res.total).toBeCloseTo(52.92, 2);
  });

  test('fixed coupon subtracts from running total but never below 0', () => {
    const order = {
      items: [ { name: 'Item', category: 'a', price: 30, quantity: 1 } ], // subtotal 30
      coupon: { type: 'fixed', value: 50, minSubtotal: 0, categories: [] },
      customer: { isMember: false, loyaltyPoints: 0 }
    };

    const res = computePricing(order);
    // coupon discount = min(50, 30) = 30
    expect(res.couponDiscount).toBeCloseTo(30.00, 2);
    // after coupon 0, tax 0, total 0
    expect(res.tax).toBeCloseTo(0.00, 2);
    expect(res.total).toBeCloseTo(0.00, 2);
  });

  test('member discount (5%) applies after coupon', () => {
    const order = {
      items: [ { name: 'A', category: 'a', price: 200, quantity: 1 } ], // subtotal 200
      coupon: { type: 'fixed', value: 10, minSubtotal: 0, categories: [] },
      customer: { isMember: true, loyaltyPoints: 0 }
    };

    const res = computePricing(order);
    // after coupon: 190; member discount 5% of 190 = 9.5
    expect(res.memberDiscount).toBeCloseTo(9.50, 2);
    // after member 180.5; tax 8% = 14.44 => total 194.94
    expect(res.tax).toBeCloseTo(14.44, 2);
    expect(res.total).toBeCloseTo(194.94, 2);
  });

  test('tax of 8% applied after coupon + member discount', () => {
    const order = {
      items: [ { name: 'A', category: 'a', price: 100, quantity: 1 } ],
      coupon: { type: 'percent', value: 10, minSubtotal: 0, categories: [] }, // coupon 10
      customer: { isMember: true, loyaltyPoints: 0 }
    };

    const res = computePricing(order);
    // subtotal 100; coupon 10 => 90; member 5% of 90 = 4.5 => after member 85.5; tax 8% = 6.84
    expect(res.tax).toBeCloseTo(6.84, 2);
    expect(res.total).toBeCloseTo(92.34, 2);
  });

  test('loyalty redemption applies last (100 points = $1) and cannot reduce below zero', () => {
    const order = {
      items: [ { name: 'A', category: 'a', price: 50, quantity: 1 } ], // subtotal 50
      coupon: { type: 'percent', value: 0, minSubtotal: 0, categories: [] },
      customer: { isMember: false, loyaltyPoints: 600 } // $6
    };

    const res = computePricing(order);
    // tax 8% of 50 = 4 => afterTax 54; loyalty redemption min(6,54)=6 => total 48
    expect(res.loyaltyRedemption).toBeCloseTo(6.00, 2);
    expect(res.total).toBeCloseTo(48.00, 2);
  });

  test('rounding to 2 decimals is enforced', () => {
    const order = {
      items: [ { name: 'A', category: 'a', price: 10.333, quantity: 1 } ], // subtotal 10.333
      coupon: { type: 'percent', value: 0, minSubtotal: 0, categories: [] },
      customer: { isMember: false, loyaltyPoints: 0 }
    };

    const res = computePricing(order);
    // subtotal rounded to 2 decimals by function: 10.33; tax = 0.8264 -> rounded 0.83; total 11.16
    expect(res.subtotal).toBeCloseTo(10.33, 2);
    expect(res.tax).toBeCloseTo(0.83, 2);
    expect(res.total).toBeCloseTo(11.16, 2);
  });

  test('complex combined scenario runs rules in exact order', () => {
    const order = {
      items: [
        { name: 'Phone', category: 'electronics', price: 299.99, quantity: 1 },
        { name: 'Case', category: 'electronics', price: 19.99, quantity: 2 },
        { name: 'Mug', category: 'kitchen', price: 9.5, quantity: 3 }
      ],
      coupon: { type: 'percent', value: 15, minSubtotal: 0, categories: ['electronics'] },
      customer: { isMember: true, loyaltyPoints: 250 } // $2.50
    };

    const res = computePricing(order);
    // Manually compute expected values following the SPEC order:
    // subtotal = 299.99 + (19.99*2) + (9.5*3) = 299.99 + 39.98 + 28.5 = 368.47
    expect(res.subtotal).toBeCloseTo(368.47, 2);
    // coupon applies only to electronics: electronics lines = 299.99 + 39.98 = 339.97; 15% of that = 50.9955 -> round to 51.00
    expect(res.couponDiscount).toBeCloseTo(51.00, 2);
    // after coupon = 317.47; member 5% of 317.47 = 15.8735 -> 15.87 (rounded)
    expect(res.memberDiscount).toBeCloseTo(15.87, 2);
    // after member = 301.60; tax 8% = 24.128 -> 24.13
    expect(res.tax).toBeCloseTo(24.13, 2);
    // after tax = 325.73; loyalty redemption = min(2.5, 325.73) = 2.5
    expect(res.loyaltyRedemption).toBeCloseTo(2.50, 2);
    // final total = 323.23
    expect(res.total).toBeCloseTo(323.23, 2);
  });
});
