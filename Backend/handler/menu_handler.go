package handler

import (
	"net/http"
	"strconv"

	"bar-pos-backend/repository"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

// MenuHandler handles HTTP requests related to the menu.
type MenuHandler struct {
	repo *repository.MenuRepository
}

func NewMenuHandler(repo *repository.MenuRepository) *MenuHandler {
	return &MenuHandler{repo: repo}
}

// GetAllMenus godoc
// GET /menu
// Returns every available menu item as a JSON array.
func (h *MenuHandler) GetAllMenus(c *gin.Context) {
	menus, err := h.repo.GetAllMenus(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch menus"})
		return
	}
	c.JSON(http.StatusOK, menus)
}

// GetAllMenusForStore godoc
// GET /menu/store
// Returns every menu item including unavailable ones (for store management).
func (h *MenuHandler) GetAllMenusForStore(c *gin.Context) {
	menus, err := h.repo.GetEveryMenu(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch menus"})
		return
	}
	c.JSON(http.StatusOK, menus)
}

// GetMenuByID godoc
// GET /menu/:id
// Returns the menu item plus all of its option-groups (with nested options).
//
// Example response:
//
//	{
//	  "menu": { ... },
//	  "optionGroups": [
//	    {
//	      "id": 1,
//	      "detail": "Size / Volume",
//	      "options": [
//	        { "id": "OP1", "name": "Pint (500ml)", "price": 0,   "groupId": 1 },
//	        { "id": "OP2", "name": "Jug (1.5L)",   "price": 250, "groupId": 1 }
//	      ]
//	    }
//	  ]
//	}
func (h *MenuHandler) GetMenuByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "menu id must be an integer"})
		return
	}

	ctx := c.Request.Context()

	menu, err := h.repo.GetMenuByID(ctx, id)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "menu not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch menu"})
		return
	}

	optionGroups, err := h.repo.GetOptionGroupsWithOptions(ctx, menu.Options)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch option groups"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"menu":         menu,
		"optionGroups": optionGroups,
	})
}

// ChangeAvailableMenu godoc
// PATCH /menu/:id
// Toggle menu item's availability status.
//
// Request body:
//
//	{
//	  "available": true/false
//	}
//
// Response: returns the updated menu item.
func (h *MenuHandler) ChangeAvailableMenu(c *gin.Context) {
	// Extract menu ID from URL param
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "menu id must be an integer"})
		return
	}

	// Parse JSON request body
	var req struct {
		Available bool `json:"available"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	// Update menu availability in database
	ctx := c.Request.Context()
	menu, err := h.repo.UpdateAvailableByID(ctx, id, req.Available)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "menu not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update menu"})
		return
	}

	c.JSON(http.StatusOK, menu)
}
