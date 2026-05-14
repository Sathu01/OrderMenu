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

// BillRepository encapsulates all CRUD operations on the bills collection.
type BillRepository struct {
	col *mongo.Collection
}

func NewBillRepository(db *mongo.Database) *BillRepository {
	return &BillRepository{col: db.Collection("bills")}
}

// FindByID returns a single bill by its _id.
// Returns mongo.ErrNoDocuments when not found — callers should check for this.
func (r *BillRepository) FindByID(ctx context.Context, id string) (*models.Bill, error) {
	var bill models.Bill
	if err := r.col.FindOne(ctx, bson.M{"_id": id}).Decode(&bill); err != nil {
		return nil, err
	}
	return &bill, nil
}

// FindActiveBillByTableID looks for a bill on the given table whose status is
// NOT "paid" (i.e. "pending" or "processing").
//
// This is the primary lookup when the frontend has no billsId yet.
// Returns (nil, nil) when no active bill exists — meaning the table is free.
//
// Uses the compound index { tableid: 1, status: 1 }.
func (r *BillRepository) FindActiveBillByTableID(
	ctx context.Context,
	tableID string,
) (*models.Bill, error) {
	filter := bson.M{
		"tableid": tableID,
		"status":  bson.M{"$in": []string{models.BillStatusPending, models.BillStatusProcessing}},
	}
	var bill models.Bill
	err := r.col.FindOne(ctx, filter).Decode(&bill)
	if err == mongo.ErrNoDocuments {
		return nil, nil // table is free — not an error
	}
	if err != nil {
		return nil, err
	}
	return &bill, nil
}

// CreateBill inserts a new pending bill for the given table and returns it.
func (r *BillRepository) CreateBill(ctx context.Context, tableID string) (*models.Bill, error) {
	bill := models.Bill{
		ID:         newBillID(),
		CreateDate: time.Now().UTC(),
		TableID:    tableID,
		Status:     models.BillStatusPending,
	}
	if _, err := r.col.InsertOne(ctx, bill); err != nil {
		return nil, err
	}
	return &bill, nil
}

// UpdateStatusByID changes a bill's status by its _id.
// Returns mongo.ErrNoDocuments when the bill does not exist.
func (r *BillRepository) UpdateStatusByID(ctx context.Context, id string, status string) (*models.Bill, error) {
	filter := bson.M{"_id": id}
	update := bson.M{"$set": bson.M{"status": status}}

	result, err := r.col.UpdateOne(ctx, filter, update)
	if err != nil {
		return nil, err
	}
	if result.MatchedCount == 0 {
		return nil, mongo.ErrNoDocuments
	}

	return r.FindByID(ctx, id)
}

// FindByStatus returns all bills that match the provided status string.
func (r *BillRepository) FindByStatus(ctx context.Context, status string) ([]models.Bill, error) {
	cursor, err := r.col.Find(ctx, bson.M{"status": status})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var bills []models.Bill
	if err := cursor.All(ctx, &bills); err != nil {
		return nil, err
	}
	if bills == nil {
		bills = []models.Bill{}
	}
	return bills, nil
}

// newBillID generates a collision-resistant bill ID like "B-a3f9c12d".
// Uses crypto/rand so IDs are unpredictable.
func newBillID() string {
	b := make([]byte, 4)
	if _, err := rand.Read(b); err != nil {
		// Fallback: use nanosecond timestamp (still very unlikely to collide in a POS)
		return fmt.Sprintf("B-%d", time.Now().UnixNano())
	}
	return "B-" + hex.EncodeToString(b)
}
