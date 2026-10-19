```javascript
export const up = (pgm) => {
	pgm.createTable(
		"rdv_rappel",
		{
			id_rdv: {
				type: "integer",
				notNull: true,
				references: "rendez_vous(id_rdv)",
					onDelete: "CASCADE",
			},
			type_rappel: {
				type: "varchar(8)",
					notNull: true,
			},
			envoye_at: {
				type: "timestamp",
				 notNull: true,
				 default: pgm.func("now()"),
			},
		},
		{
			constraints: {
				primaryKey: ["id_rdv", "type_rappel"],
			},
		}
	);
};

export const down = (pgm) => {
	pgm.dropTable("rdv_rappel");
};
```
