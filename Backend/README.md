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

## 4. API Reference

### `GET /menu`
Returns every available menu item.

**Response `200`**
```json
[
  {
    "id": 1,
    "name": "Craft IPA Beer",
    "description": "Hoppy and citrusy local craft beer.",
    "basePrice": 180,
    "category": "Beverage",
    "options": [1],
    "available": true
  }
]
```

---

### `GET /menu/:id`
Returns a menu item with its option-groups and nested options.

**Response `200`**
```json
{
  "menu": {
    "id": 1,
    "name": "Craft IPA Beer",
    "basePrice": 180,
    "options": [1]
  },
  "optionGroups": [
    {
      "id": 1,
      "detail": "Size / Volume",
      "options": [
        { "id": "OP1", "name": "Pint (500ml)", "price": 0,   "groupId": 1 },
        { "id": "OP2", "name": "Jug (1.5L)",   "price": 250, "groupId": 1 }
      ]
    }
  ]
}
```

---

### `POST /orders`

**Case 1 — first order (no open bill yet)**
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

**Case 2 — adding to an existing open bill**
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
{ "billsId": "B-a3f9c12d" }
```

**Error responses**

| Status | Reason |
|---|---|
| `400` | tableId / billsId mismatch, or bill already paid |
| `404` | billsId not found in DB |
| `409` | Bill status is "processing" — payment in progress |

---

### `GET /bills/:id`
Returns the bill and all enriched orders (options fully hydrated).

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

---

## 5. MongoDB Indexes Created on Startup

| Collection | Index | Purpose |
|---|---|---|
| `bills` | `{ tableid: 1, status: 1 }` | Fast lookup for open bill per table |
| `options` | `{ groupId: 1 }` | Fast fetch of all options in a group |
| `orders` | `{ billsId: 1 }` | Fast fetch of all orders in a bill |

---

## 6. DB Query Count per Endpoint

| Endpoint | DB Round-trips | Notes |
|---|---|---|
| `GET /menu` | 1 | Single `find` on menus |
| `GET /menu/:id` | 3 | find menu → `$in` groups → `$in` options |
| `POST /orders` (case 1, new) | 3 | find active bill → insert bill → insert orders |
| `POST /orders` (case 1, existing) | 2 | find active bill → insert orders |
| `POST /orders` (case 2) | 2 | find bill by ID → insert orders |
| `GET /bills/:id` | 3 | find bill → find orders → `$in` options |

No N+1 queries anywhere — all enrichment uses `$in` batching.
