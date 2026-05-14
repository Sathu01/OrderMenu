package handler

import (
	"net/http"

	"bar-pos-backend/models"
	"bar-pos-backend/repository"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

// ─── Request DTOs ────────────────────────────────────────────────────────────

// OrderItem is a single line-item sent by the frontend.
// The frontend does NOT send _id or billsId — those are generated/resolved here.
type OrderItem struct {
	MenuID    int      `json:"menuId"    binding:"required"`
	OptionIDs []string `json:"optionIds"`
	Count     int      `json:"count"     binding:"required,min=1"`
}

// CreateOrdersRequest is the full POST /orders body.
//
// Case 1 — first order for a table:
//
//	{ "tableId": "T1", "billsId": null, "orders": [ ... ] }
//
// Case 2 — adding to an existing open bill:
//
//	{ "tableId": "T1", "billsId": "B-a3f9c12d", "orders": [ ... ] }
type CreateOrdersRequest struct {
	TableID string      `json:"tableId" binding:"required"`
	BillsID *string     `json:"billsId"` // pointer so we can distinguish null vs ""
	Orders  []OrderItem `json:"orders"  binding:"required,min=1"`
}

// ─── Handler ─────────────────────────────────────────────────────────────────

// OrderHandler handles HTTP requests related to orders.
type OrderHandler struct {
	orderRepo *repository.OrderRepository
	billRepo  *repository.BillRepository
}

func NewOrderHandler(orderRepo *repository.OrderRepository, billRepo *repository.BillRepository) *OrderHandler {
	return &OrderHandler{orderRepo: orderRepo, billRepo: billRepo}
}

// CreateOrders godoc
// POST /orders
//
// Resolves or creates a bill for the table, then inserts all order line-items.
// Returns the billsId so the frontend can store it for subsequent requests.
//
// Response: { "billsId": "B-a3f9c12d" }
func (h *OrderHandler) CreateOrders(c *gin.Context) {
	var req CreateOrdersRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx := c.Request.Context()
	var billID string

	// ── Determine which case we're in ────────────────────────────────────────
	if req.BillsID == nil || *req.BillsID == "" {
		// ── Case 1: No billsId — find an existing open bill or create a new one ──
		activeBill, err := h.billRepo.FindActiveBillByTableID(ctx, req.TableID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query bills"})
			return
		}

		if activeBill != nil {
			// A bill already exists for this table.
			if activeBill.Status == models.BillStatusProcessing {
				// Payment is in progress — block new orders immediately.
				c.JSON(http.StatusConflict, gin.H{
					"error": "this table's bill is currently being processed for payment — no new orders can be added",
				})
				return
			}
			// Status must be "pending" — safe to add more orders.
			billID = activeBill.ID
		} else {
			// Table is free — open a brand-new bill.
			newBill, err := h.billRepo.CreateBill(ctx, req.TableID)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create a new bill"})
				return
			}
			billID = newBill.ID
		}

	} else {
		// ── Case 2: billsId provided — verify it before inserting ────────────────
		billID = *req.BillsID

		bill, err := h.billRepo.FindByID(ctx, billID)
		if err != nil {
			if err == mongo.ErrNoDocuments {
				c.JSON(http.StatusNotFound, gin.H{"error": "bill not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch bill"})
			return
		}

		// Guard: table on the bill must match what the frontend claims.
		if bill.TableID != req.TableID {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "tableId does not match the bill — possible tampering or stale data",
			})
			return
		}

		// Guard: block orders when payment is in progress.
		if bill.Status == models.BillStatusProcessing {
			c.JSON(http.StatusConflict, gin.H{
				"error": "this bill is currently being processed for payment — no new orders can be added",
			})
			return
		}

		// Guard: bill already closed.
		if bill.Status == models.BillStatusPaid {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "this bill has already been paid — please open a new tab",
			})
			return
		}
	}

	// ── Build the Order documents with generated IDs and the resolved billID ──
	orders := make([]models.Order, len(req.Orders))
	for i, item := range req.Orders {
		optIDs := item.OptionIDs
		if optIDs == nil {
			optIDs = []string{}
		}
		orders[i] = models.Order{
			ID:        repository.NewOrderID(i),
			MenuID:    item.MenuID,
			OptionIDs: optIDs,
			BillsID:   billID,
			Count:     item.Count,
		}
	}

	// ── Bulk insert ───────────────────────────────────────────────────────────
	if err := h.orderRepo.InsertMany(ctx, orders); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save orders"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"billsId": billID})
}
