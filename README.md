# Order Pricing Calculator

A small static web app that calculates order pricing with coupon, membership, tax, and loyalty redemption rules.

## Pricing rules

- `subtotal` is the sum of `price * quantity` for all items.
- A coupon applies only if `subtotal >= coupon.minSubtotal`.
- `percent` coupons discount the eligible line items, and if `coupon.categories` is set, only items in those categories are discounted.
- `fixed` coupons subtract a flat amount from the total, never below $0.
- Members get an additional 5% off after coupon application.
- Tax of 8% applies after coupon and member discount.
- Loyalty points are redeemed last, after tax, at 100 points = $1, never below $0.

## Files

- `index.html` — UI and page structure
- `styles.css` — styling
- `app.js` — pricing rules and validation logic

## Usage

Open `index.html` in a browser.
