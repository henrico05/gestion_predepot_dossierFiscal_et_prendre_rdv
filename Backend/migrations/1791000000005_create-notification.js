```javascript
export const up = (pgm) => {
	pgm.createTable("notification", {
		id_notification: {
			type: "serial",
			primaryKey: true,
		},
		type_notification: {
			type: "varchar(50)",
					notNull: true,
		},
		contenu: {
			type: "text",
			notNull: true,
		},
		canal: {
			type: "varchar(20)",
					notNull: true,
		},
		date_creation: {
			type: "timestamp",
			notNull: true,
			default: pgm.func("now()"),
		},
		date_envoi: {
			type: "timestamp",
		},
		statut_envoi: {
			type: "varchar(20)",
					notNull: true,
			default: "ENVOYE",
		},
		id_contribuable: {
			type: "integer",
			notNull: true,
			references: "contribuable(id_contribuable)",
					onDelete: "CASCADE",
		},
	});
};

export const down = (pgm) => {
	pgm.dropTable("notification");
};
```
