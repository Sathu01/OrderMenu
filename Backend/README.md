# 🍺 Bar POS — Go Backend

## Project Structure

```
bar-pos-backend/
├── main.go                    ← entry point: connect DB, start server, graceful shutdown
├── .env                       ← local environment variables (never commit this)
├── go.mod
│
├── config/
│   └── config.go              ← load MONGO_URI, DB_NAME, PORT from env
│
├── db/
│   └── mongo.go               ← Connect() + EnsureIndexes()
│
├── models/
│   └── models.go              ← all structs (DB docs + API response shapes)
│
├── repository/
│   ├── menu_repository.go     ← GetAllMenus, GetMenuByID, GetOptionGroupsWithOptions
│   ├── bill_repository.go     ← FindByID, FindActiveBillByTableID, CreateBill
│   └── order_repository.go    ← InsertMany, FindByBillsID, EnrichOrdersWithOptions
│
├── handler/
│   ├── menu_handler.go        ← GET /menu, GET /menu/:id
│   ├── order_handler.go       ← POST /orders (both cases)
│   └── bill_handler.go        ← GET /bills/:id
│
└── router/
    └── router.go              ← wire repos → handlers → Gin routes + CORS
```

---

## 1. Install Go packages

```bash
cd bar-pos-backend

# Download all dependencies declared in go.mod
go mod tidy
```

### Packages used

| Package | Purpose |
|---|---|
| `github.com/gin-gonic/gin` | HTTP router & JSON binding |
| `github.com/gin-contrib/cors` | CORS middleware for Gin |
| `go.mongodb.org/mongo-driver/mongo` | Official MongoDB Go driver |
| `go.mongodb.org/mongo-driver/bson` | BSON encode/decode (ships with driver) |
| `github.com/joho/godotenv` | Load `.env` file into `os.Getenv` |

---

## 2. Configure environment

Edit `.env`:

```env
MONGO_URI=mongodb://localhost:27017
DB_NAME=bar_pos_system
PORT=8080
GIN_MODE=debug          # set to "release" in production
```

---

## 3. Run

```bash
go run main.go
```

Or build a binary:

```bash
go build -o bar-pos-server .
./bar-pos-server
```

---

## 4. Frontend Page Reference

The frontend is a Next.js app in `Frontend/`. It uses `NEXT_PUBLIC_API_URL` when set, otherwise it calls `http://localhost:8080`.

### Main Entry

| Path | File | Purpose |
|---|---|---|
| `/` | `Frontend/app/page.tsx` | Landing page with two entry cards: customer and cashier. Customer goes to `/menu`; cashier goes to `/store/menu`. |

### Customer Pages

| Path | File | Purpose |
|---|---|---|
| `/table/:id` | `Frontend/app/(customer)/table/[id]/page.tsx` | Table-specific entry URL for QR codes. Fetches `GET /tables/:id`, saves the table in session, then redirects to `/menu`. Example: `/table/T1`, `/table/T2`, `/table/T3`. |
| `/menu` | `Frontend/app/(customer)/menu/page.tsx` | Customer menu list for the current table. Shows available menu items and the current cart summary. |
| `/menu/:id` | `Frontend/app/(customer)/menu/[id]/page.tsx` | Menu item detail page. Fetches `GET /menu/:id`, shows option groups, allows one choice per option topic, and adds the item to cart. |
| `/cart` | `Frontend/app/(customer)/cart/page.tsx` | Customer cart review. Sends orders with `POST /orders`; stores returned `billsId`; redirects to `/bills`. If the bill is already processing, redirects to `/payment`. |
| `/bills` | `Frontend/app/(customer)/bills/page.tsx` | Shows the active bill for the current table using `GET /bills/:tableId`. Customer can check out, which calls `PATCH /bills/user/:id` and moves the bill to `processing`. |
| `/payment` | `Frontend/app/(customer)/payment/page.tsx` | Waiting-for-payment screen. Polls `GET /bills/:tableId`; when cashier marks the bill paid, the customer session resets and returns to `/menu`. |

### Customer Table Flow

Use table URLs for QR codes instead of a fixed table:

| Table | Customer URL |
|---|---|
| `T1` / Bar Seat 1 | `/table/T1` |
| `T2` / Bar Seat 2 | `/table/T2` |
| `T3` / Booth A (VIP) | `/table/T3` |

When a customer opens `/table/:id`, the frontend selects that table from MongoDB. The shared customer layout also runs `BillStatusGuard`, which checks `GET /bills/:tableId` on customer pages. If that table has an active bill with status `processing`, the customer is sent to `/payment`.

If `/table/T2` shows "Invalid table", check the backend route directly:

```text
http://localhost:8080/tables/T2
```

Expected response:

```json
{
  "id": "T2",
  "name": "Bar Seat 2"
}
```

Restart the backend after route changes. The backend table repository checks MongoDB collection `tables` first and then `table`, so either collection name can work.

### Cashier Pages

| Path | File | Purpose |
|---|---|---|
| `/store/menu` | `Frontend/app/store/menu/page.tsx` | Cashier menu-management page. Fetches all menu items with `GET /menu/store` and toggles availability with `PATCH /menu/:id`. |
| `/store/bills` | `Frontend/app/store/bills/page.tsx` | Processing-bills page. Fetches `GET /bills/processing`, shows all bills waiting for payment, and confirms payment with `PATCH /bills/store/:id`. |
| `/store/history` | `Frontend/app/store/history/page.tsx` | Paid-bill history page. Fetches `GET /bills/paid`, opens bill details in a popup, and can download a text receipt. |

### Shared Frontend State

| File | Responsibility |
|---|---|
| `Frontend/contexts/app-context.tsx` | Stores menu, cart, current table session, and active bill ID in local storage. Provides helpers like `setTable`, `setActiveBillId`, `clearCart`, and `resetSession`. |
| `Frontend/components/customer/bill-status-guard.tsx` | Checks the current table's active bill on customer pages and redirects to `/payment` when status is `processing`. |

---

## 5. API Reference

All endpoints return JSON.

### `GET /menu`
Returns every menu item that is currently available.

**Response `200`**
```json
[
  {
    "id": 1,
    "name": "Craft IPA Beer",
    "description": "Hoppy and citrusy local craft beer.",
    "basePrice": 180,
    "url": "https://cdn.example.com/menu/beer-1.png",
    "category": "Beverage",
    "options": [1],
    "available": true
  }
]
```

### `GET /menu/:id`
Returns one menu item with its option groups and nested options.

**Response `200`**
```json
{
  "menu": {
    "id": 1,
    "name": "Craft IPA Beer",
    "description": "Hoppy and citrusy local craft beer.",
    "basePrice": 180,
    "url": "https://cdn.example.com/menu/beer-1.png",
    "category": "Beverage",
    "options": [1],
    "available": true
  },
  "optionGroups": [
    {
      "id": 1,
      "detail": "Size / Volume",
      "options": [
        { "id": "OP1", "name": "Pint (500ml)", "price": 0, "groupId": 1 },
        { "id": "OP2", "name": "Jug (1.5L)", "price": 250, "groupId": 1 }
      ]
    }
  ]
}
```

### `GET /tables/:id`
Returns one table document by table ID.

**Response `200`**
```json
{
  "id": "T1",
  "name": "Bar Seat 1"
}
```

### `PATCH /menu/:id`
Updates the `available` field for a menu item.

**Request body**
```json
{
  "available": false
}
```

**Response `200`**
```json
{
  "id": 1,
  "name": "Craft IPA Beer",
  "description": "Hoppy and citrusy local craft beer.",
  "basePrice": 180,
  "url": "https://cdn.example.com/menu/beer-1.png",
  "category": "Beverage",
  "options": [1],
  "available": false
}
```

### `POST /orders`
Creates order line items and either opens a new bill or reuses an existing one.

**Request body - new bill**
```json
{
  "tableId": "T1",
  "billsId": null,
  "orders": [
    { "menuId": 1, "optionIds": ["OP1"], "count": 2 },
    { "menuId": 2, "optionIds": ["OP3"], "count": 1 }
  ]
}
```

**Request body - add to existing bill**
```json
{
  "tableId": "T1",
  "billsId": "B-a3f9c12d",
  "orders": [
    { "menuId": 3, "optionIds": ["OP6"], "count": 2 }
  ]
}
```

**Response `201`**
```json
{
  "billsId": "B-a3f9c12d"
}
```

**Error responses**

| Status | Reason |
|---|---|
| `400` | invalid body, tableId mismatch, or bill already paid |
| `404` | billsId or bill not found |
| `409` | bill is already in `processing` status |

### `GET /bills/:id`
Returns one bill by bill ID with all of its orders and hydrated option objects.

**Response `200`**
```json
{
  "bill": {
    "id": "B-a3f9c12d",
    "createDate": "2026-05-14T20:30:00Z",
    "tableId": "T1",
    "status": "pending"
  },
  "orders": [
    {
      "id": "O-ff1a2b3c-0",
      "menuId": 1,
      "options": [
        { "id": "OP1", "name": "Pint (500ml)", "price": 0, "groupId": 1 }
      ],
      "billsId": "B-a3f9c12d",
      "count": 2
    }
  ]
}
```

### `GET /bills/processing`
Returns every bill whose status is `processing`, together with each bill's orders and full option objects.

**Response `200`**
```json
[
  {
    "bill": {
      "id": "B2",
      "createDate": "2026-05-14T21:00:00Z",
      "tableId": "T3",
      "status": "processing"
    },
    "orders": [
      {
        "id": "O03",
        "menuId": 1,
        "options": [
          {
            "id": "OP2",
            "name": "Jug (1.5L)",
            "price": 250,
            "groupId": 1
          }
        ],
        "billsId": "B2",
        "count": 1
      }
    ]
  }
]
```

### `GET /bills/paid`
Returns every bill whose status is `paid`, together with each bill's orders and full option objects.

**Response `200`**
```json
[
  {
    "bill": {
      "id": "B2",
      "createDate": "2026-05-14T21:00:00Z",
      "tableId": "T3",
      "status": "paid"
    },
    "orders": [
      {
        "id": "O03",
        "menuId": 1,
        "options": [
          {
            "id": "OP2",
            "name": "Jug (1.5L)",
            "price": 250,
            "groupId": 1
          }
        ],
        "billsId": "B2",
        "count": 1
      }
    ]
  }
]
```

### `PATCH /bills/user/:id`
Changes a bill status to `processing`.

**Response `200`**
```json
{
  "id": "B2",
  "createDate": "2026-05-14T21:00:00Z",
  "tableId": "T3",
  "status": "processing"
}
```

### `PATCH /bills/store/:id`
Changes a bill status to `paid`.

**Response `200`**
```json
{
  "id": "B2",
  "createDate": "2026-05-14T21:00:00Z",
  "tableId": "T3",
  "status": "paid"
}
```

### `GET /health`
Simple health check for the backend.

**Response `200`**
```json
{
  "status": "ok"
}
```

---

## 6. MongoDB Indexes Created on Startup

| Collection | Index | Purpose |
|---|---|---|
| `bills` | `{ tableid: 1, status: 1 }` | Fast lookup for open bill per table |
| `options` | `{ groupId: 1 }` | Fast fetch of all options in a group |
| `orders` | `{ billsId: 1 }` | Fast fetch of all orders in a bill |

---

## 7. DB Query Count per Endpoint

| Endpoint | DB Round-trips | Notes |
|---|---|---|
| `GET /menu` | 1 | Single `find` on menus |
| `GET /menu/:id` | 3 | find menu → `$in` groups → `$in` options |
| `PATCH /menu/:id` | 2 | update menu → re-fetch updated document |
| `POST /orders` (case 1, new) | 3 | find active bill → insert bill → insert orders |
| `POST /orders` (case 1, existing) | 2 | find active bill → insert orders |
| `POST /orders` (case 2) | 2 | find bill by ID → insert orders |
| `GET /bills/:id` | 3 | find bill → find orders → `$in` options |
| `GET /bills/processing` | 3N | for each bill: find orders → `$in` options |
| `GET /bills/paid` | 3N | for each bill: find orders → `$in` options |
| `PATCH /bills/user/:id` | 2 | update bill → re-fetch updated document |
| `PATCH /bills/store/:id` | 2 | update bill → re-fetch updated document |

No N+1 queries anywhere — all enrichment uses `$in` batching.
