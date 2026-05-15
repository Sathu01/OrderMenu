package router

import (
	"bar-pos-backend/handler"
	"bar-pos-backend/repository"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

// SetupRouter wires repositories → handlers → routes and returns a configured
// *gin.Engine ready to be passed to r.Run().
func SetupRouter(db *mongo.Database) *gin.Engine {
	r := gin.Default()

	// ── CORS ────────────────────────────────────────────────────────────────
	// Allow all origins in development; tighten this for production.
	r.Use(cors.New(cors.Config{
		AllowAllOrigins:  true,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		AllowCredentials: false,
	}))

	// ── Repositories ────────────────────────────────────────────────────────
	menuRepo := repository.NewMenuRepository(db)
	billRepo := repository.NewBillRepository(db)
	orderRepo := repository.NewOrderRepository(db)

	// ── Handlers ────────────────────────────────────────────────────────────
	menuHandler := handler.NewMenuHandler(menuRepo)
	orderHandler := handler.NewOrderHandler(orderRepo, billRepo)
	billHandler := handler.NewBillHandler(billRepo, orderRepo)

	// ── Routes ──────────────────────────────────────────────────────────────
	//
	//  GET    /menu        → list all available menu items
	//  GET    /menu/:id    → single menu item + grouped options
	//  POST   /orders      → create orders (opens or reuses a bill)
	//  GET    /bills/:id   → bill details + enriched order list by use table id
	//  PATCH  /bills/user/:id  → Update the status of bills
	//  PATCH  /menu/:id  → Update the status of menu avalable
	//
	r.GET("/menu", menuHandler.GetAllMenus)
	r.GET("/menu/store", menuHandler.GetAllMenusForStore)
	r.GET("/menu/:id", menuHandler.GetMenuByID)
	r.POST("/orders", orderHandler.CreateOrders)
	r.GET("/bills/:id", billHandler.GetBillByTableID)
	r.PATCH("/bills/user/:id", billHandler.ChangeStatusToProcessing)

	r.GET("/bills/processing", billHandler.GetProcessBills)
	r.GET("/bills/paid", billHandler.GetPaidBills)
	r.PATCH("/bills/store/:id", billHandler.ChangeStatusToPaid)
	r.PATCH("/menu/:id", menuHandler.ChangeAvailableMenu)

	// Health check — useful for Docker / K8s readiness probes.
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	return r
}
