package repository

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"

	"bar-pos-backend/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

// OrderRepository encapsulates all CRUD operations on the orders collection,
// and also handles enrichment queries against the options collection.
type OrderRepository struct {
	col    *mongo.Collection
	optCol *mongo.Collection
}

func NewOrderRepository(db *mongo.Database) *OrderRepository {
	return &OrderRepository{
		col:    db.Collection("orders"),
		optCol: db.Collection("options"),
	}
}

// InsertMany bulk-inserts a slice of orders in a single round-trip.
func (r *OrderRepository) InsertMany(ctx context.Context, orders []models.Order) error {
	docs := make([]interface{}, len(orders))
	for i, o := range orders {
		docs[i] = o
	}
	_, err := r.col.InsertMany(ctx, docs)
	return err
}

// FindByBillsID returns all orders that belong to a given bill.
// Uses the idx_orders_billsId index.
func (r *OrderRepository) FindByBillsID(ctx context.Context, billsID string) ([]models.Order, error) {
	cursor, err := r.col.Find(ctx, bson.M{"billsId": billsID})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var orders []models.Order
	if err := cursor.All(ctx, &orders); err != nil {
		return nil, err
	}
	if orders == nil {
		orders = []models.Order{}
	}
	return orders, nil
}

// EnrichOrdersWithOptions takes a slice of orders and replaces the raw optionId
// strings with full Option documents — using a single $in query against options.
//
// This avoids N+1 queries: no matter how many orders or options there are,
// it always makes exactly ONE extra round-trip to MongoDB.
func (r *OrderRepository) EnrichOrdersWithOptions(
	ctx context.Context,
	orders []models.Order,
) ([]models.OrderWithDetails, error) {

	// Collect every unique option ID referenced across all orders.
	seen := make(map[string]struct{})
	var allOptIDs []string
	for _, o := range orders {
		for _, oid := range o.OptionIDs {
			if _, exists := seen[oid]; !exists {
				seen[oid] = struct{}{}
				allOptIDs = append(allOptIDs, oid)
			}
		}
	}

	// ONE round-trip to fetch all needed options.
	optMap := make(map[string]models.Option)
	if len(allOptIDs) > 0 {
		cursor, err := r.optCol.Find(ctx, bson.M{"_id": bson.M{"$in": allOptIDs}})
		if err != nil {
			return nil, err
		}
		var opts []models.Option
		if err := cursor.All(ctx, &opts); err != nil {
			return nil, err
		}
		cursor.Close(ctx)
		for _, opt := range opts {
			optMap[opt.ID] = opt
		}
	}

	// Assemble the enriched response in-memory.
	result := make([]models.OrderWithDetails, 0, len(orders))
	for _, o := range orders {
		options := make([]models.Option, 0, len(o.OptionIDs))
		for _, oid := range o.OptionIDs {
			if opt, ok := optMap[oid]; ok {
				options = append(options, opt)
			}
		}
		result = append(result, models.OrderWithDetails{
			ID:      o.ID,
			MenuID:  o.MenuID,
			Options: options,
			BillsID: o.BillsID,
			Count:   o.Count,
		})
	}
	return result, nil
}

// NewOrderID generates a collision-resistant order ID like "O-a3f9c12d1".
func NewOrderID(index int) string {
	b := make([]byte, 4)
	if _, err := rand.Read(b); err != nil {
		return fmt.Sprintf("O-%d-%d", time.Now().UnixNano(), index)
	}
	return fmt.Sprintf("O-%s-%d", hex.EncodeToString(b), index)
}
