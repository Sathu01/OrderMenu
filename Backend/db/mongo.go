package db

import (
	"context"
	"log"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Connect opens a MongoDB connection and pings the server to verify it.
func Connect(ctx context.Context, uri string) (*mongo.Client, error) {
	clientOpts := options.Client().ApplyURI(uri)
	client, err := mongo.Connect(ctx, clientOpts)
	if err != nil {
		return nil, err
	}
	if err := client.Ping(ctx, nil); err != nil {
		return nil, err
	}
	log.Println("✅ Connected to MongoDB")
	return client, nil
}

// EnsureIndexes creates all indexes required for optimal query performance.
// This is idempotent — safe to call on every startup.
func EnsureIndexes(ctx context.Context, database *mongo.Database) error {
	// ---------------------------------------------------------------
	// bills: compound index  { tableid: 1, status: 1 }
	// Powers: FindActiveBillByTableID — the most frequent lookup when
	// a waiter adds an order and we need to find the open bill.
	// ---------------------------------------------------------------
	billIdx := mongo.IndexModel{
		Keys: bson.D{
			{Key: "tableid", Value: 1},
			{Key: "status", Value: 1},
		},
		Options: options.Index().SetName("idx_bills_tableid_status"),
	}
	if _, err := database.Collection("bills").Indexes().CreateOne(ctx, billIdx); err != nil {
		return err
	}

	// ---------------------------------------------------------------
	// options: single-field index  { groupId: 1 }
	// Powers: GetOptionGroupsWithOptions — fetches all options for a
	// set of group IDs in a single $in query.
	// ---------------------------------------------------------------
	optIdx := mongo.IndexModel{
		Keys:    bson.D{{Key: "groupId", Value: 1}},
		Options: options.Index().SetName("idx_options_groupId"),
	}
	if _, err := database.Collection("options").Indexes().CreateOne(ctx, optIdx); err != nil {
		return err
	}

	// ---------------------------------------------------------------
	// orders: single-field index  { billsId: 1 }
	// Powers: FindByBillsID — fetches all line-items for a bill.
	// ---------------------------------------------------------------
	orderIdx := mongo.IndexModel{
		Keys:    bson.D{{Key: "billsId", Value: 1}},
		Options: options.Index().SetName("idx_orders_billsId"),
	}
	if _, err := database.Collection("orders").Indexes().CreateOne(ctx, orderIdx); err != nil {
		return err
	}

	log.Println("✅ MongoDB indexes ensured")
	return nil
}
