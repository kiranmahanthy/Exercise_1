# Order Pricing Calculator

A static pricing calculator and checkout simulation for applying coupon logic, membership discounts, tax, and loyalty redemption.

## Overview
This project includes:
- a browser-based pricing calculator in [index.html](index.html)
- the pricing logic and UI behavior in [app.js](app.js)
- automated Jest test coverage in [checkout.spec.ts](checkout.spec.ts)
- generated validation artifacts in the [test-reports](test-reports) folder

## Features
- Add and remove order items with category, product, price, and quantity
- Apply percent or fixed coupons
- Support minimum subtotal rules and category restrictions
- Apply member discount after coupon logic
- Apply loyalty-point redemption after tax
- Validate calculated totals and rounding behavior
- Persist custom product and recent price data in browser local storage

## Local execution
This project runs without Docker.

### Prerequisites
- Node.js and npm installed

### Install dependencies
```bash
npm install
```

### Run the tests
```bash
npm test -- --runInBand
```

### Open the app
Open [index.html](index.html) directly in a browser.

## Test automation
The verification suite is implemented in [checkout.spec.ts](checkout.spec.ts) and uses Jest with TypeScript support.

Current status:
- 1 test suite passed
- 10 tests passed
- 0 failed

## Generated reports
The project generates test and QA artifacts under [test-reports](test-reports):
- junit.xml — JUnit XML result file
- junit-web-report.html — browser-friendly HTML summary
- test-case-master-workbook.xlsx — readable Excel workbook with one row per test step
- QA and sign-off documents are also stored there when generated

## Project structure
- [app.js](app.js) — pricing logic, browser initialization, and persistence handling
- [checkout.spec.ts](checkout.spec.ts) — automated test cases
- [index.html](index.html) — UI markup
- [styles.css](styles.css) — styling and layout
- [jest.config.cjs](jest.config.cjs) — Jest configuration
- [package.json](package.json) — scripts and dependencies
- [tsconfig.json](tsconfig.json) — TypeScript compiler settings

## Notes
- Docker support was removed from the workflow because the project is validated locally with Jest.
- The app is intentionally static and does not require a backend server.
- All browser-state persistence is stored in localStorage, which keeps custom products and recent prices available across sessions.

## Example user flow
1. Add an item with category and product selection.
2. Choose a price and quantity.
3. Configure coupon, member status, and loyalty points.
4. Review the pricing summary for subtotal, discounts, tax, and total.
5. Validate the result against the expected values in the automated tests.
