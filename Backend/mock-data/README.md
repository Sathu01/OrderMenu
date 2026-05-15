# Mock Menu Data

These files match the backend model structs in `Backend/models/models.go`.

Frontend menu categories are fixed to:

- `Beverage`
- `Snack`

Files:

- `bar_pos_system.menus.mock.json` -> MongoDB collection `menus`
- `bar_pos_system.optionsGroups.mock.json` -> MongoDB collection `optionsGroups`
- `bar_pos_system.options.mock.json` -> MongoDB collection `options`

Import with MongoDB running locally:

```bash
mongoimport --db bar_pos_system --collection optionsGroups --file Backend/mock-data/bar_pos_system.optionsGroups.mock.json --jsonArray --drop
mongoimport --db bar_pos_system --collection options --file Backend/mock-data/bar_pos_system.options.mock.json --jsonArray --drop
mongoimport --db bar_pos_system --collection menus --file Backend/mock-data/bar_pos_system.menus.mock.json --jsonArray --drop
```

Import order matters: option groups first, options second, menus last.
