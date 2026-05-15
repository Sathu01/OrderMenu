package models

import "time"

// ─── MongoDB Collection Documents ───────────────────────────────────────────

// Table represents a physical table / seat in the bar.
type Table struct {
	ID   string `bson:"_id"  json:"id"`
	Name string `bson:"name" json:"name"`
}

// OptionsGroup is a category header for a set of modifier options
// (e.g. "Size / Volume", "Add-ons / Extras").
type OptionsGroup struct {
	ID     int    `bson:"_id"    json:"id"`
	Detail string `bson:"detail" json:"detail"`
}

// Option is a single modifier that a customer can add to a menu item.
type Option struct {
	ID      string  `bson:"_id"     json:"id"`
	Name    string  `bson:"name"    json:"name"`
	Price   float64 `bson:"price"   json:"price"`
	GroupID int     `bson:"groupId" json:"groupId"`
}

// Menu is a single item on the drink / food menu.
// Options holds a slice of OptionsGroup IDs (not Option IDs).
type Menu struct {
	ID          int     `bson:"_id"         json:"id"`
	Name        string  `bson:"name"        json:"name"`
	Description string  `bson:"description" json:"description"`
	BasePrice   float64 `bson:"basePrice"   json:"basePrice"`
	Url         string  `bson:"url"         json:"url"`
	Category    string  `bson:"category"    json:"category"`
	Options     []int   `bson:"options"     json:"options"` // OptionsGroup IDs
	Available   bool    `bson:"available"   json:"available"`
	Archived    bool    `bson:"archived,omitempty" json:"archived,omitempty"`
}

// Bill tracks an open "tab" for a table.
// Status lifecycle:  pending → processing → paid
type Bill struct {
	ID         string    `bson:"_id"        json:"id"`
	CreateDate time.Time `bson:"createDate" json:"createDate"`
	TableID    string    `bson:"tableid"    json:"tableId"`
	Status     string    `bson:"status"     json:"status"` // "pending" | "processing" | "paid"
}

// Order is a single line-item inside a bill.
type Order struct {
	ID        string   `bson:"_id"       json:"id"`
	MenuID    int      `bson:"menuId"    json:"menuId"`
	OptionIDs []string `bson:"optionIds" json:"optionIds"`
	BillsID   string   `bson:"billsId"   json:"billsId"`
	Count     int      `bson:"count"     json:"count"`
}

// ─── Bill Status Constants ───────────────────────────────────────────────────

const (
	BillStatusPending    = "pending"
	BillStatusProcessing = "processing"
	BillStatusPaid       = "paid"
)

// ─── API Response Shapes ────────────────────────────────────────────────────

// OptionGroupWithOptions is the response for GET /menu/:id.
// It nests the actual Option documents inside their group.
type OptionGroupWithOptions struct {
	ID      int      `json:"id"`
	Detail  string   `json:"detail"`
	Options []Option `json:"options"`
}

// OrderWithDetails is one line-item enriched with full Option objects
// (instead of raw option ID strings) and menu name.
type OrderWithDetails struct {
	ID        string   `json:"id"`
	MenuID    int      `json:"menuId"`
	MenuName  string   `json:"menuName"`
	BasePrice float64  `json:"basePrice"`
	Options   []Option `json:"options"`
	BillsID   string   `json:"billsId"`
	Count     int      `json:"count"`
}

// BillDetailsResponse is the response for GET /bills/:id.
type BillDetailsResponse struct {
	Bill   Bill               `json:"bill"`
	Orders []OrderWithDetails `json:"orders"`
}
