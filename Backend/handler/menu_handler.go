package handler

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"bar-pos-backend/models"
	"bar-pos-backend/repository"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

var allowedMenuCategories = map[string]struct{}{
	"Beverage": {},
	"Snack":    {},
}

type menuPayload struct {
	Name        string  `json:"name"`
	Description string  `json:"description"`
	BasePrice   float64 `json:"basePrice"`
	Url         string  `json:"url"`
	Category    string  `json:"category"`
	Options     []int   `json:"options"`
	Available   bool    `json:"available"`
}

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
	if menu.Archived {
		c.JSON(http.StatusNotFound, gin.H{"error": "menu not found"})
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

// CreateMenu godoc
// POST /menu
// Creates a new menu item.
func (h *MenuHandler) CreateMenu(c *gin.Context) {
	var req menuPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	menu, ok := buildMenuFromPayload(req)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "name, category, and non-negative basePrice are required; category must be Beverage or Snack",
		})
		return
	}

	ctx := c.Request.Context()
	if err := h.ensureUniqueMenuName(ctx, menu.Name, 0); err != nil {
		if err == errDuplicateMenuName {
			c.JSON(http.StatusConflict, gin.H{"error": "menu name already exists"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to validate menu name"})
		return
	}

	created, err := h.repo.CreateMenu(ctx, menu)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create menu"})
		return
	}

	c.JSON(http.StatusCreated, created)
}

// UpdateMenu godoc
// PUT /menu/:id
// Updates all editable fields for one menu item.
func (h *MenuHandler) UpdateMenu(c *gin.Context) {
	id, ok := parseMenuID(c)
	if !ok {
		return
	}

	var req menuPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	menu, ok := buildMenuFromPayload(req)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "name, category, and non-negative basePrice are required; category must be Beverage or Snack",
		})
		return
	}

	ctx := c.Request.Context()
	if err := h.ensureUniqueMenuName(ctx, menu.Name, id); err != nil {
		if err == errDuplicateMenuName {
			c.JSON(http.StatusConflict, gin.H{"error": "menu name already exists"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to validate menu name"})
		return
	}

	updated, err := h.repo.UpdateMenuByID(ctx, id, menu)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "menu not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update menu"})
		return
	}

	c.JSON(http.StatusOK, updated)
}

// ArchiveMenu godoc
// DELETE /menu/:id
// Archives a menu item so it disappears from menu lists but remains available
// to historic bill/order enrichment.
func (h *MenuHandler) ArchiveMenu(c *gin.Context) {
	id, ok := parseMenuID(c)
	if !ok {
		return
	}

	menu, err := h.repo.ArchiveMenuByID(c.Request.Context(), id)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "menu not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to archive menu"})
		return
	}

	c.JSON(http.StatusOK, menu)
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
	id, ok := parseMenuID(c)
	if !ok {
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

var errDuplicateMenuName = errors.New("duplicate menu name")

func buildMenuFromPayload(req menuPayload) (models.Menu, bool) {
	name := strings.TrimSpace(req.Name)
	category := strings.TrimSpace(req.Category)
	if req.Options == nil {
		req.Options = []int{}
	}

	if name == "" || category == "" || req.BasePrice < 0 {
		return models.Menu{}, false
	}
	if _, ok := allowedMenuCategories[category]; !ok {
		return models.Menu{}, false
	}

	return models.Menu{
		Name:        name,
		Description: strings.TrimSpace(req.Description),
		BasePrice:   req.BasePrice,
		Url:         strings.TrimSpace(req.Url),
		Category:    category,
		Options:     req.Options,
		Available:   req.Available,
	}, true
}

func parseMenuID(c *gin.Context) (int, bool) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "menu id must be an integer"})
		return 0, false
	}
	return id, true
}

func (h *MenuHandler) ensureUniqueMenuName(ctx context.Context, name string, currentID int) error {
	existing, err := h.repo.FindMenuByName(ctx, name)
	if err == mongo.ErrNoDocuments {
		return nil
	}
	if err != nil {
		return err
	}
	if existing.ID != currentID {
		return errDuplicateMenuName
	}
	return nil
}
