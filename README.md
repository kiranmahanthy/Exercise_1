# Order Pricing Calculator

A small static web app for interactively building an order and computing pricing with coupons, membership discounts, tax, and loyalty redemption.

## What's new
- Columns swapped: the table shows **Category** first, then **Product**.
- Category and Product are selectable lists (select controls) instead of freeform text.
- Products list includes an **Other...** option that opens a freeform input; custom products are persisted to localStorage per category.
- Price control supports preset values, a recent-prices list (persisted), and an **Other...** numeric input for custom prices.
- New buttons to clear stored recent prices and custom products (with confirmation modal).

## Features
- Add/remove items and set Category, Product, Price, Quantity per row.
- Coupon support: percent/fixed, min subtotal, and category-restricted coupons.
- Customer options: membership (extra 5% after coupon) and loyalty points redemption.
- Validation with inline error markers and a global error list.
- Persisted data: user-added products (`products_by_category`) and recent prices (`recent_prices`) are saved to `localStorage`.

## How to use
1. Open `index.html` in a browser.
2. Items
	- Click `Add Item` to append a new row (new rows start with empty Category/Product and Price/Quantity = 0).
	- Select a `Category` from the list.
	- Select a `Product` from the Product list for that category.
	  - Choose `Other...` to type a freeform product name. When you blur or press Enter the custom product is saved to the current category and converted into a selectable entry.
	- Choose a `Price` from the presets or recent prices. Select `Other...` to type a numeric price directly. Custom prices are saved to a recent list on blur/Enter.
	- Enter `Quantity` (integer).
3. Coupon
	- Select coupon `type` (`percent` or `fixed`), set the `Value`, optional `Min subtotal`, and optional comma-separated `Categories` (only these categories are eligible for percent coupons).
4. Customer
	- Toggle `Member` for the 5% member discount applied after coupons.
	- Enter `Loyalty points` (100 points = $1 redemption applied after tax).
5. Clearing stored data
	- Use `Clear recent prices` to remove the recent price list (confirmation required).
	- Use `Clear custom products` to remove user-added products (confirmation required). Built-in default products are preserved.

## Data persistence
- Custom products are stored in `localStorage` under the key `products_by_category`.
- Recent custom prices are stored under `recent_prices`.
- Clearing these is available in the UI (with confirmation). To manually clear them, open your browser devtools and remove those keys from `localStorage`.

## Files
- `index.html` — UI and modal markup
- `styles.css` — styling (includes modal styling)
- `app.js` — application logic: rendering, validation, pricing, persistence

## Development / Notes
- This is a static app — open `index.html` in any modern browser.
- The app falls back to native `confirm()` if the in-app modal can't be found.
- If you want custom behavior (e.g., server persistence, export/import of lists, or different default product/price sets), tell me and I can implement it.

Enjoy — the README now includes example flows and screenshot placeholders.

## Example flows

1) Quick checkout with a percent coupon (category-restricted)
	- Add two items: select Category `electronics` and Product `Wireless Mouse`, Price `$50`, Quantity `1`.
	- Add second item: Category `kitchen`, Product `Coffee Mug`, Price `$10`, Quantity `2`.
	- Coupon: `percent`, Value `10`, Min subtotal `0`, Categories set to `electronics`.
	- Result: coupon discount applies only to the electronics line; member discount and tax apply afterwards. Verify `Subtotal`, `Coupon discount`, `Member discount`, `Tax`, and `Total` values in the Pricing Summary.

2) Add a custom product and custom price
	- Add item, select `Category` then choose `Product` → `Other...` and type `Handmade Vase`, press Enter (or blur). The product is saved to that category and becomes selectable next time.
	- For `Price` choose `Other...` and enter `37.5`, press Enter. The price is saved to the recent prices list and will appear in the top of the price selector.
	- Verify the custom product appears after reload (persisted via `localStorage`) and recent price appears in the Price select.

## Screenshots

If you want visual documentation, add images into a `screenshots/` folder and reference them here. Suggested files:
- `screenshots/flow-percent-coupon.png` — Pricing summary with percent coupon applied.
- `screenshots/flow-custom-product.png` — Adding a custom product and price.

You can include them in this README using standard Markdown image syntax after adding the files.
