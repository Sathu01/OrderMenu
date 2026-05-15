# POS System TODO

This checklist compares the current Tabletop POS system with a more complete restaurant/bar POS. Use it as a roadmap after the current customer ordering and cashier bill flow.

## Current System Summary

The project currently supports QR/table ordering, menu browsing, menu option selection, cart submission, active bills per table, cashier payment confirmation, unconfirming mistaken checkout, and paid bill history.

Main stack:

- Frontend: Next.js in `Frontend/`
- Backend: Go Gin API in `Backend/`
- Database: MongoDB `bar_pos_system`

## Already Finished

- [x] Customer table entry by URL, for example `/table/T1`, `/table/T2`, `/table/T3`.
- [x] Backend table lookup with `GET /tables/:id`.
- [x] Customer menu page with available menu items only.
- [x] Fixed customer menu categories: `Beverage` and `Snack`.
- [x] Menu detail page with option groups and one choice per option topic.
- [x] Customer cart with order review.
- [x] Cart item edit flow from cart back to menu detail.
- [x] Backend order creation with `POST /orders`.
- [x] One active unpaid bill per table.
- [x] Bill status lifecycle: `pending -> processing -> paid`.
- [x] Customer checkout flow using `PATCH /bills/user/:id`.
- [x] Customer waiting payment page.
- [x] Auto-check customer table bill status and redirect to waiting page when bill is `processing`.
- [x] Cashier processing bills page using `GET /bills/processing`.
- [x] Cashier confirm payment using `PATCH /bills/store/:id`.
- [x] Cashier unconfirm checkout using `PATCH /bills/pending/:id`.
- [x] Paid bills history using `GET /bills/paid`.
- [x] Paid bill history pagination, 10 bills per page.
- [x] Bill history detail popup.
- [x] Download receipt text from bill history.
- [x] Store menu management page.
- [x] Menu availability toggle using `PATCH /menu/:id`.
- [x] LAN/mobile development support with `pnpm dev:lan`.
- [x] Mock menu, option group, and option JSON import files.
- [x] Product requirements document.

## High Priority Next Work

### 1. Menu Management CRUD

- [ ] Add create menu item API.
- [ ] Add edit menu item API.
- [ ] Add delete or archive menu item API.
- [ ] Add store UI for adding/editing menu name, description, base price, image URL, category, option groups, and availability.
- [ ] Validate category values on backend.
- [ ] Add duplicate menu name warning.

Why this matters:

The cashier can only toggle availability now. A real POS needs staff to add new items, change price, update image, and remove old items without editing MongoDB manually.

Suggested backend routes:

```text
POST   /menu
PUT    /menu/:id
DELETE /menu/:id
```

Suggested collections affected:

```text
menus
optionsGroups
options
```

### 2. Category Management

- [ ] Replace fixed frontend category list with backend categories.
- [ ] Add category collection or category field validation.
- [ ] Add cashier category management page.
- [ ] Support category sort order.
- [ ] Support hide/show category.

Why this matters:

The system currently assumes only `Beverage` and `Snack`. That works for this version, but a POS usually needs categories like beer, cocktail, food, promotion, dessert, or seasonal items.

Suggested model:

```json
{
  "_id": "CAT-BEVERAGE",
  "name": "Beverage",
  "sortOrder": 1,
  "active": true
}
```

### 3. Stock Management

- [ ] Add stock/inventory model.
- [ ] Track stock quantity by menu item or ingredient.
- [ ] Auto-disable menu item when stock is zero.
- [ ] Add cashier stock page.
- [ ] Add low-stock warning.
- [ ] Add manual stock adjustment history.
- [ ] Decide whether stock is tracked by menu item or ingredient.

Why this matters:

A real POS should prevent customers from ordering sold-out items. For a bar, ingredient-level stock is useful for shared ingredients, but item-level stock is simpler to build first.

Simple first model:

```json
{
  "_id": "STOCK-1",
  "menuId": 1,
  "quantity": 24,
  "lowStockThreshold": 5,
  "trackStock": true
}
```

Better later model:

```json
{
  "_id": "ING-1",
  "name": "IPA Keg",
  "unit": "ml",
  "quantity": 12000,
  "lowStockThreshold": 2000
}
```

### 4. Order Status and Kitchen/Bar Queue

- [ ] Add order status: `new`, `accepted`, `preparing`, `ready`, `served`, `cancelled`.
- [ ] Add kitchen/bar display page.
- [ ] Allow staff to mark each order item as preparing/ready/served.
- [ ] Show customer order progress.
- [ ] Separate paid bill status from order preparation status.

Why this matters:

Right now the system tracks bill payment status, not food/drink preparation. A POS usually needs staff to know what to make next.

Suggested backend routes:

```text
GET   /orders/active
PATCH /orders/:id/status
```

### 5. Authentication and Roles

- [ ] Add staff login.
- [ ] Protect `/store/*` pages.
- [ ] Add roles: `cashier`, `manager`, `admin`, optionally `kitchen`.
- [ ] Restrict sensitive actions like paid confirmation, menu edit, and stock adjustment.
- [ ] Add logout.

Why this matters:

Currently anyone who knows `/store/menu`, `/store/bills`, or `/store/history` can access cashier tools.

### 6. Payment Methods and Paid Metadata

- [ ] Add payment method field: `cash`, `qr`, `card`, `transfer`, `other`.
- [ ] Add paid timestamp.
- [ ] Add cashier/staff ID who confirmed payment.
- [ ] Add optional note for payment.
- [ ] Show payment method in history and receipt.

Why this matters:

The current `paid` status confirms the bill, but it does not record how or when payment happened.

Suggested bill additions:

```json
{
  "paidAt": "2026-05-15T12:30:00Z",
  "paymentMethod": "cash",
  "paidBy": "staff-1"
}
```

## Medium Priority Work

### 7. Receipt Printer Support

- [ ] Add printable receipt view.
- [ ] Add browser print button.
- [ ] Add receipt settings: shop name, address, tax ID, footer.
- [ ] Later: integrate thermal printer.

Current system has text receipt download, which is a good start.

### 8. Table Management

- [ ] Add cashier table list page.
- [ ] Add create/edit/delete table.
- [ ] Generate QR URL for each table.
- [ ] Show current table status: free, ordering, waiting payment.
- [ ] Add table merge or move bill to another table.

Why this matters:

Tables currently exist in MongoDB but there is no cashier UI to manage them.

### 9. Discounts, Service Charge, and Tax

- [ ] Add bill-level discount.
- [ ] Add item-level discount.
- [ ] Add service charge setting.
- [ ] Add VAT/tax setting.
- [ ] Show subtotal, discount, service charge, tax, and grand total.

Why this matters:

Most POS totals need more than item price plus option price.

### 10. Reporting Dashboard

- [ ] Sales by day.
- [ ] Sales by category.
- [ ] Sales by menu item.
- [ ] Payment method report.
- [ ] Best-selling items.
- [ ] Void/cancel report.
- [ ] Export CSV.

Current history page can become the base for reports.

### 11. Order Cancellation and Refunds

- [ ] Allow cancel pending order item.
- [ ] Allow void bill before payment.
- [ ] Allow refund paid bill.
- [ ] Require reason for cancel/refund.
- [ ] Record staff ID and timestamp.

Why this matters:

Real cashier flows need a controlled way to fix mistakes after orders are submitted.

### 12. Customer UX Improvements

- [ ] Add language switch, for example English/Thai.
- [ ] Add allergy/spicy/ingredient notes.
- [ ] Add customer special request text per cart item.
- [ ] Add sold-out labels.
- [ ] Add "call staff" button.
- [ ] Add clearer order submitted success screen.

## Low Priority / Later

### 13. Multi-Device Real-Time Updates

- [ ] Replace polling with WebSocket or Server-Sent Events.
- [ ] Push new processing bills to cashier immediately.
- [ ] Push paid/unconfirmed status to customer immediately.

Current system uses polling, which is simpler and acceptable for the first version.

### 14. Multi-Branch Support

- [ ] Add branch model.
- [ ] Scope menus, tables, staff, bills, and reports by branch.
- [ ] Add branch selector for admin users.

### 15. Audit Log

- [ ] Record important actions in an audit log.
- [ ] Track who changed menu availability.
- [ ] Track who changed bill status.
- [ ] Track stock adjustments.
- [ ] Track refunds and cancelled orders.

### 16. Backup and Operations

- [ ] Add database backup instructions.
- [ ] Add production environment setup.
- [ ] Add deployment guide.
- [ ] Add monitoring and health check notes.
- [ ] Add seed/import script for mock data.

## Suggested Build Order

1. Menu CRUD and category management.
2. Payment metadata: payment method, paid timestamp, paid by.
3. Table management and QR generation.
4. Stock management, starting with simple menu-item stock.
5. Kitchen/bar order queue.
6. Authentication and roles.
7. Reports and receipt printer support.
8. Discounts, tax, cancellations, refunds.

## Data Model Additions To Consider

```text
categories
stockItems
stockMovements
staffUsers
orderStatusHistory
payments
discounts
auditLogs
settings
```

## API Areas To Add Later

```text
/categories
/stock
/stock-movements
/staff
/auth
/orders/active
/orders/:id/status
/tables
/reports/sales
/settings
/receipts/:billId
```

## Notes

- Keep current bill status only for payment lifecycle.
- Add a separate order item status for kitchen/bar workflow.
- Add stock in a small first version before ingredient-level inventory.
- Keep `Beverage` and `Snack` as default seed categories, even after category CRUD is added.
- Store pages should be protected before the app is used outside local testing.
