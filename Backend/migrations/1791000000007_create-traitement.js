```javascript
export const up = (pgm) => {
	pgm.createTable("traitement", {
		id_traitement: {
			type: "bigserial",
			primaryKey: true,
		},
		date_traitement: {
			type: "timestamp",
			notNull: true,
			default: pgm.func("CURRENT_TIMESTAMP"),
		},
		decision: {
			type: "varchar(50)",
		},
		commentaire_agent: {
			type: "text",
		},
		id_agent: {
			type: "uuid",
			notNull: true,
			references: "agents(id)",
					onDelete: "RESTRICT",
		},
		id_dossier: {
			type: "bigint",
			notNull: true,
			references: "dossier_fiscal(id_dossier)",
		},
	});
};

export const down = (pgm) => {
	pgm.dropTable("traitement");
};
```
