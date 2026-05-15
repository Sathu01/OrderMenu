package repository

import (
	"context"

	"bar-pos-backend/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

// TableRepository handles reads against the tables collection.
type TableRepository struct {
	primaryCol  *mongo.Collection
	fallbackCol *mongo.Collection
}

func NewTableRepository(db *mongo.Database) *TableRepository {
	return &TableRepository{
		primaryCol:  db.Collection("tables"),
		fallbackCol: db.Collection("table"),
	}
}

func (r *TableRepository) FindByID(ctx context.Context, id string) (*models.Table, error) {
	var table models.Table
	err := r.primaryCol.FindOne(ctx, bson.M{"_id": id}).Decode(&table)
	if err == nil {
		return &table, nil
	}
	if err != mongo.ErrNoDocuments {
		return nil, err
	}

	if err := r.fallbackCol.FindOne(ctx, bson.M{"_id": id}).Decode(&table); err != nil {
		return nil, err
	}
	return &table, nil
}
