package repository

import (
	"context"

	"bar-pos-backend/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

// MenuRepository handles all read operations against the menus, optionsGroups
// and options collections.
type MenuRepository struct {
	menuCol   *mongo.Collection
	optGrpCol *mongo.Collection
	optCol    *mongo.Collection
}

func NewMenuRepository(db *mongo.Database) *MenuRepository {
	return &MenuRepository{
		menuCol:   db.Collection("menus"),
		optGrpCol: db.Collection("optionsGroups"),
		optCol:    db.Collection("options"),
	}
}

// GetAllMenus returns every available menu item.
func (r *MenuRepository) GetAllMenus(ctx context.Context) ([]models.Menu, error) {
	cursor, err := r.menuCol.Find(ctx, bson.M{"available": true})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var menus []models.Menu
	if err := cursor.All(ctx, &menus); err != nil {
		return nil, err
	}
	// Always return an array — never null — so the frontend can safely iterate.
	if menus == nil {
		menus = []models.Menu{}
	}
	return menus, nil
}

// GetEveryMenu returns every menu item, including unavailable items.
func (r *MenuRepository) GetEveryMenu(ctx context.Context) ([]models.Menu, error) {
	cursor, err := r.menuCol.Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var menus []models.Menu
	if err := cursor.All(ctx, &menus); err != nil {
		return nil, err
	}
	if menus == nil {
		menus = []models.Menu{}
	}
	return menus, nil
}

// GetMenuByID fetches a single menu document by its integer ID.
func (r *MenuRepository) GetMenuByID(ctx context.Context, id int) (*models.Menu, error) {
	var menu models.Menu
	if err := r.menuCol.FindOne(ctx, bson.M{"_id": id}).Decode(&menu); err != nil {
		return nil, err
	}
	return &menu, nil
}

// UpdateAvailableByID changes a menu item's available flag by its integer ID.
func (r *MenuRepository) UpdateAvailableByID(ctx context.Context, id int, available bool) (*models.Menu, error) {
	filter := bson.M{"_id": id}
	update := bson.M{"$set": bson.M{"available": available}}

	result, err := r.menuCol.UpdateOne(ctx, filter, update)
	if err != nil {
		return nil, err
	}
	if result.MatchedCount == 0 {
		return nil, mongo.ErrNoDocuments
	}

	return r.GetMenuByID(ctx, id)
}

// GetOptionGroupsWithOptions fetches option-group documents and their child
// options using only TWO database round-trips regardless of how many groups
// are requested — one $in on optionsGroups, one $in on options.
//
// The result preserves the order of groupIDs as they appear in the Menu.
func (r *MenuRepository) GetOptionGroupsWithOptions(
	ctx context.Context,
	groupIDs []int,
) ([]models.OptionGroupWithOptions, error) {

	if len(groupIDs) == 0 {
		return []models.OptionGroupWithOptions{}, nil
	}

	// ── Round-trip 1: fetch all matching groups ──────────────────────────────
	grpCursor, err := r.optGrpCol.Find(ctx, bson.M{"_id": bson.M{"$in": groupIDs}})
	if err != nil {
		return nil, err
	}
	var groups []models.OptionsGroup
	if err := grpCursor.All(ctx, &groups); err != nil {
		return nil, err
	}
	grpCursor.Close(ctx)

	// ── Round-trip 2: fetch all options that belong to any of these groups ───
	// The idx_options_groupId index makes this O(matched docs), not O(collection).
	optCursor, err := r.optCol.Find(ctx, bson.M{"groupId": bson.M{"$in": groupIDs}})
	if err != nil {
		return nil, err
	}
	var allOptions []models.Option
	if err := optCursor.All(ctx, &allOptions); err != nil {
		return nil, err
	}
	optCursor.Close(ctx)

	// ── In-memory assembly ───────────────────────────────────────────────────
	// Build lookup maps so the assembly loop is O(n), not O(n²).
	groupMap := make(map[int]models.OptionsGroup, len(groups))
	for _, g := range groups {
		groupMap[g.ID] = g
	}

	optsByGroup := make(map[int][]models.Option)
	for _, opt := range allOptions {
		optsByGroup[opt.GroupID] = append(optsByGroup[opt.GroupID], opt)
	}

	// Walk the original groupIDs order to preserve the Menu's intended sequence.
	result := make([]models.OptionGroupWithOptions, 0, len(groupIDs))
	for _, gid := range groupIDs {
		g, ok := groupMap[gid]
		if !ok {
			continue // group missing in DB — skip gracefully
		}
		opts := optsByGroup[gid]
		if opts == nil {
			opts = []models.Option{}
		}
		result = append(result, models.OptionGroupWithOptions{
			ID:      g.ID,
			Detail:  g.Detail,
			Options: opts,
		})
	}

	return result, nil
}
