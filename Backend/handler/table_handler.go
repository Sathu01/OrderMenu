package handler

import (
	"net/http"

	"bar-pos-backend/repository"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

type TableHandler struct {
	repo *repository.TableRepository
}

func NewTableHandler(repo *repository.TableRepository) *TableHandler {
	return &TableHandler{repo: repo}
}

func (h *TableHandler) GetTableByID(c *gin.Context) {
	id := c.Param("id")

	table, err := h.repo.FindByID(c.Request.Context(), id)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "table not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch table"})
		return
	}

	c.JSON(http.StatusOK, table)
}
