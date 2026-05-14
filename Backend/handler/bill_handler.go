package handler

import (
	"net/http"

	"bar-pos-backend/models"
	"bar-pos-backend/repository"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

// BillHandler handles HTTP requests related to bills.
type BillHandler struct {
	billRepo  *repository.BillRepository
	orderRepo *repository.OrderRepository
}

func NewBillHandler(billRepo *repository.BillRepository, orderRepo *repository.OrderRepository) *BillHandler {
	return &BillHandler{billRepo: billRepo, orderRepo: orderRepo}
}

// GetBillByID godoc
// GET /bills/:id
//
// Returns the full bill with all of its order line-items.
// Each order is enriched with full Option objects (not just IDs).
//
// This uses exactly 3 DB round-trips regardless of order / option count:
//  1. FindByID       — get the bill
//  2. FindByBillsID  — get all orders for that bill
//  3. $in on options — get all referenced options in one shot
//
// Response: models.BillDetailsResponse
func (h *BillHandler) GetBillByID(c *gin.Context) {
	billID := c.Param("id")
	ctx := c.Request.Context()

	// ── Step 1: fetch the bill ───────────────────────────────────────────────
	bill, err := h.billRepo.FindByID(ctx, billID)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "bill not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch bill"})
		return
	}

	// ── Step 2: fetch all orders that belong to this bill ───────────────────
	orders, err := h.orderRepo.FindByBillsID(ctx, billID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch orders"})
		return
	}

	// ── Step 3: enrich orders with full option objects ───────────────────────
	enrichedOrders, err := h.orderRepo.EnrichOrdersWithOptions(ctx, orders)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to enrich orders with options"})
		return
	}

	c.JSON(http.StatusOK, models.BillDetailsResponse{
		Bill:   *bill,
		Orders: enrichedOrders,
	})
}

func (h *BillHandler) GetBillByTableID(c *gin.Context) {
	tableID := c.Param("id")
	ctx := c.Request.Context()

	// ── Step 1: fetch the bill ───────────────────────────────────────────────
	bill, err := h.billRepo.FindActiveBillByTableID(ctx, tableID)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "bill not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch bill"})
		return
	}

	// ── Step 2: fetch all orders that belong to this bill ───────────────────
	orders, err := h.orderRepo.FindByBillsID(ctx, bill.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch orders"})
		return
	}

	// ── Step 3: enrich orders with full option objects ───────────────────────
	enrichedOrders, err := h.orderRepo.EnrichOrdersWithOptions(ctx, orders)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to enrich orders with options"})
		return
	}

	c.JSON(http.StatusOK, models.BillDetailsResponse{
		Bill:   *bill,
		Orders: enrichedOrders,
	})

}

func (h *BillHandler) ChangeStatusToProcessing(c *gin.Context) {
	billID := c.Param("id")
	ctx := c.Request.Context()

	bill, err := h.billRepo.UpdateStatusByID(ctx, billID, "processing")
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "bill not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update bill status"})
		return
	}

	c.JSON(http.StatusOK, bill)
}

func (h *BillHandler) ChangeStatusToPaid(c *gin.Context) {
	billID := c.Param("id")
	ctx := c.Request.Context()

	bill, err := h.billRepo.UpdateStatusByID(ctx, billID, "paid")
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "bill not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update bill status"})
		return
	}

	c.JSON(http.StatusOK, bill)
}

// GetProcessBills returns every bill currently in the "processing" state
// along with their enriched orders (options embedded).
func (h *BillHandler) GetProcessBills(c *gin.Context) {
	ctx := c.Request.Context()

	bills, err := h.billRepo.FindByStatus(ctx, "processing")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch bills"})
		return
	}

	// Assemble response: one BillDetailsResponse per bill
	responses := make([]models.BillDetailsResponse, 0, len(bills))
	for _, b := range bills {
		orders, err := h.orderRepo.FindByBillsID(ctx, b.ID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch orders"})
			return
		}

		enrichedOrders, err := h.orderRepo.EnrichOrdersWithOptions(ctx, orders)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to enrich orders with options"})
			return
		}

		responses = append(responses, models.BillDetailsResponse{
			Bill:   b,
			Orders: enrichedOrders,
		})
	}

	c.JSON(http.StatusOK, responses)
}
