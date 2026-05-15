package repository

import (
	"context"

	"bar-pos-backend/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
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
	cursor, err := r.menuCol.Find(ctx, bson.M{
		"available": true,
		"archived":  bson.M{"$ne": true},
	})
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
	cursor, err := r.menuCol.Find(ctx, bson.M{"archived": bson.M{"$ne": true}})
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

// CreateMenu inserts a new menu document.
func (r *MenuRepository) CreateMenu(ctx context.Context, menu models.Menu) (*models.Menu, error) {
	if menu.ID == 0 {
		nextID, err := r.NextMenuID(ctx)
		if err != nil {
			return nil, err
		}
		menu.ID = nextID
	}
	menu.Archived = false

	if _, err := r.menuCol.InsertOne(ctx, menu); err != nil {
		return nil, err
	}
	return &menu, nil
}

// UpdateMenuByID replaces the editable menu fields while preserving the ID.
func (r *MenuRepository) UpdateMenuByID(ctx context.Context, id int, menu models.Menu) (*models.Menu, error) {
	filter := bson.M{"_id": id, "archived": bson.M{"$ne": true}}
	update := bson.M{"$set": bson.M{
		"name":        menu.Name,
		"description": menu.Description,
		"basePrice":   menu.BasePrice,
		"url":         menu.Url,
		"category":    menu.Category,
		"options":     menu.Options,
		"available":   menu.Available,
	}}

	result, err := r.menuCol.UpdateOne(ctx, filter, update)
	if err != nil {
		return nil, err
	}
	if result.MatchedCount == 0 {
		return nil, mongo.ErrNoDocuments
	}

	return r.GetMenuByID(ctx, id)
}

// ArchiveMenuByID hides a menu item from store/customer lists without deleting
// the document, so old bill history can still enrich orders by menu ID.
func (r *MenuRepository) ArchiveMenuByID(ctx context.Context, id int) (*models.Menu, error) {
	filter := bson.M{"_id": id, "archived": bson.M{"$ne": true}}
	update := bson.M{"$set": bson.M{"archived": true, "available": false}}

	result, err := r.menuCol.UpdateOne(ctx, filter, update)
	if err != nil {
		return nil, err
	}
	if result.MatchedCount == 0 {
		return nil, mongo.ErrNoDocuments
	}

	return r.GetMenuByID(ctx, id)
}

// FindMenuByName returns a non-archived menu whose name matches exactly under
// the provided collation.
func (r *MenuRepository) FindMenuByName(ctx context.Context, name string) (*models.Menu, error) {
	findOptions := options.FindOne().SetCollation(&options.Collation{
		Locale:   "en",
		Strength: 2,
	})

	var menu models.Menu
	err := r.menuCol.FindOne(ctx, bson.M{
		"name":     name,
		"archived": bson.M{"$ne": true},
	}, findOptions).Decode(&menu)
	if err != nil {
		return nil, err
	}
	return &menu, nil
}

// NextMenuID returns the next integer ID after the largest current menu _id.
func (r *MenuRepository) NextMenuID(ctx context.Context) (int, error) {
	findOptions := options.FindOne().
		SetSort(bson.D{{Key: "_id", Value: -1}}).
		SetProjection(bson.M{"_id": 1})

	var menu models.Menu
	err := r.menuCol.FindOne(ctx, bson.M{}, findOptions).Decode(&menu)
	if err == mongo.ErrNoDocuments {
		return 1, nil
	}
	if err != nil {
		return 0, err
	}
	return menu.ID + 1, nil
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
	filter := bson.M{"_id": id, "archived": bson.M{"$ne": true}}
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
