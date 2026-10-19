```javascript
export const up = (pgm) => {
	pgm.createTable("journal_audit", {
		id_audit: {
			type: "bigserial",
			primaryKey: true,
		},
		type_acteur: {
			type: "varchar(30)",
					notNull: true,
		},
		id_acteur: {
			type: "varchar(100)",
					notNull: true,
		},
		action: {
			type: "varchar(100)",
					notNull: true,
		},
		table_cible: {
			type: "varchar(100)",
					notNull: true,
		},
		id_cible: {
			type: "varchar(100)",
					notNull: true,
		},
		date_action: {
			type: "timestamp",
			notNull: true,
			default: pgm.func("now()"),
		},
		details_json: {
			type: "jsonb",
		},
	});
};

export const down = (pgm) => {
	pgm.dropTable("journal_audit");
};
```
