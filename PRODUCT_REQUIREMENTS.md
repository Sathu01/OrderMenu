# Product Requirements Document

## Product

Tabletop POS is a restaurant/bar ordering system with two main experiences:

- Customer ordering from a table by QR/table URL.
- Cashier/store operation for menu availability, payment confirmation, and bill history.

The system is built with:

- Frontend: Next.js app in `Frontend/`
- Backend: Go Gin API in `Backend/`
- Database: MongoDB database `bar_pos_system`

## Problem

Customers need a simple way to order food and drinks from a specific table without staff manually taking every order. Cashiers need a reliable way to see bills waiting for payment, confirm payment, undo accidental checkout requests, and review paid bill history.

## Goals

- Let each physical table use a unique customer URL such as `/table/T1`.
- Let customers browse only available menu items.
- Let customers select menu options and send orders to the backend.
- Keep one active bill per table until it is paid.
- Prevent new orders after a customer requests checkout.
- Let cashier confirm payment or unconfirm a mistaken checkout.
- Let cashier view paid bill history and download receipts.
- Keep the UI usable on mobile for customers and responsive for cashier on PC, monitor, tablet, and mobile.

## Non-Goals

- Staff login/authentication.
- Inventory tracking.
- Kitchen display system.
- Real payment gateway integration.
- Receipt printer integration.
- Multi-branch management.
- Advanced reporting dashboards.

## Users

### Customer

Uses a phone to scan a table QR code, browse menu items, customize options, submit orders, check bill, and wait for cashier confirmation.

### Cashier

Uses a desktop, monitor, tablet, or phone to manage menu availability, process bills, confirm payment, undo mistaken checkout requests, and review paid bills.

## Key User Flows

### Customer Table Entry

1. Customer opens `/table/:id`, for example `/table/T2`.
2. Frontend calls `GET /tables/:id`.
3. Frontend saves the table into local session.
4. Frontend redirects to `/menu`.
5. Customer layout checks active bill status with `GET /bills/:tableId`.
6. If the bill status is `processing`, customer is redirected to `/payment`.

### Customer Ordering

1. Customer opens `/menu`.
2. Frontend displays available menu items from `GET /menu`.
3. Customer opens `/menu/:id`.
4. Frontend fetches item details and option groups from `GET /menu/:id`.
5. Customer selects at most one option per option group.
6. Customer adds item to cart.
7. Customer reviews `/cart`.
8. Frontend sends order with `POST /orders`.
9. Backend creates or reuses an active pending bill for the table.
10. Frontend saves returned `billsId` and redirects to `/bills`.

### Customer Checkout

1. Customer opens `/bills`.
2. Frontend fetches active bill with `GET /bills/:tableId`.
3. Customer taps Check Bill.
4. Frontend calls `PATCH /bills/user/:id`.
5. Backend changes bill status to `processing`.
6. Frontend redirects to `/payment`.
7. `/payment` polls `GET /bills/:tableId`.
8. When bill becomes `paid`, session resets and customer returns to `/menu`.
9. If cashier unconfirms, bill becomes `pending` and customer returns to `/bills`.

### Cashier Processing Bills

1. Cashier opens `/store/bills`.
2. Frontend fetches `GET /bills/processing`.
3. Cashier clicks a bill card to view details.
4. Cashier can confirm payment with `PATCH /bills/store/:id`.
5. Cashier can undo checkout with `PATCH /bills/pending/:id`.
6. Confirmed paid bills move out of processing and into history.
7. Unconfirmed bills move back to pending and no longer appear in processing.

### Cashier Bill History

1. Cashier opens `/store/history`.
2. Frontend fetches `GET /bills/paid`.
3. Cashier clicks a bill row to see details in a popup.
4. Cashier can download a text receipt.

### Cashier Menu Management

1. Cashier opens `/store/menu`.
2. Frontend fetches all menu items with `GET /menu/store`.
3. Cashier searches items.
4. Cashier toggles item availability with `PATCH /menu/:id`.
5. Unavailable items do not appear on the customer menu.

## Frontend Requirements

### Global

- Use `NEXT_PUBLIC_API_URL` when available.
- Fallback API base URL is `http://localhost:8080`.
- Store customer session in local storage.
- Preserve selected table until a new `/table/:id` route is opened or session resets.
- Use responsive UI for mobile and desktop.

### Customer Pages

| Path | Requirement |
|---|---|
| `/table/:id` | Load table from backend, set session table, redirect to `/menu`, show invalid table state on 404. |
| `/menu` | Show categories `Beverage` and `Snack`, available menu items, current table, and cart summary. |
| `/menu/:id` | Show item image, description, price, option groups, one choice per group, quantity control, and add-to-cart button. |
| `/cart` | Show cart items, total, remove action, and send order button. Redirect to `/payment` on 409 processing conflict. |
| `/bills` | Show active bill details, order list, total, add more order button, and checkout confirmation. |
| `/payment` | Poll active bill status, show waiting UI, show paid confirmation, redirect when paid or unconfirmed. |

### Cashier Pages

| Path | Requirement |
|---|---|
| `/store/menu` | Search all menu items and toggle availability. |
| `/store/bills` | Show processing bills, detail sheet, confirm payment button, and unconfirm button. |
| `/store/history` | Show paid bills, paginated table, detail popup, and receipt download. |

## Backend Requirements

### API Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Health check. |
| `GET` | `/tables/:id` | Fetch one table by ID. |
| `GET` | `/menu` | Fetch available menu items for customers. |
| `GET` | `/menu/store` | Fetch all menu items for cashier. |
| `GET` | `/menu/:id` | Fetch one menu item with option groups and options. |
| `PATCH` | `/menu/:id` | Update menu availability. |
| `POST` | `/orders` | Create orders and create/reuse active pending bill. |
| `GET` | `/bills/:id` | Fetch active bill by table ID with enriched orders. |
| `GET` | `/bills/processing` | Fetch bills with status `processing`. |
| `GET` | `/bills/paid` | Fetch bills with status `paid`. |
| `PATCH` | `/bills/user/:id` | Change bill status to `processing`. |
| `PATCH` | `/bills/store/:id` | Change bill status to `paid`. |
| `PATCH` | `/bills/pending/:id` | Change bill status back to `pending`. |

### Bill Status Lifecycle

```text
pending -> processing -> paid
             |
             v
           pending
```

Rules:

- `pending`: Customer can add more orders.
- `processing`: Customer cannot add orders; cashier must confirm payment or unconfirm.
- `paid`: Bill is closed and appears in history.

## Data Model

### `tables`

```json
{
  "_id": "T1",
  "name": "Bar Seat 1"
}
```

### `menus`

```json
{
  "_id": 1,
  "name": "Craft IPA Beer",
  "description": "Crisp local IPA with citrus aroma.",
  "basePrice": 180,
  "url": "https://example.com/image.jpg",
  "category": "Beverage",
  "options": [1],
  "available": true
}
```

Allowed categories:

- `Beverage`
- `Snack`

### `optionsGroups`

```json
{
  "_id": 1,
  "detail": "Size / Volume"
}
```

### `options`

```json
{
  "_id": "OP1",
  "name": "Pint",
  "price": 50,
  "groupId": 1
}
```

### `bills`

```json
{
  "_id": "B-a3f9c12d",
  "createDate": "2026-05-14T20:30:00Z",
  "tableid": "T1",
  "status": "pending"
}
```

### `orders`

```json
{
  "_id": "O-ff1a2b3c-0",
  "menuId": 1,
  "optionIds": ["OP1"],
  "billsId": "B-a3f9c12d",
  "count": 2
}
```

## Acceptance Criteria

### Table Entry

- Opening `/table/T1` sets session table to `T1`.
- Opening an invalid table path shows an invalid table message.
- Opening a table with a processing bill redirects to `/payment`.

### Ordering

- Customer can only see available menu items.
- Customer can choose only one option per option group.
- Submitting cart creates or reuses a pending bill.
- Submitting order to a processing bill returns conflict and redirects customer to `/payment`.

### Checkout

- Customer checkout changes bill to `processing`.
- Processing bills appear on cashier `/store/bills`.
- Cashier confirm changes bill to `paid`.
- Cashier unconfirm changes bill back to `pending`.
- Customer waiting page returns to `/bills` when a bill is unconfirmed.

### History

- Paid bills appear on `/store/history`.
- Cashier can click a history row to view details.
- Cashier can download a receipt.

## Success Metrics

- Customer can complete an order from QR table URL to bill creation.
- Cashier can complete payment confirmation without backend errors.
- Accidental checkout can be undone without deleting orders.
- Customer and cashier pages work on mobile width.
- Cashier pages remain readable on desktop/monitor width.

## Risks And Mitigations

| Risk | Mitigation |
|---|---|
| Customer uses wrong table URL | Use QR codes tied to `/table/:id` and show table name in header. |
| Bill stuck in processing by mistake | Cashier can use Unconfirm to return bill to pending. |
| Menu category mismatch | Keep frontend categories fixed to `Beverage` and `Snack`; mock data uses only those values. |
| Missing table collection name | Backend checks both `tables` and `table`. |
| Local storage stale session | Opening `/table/:id` resets table session and active bill ID. |

## Future Enhancements

- Authentication for cashier access.
- Kitchen order queue.
- Receipt printer support.
- Payment provider integration.
- Table management page.
- Sales reports by day, table, category, and item.
- Paid timestamp field on bills.
- Customer language switch.
