/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
export const up = (pgm) => {
	pgm.createTable('service_fiscal', {
		id_service: {
			type: 'serial',
			primaryKey: true
		},
		
		libelle_service: {
			type: 'varchar(255)',
					notNull: true
		},
		
		description: {
			type: 'text'
		},
		
		duree_estimee_min: {
			type: 'integer',
			notNull: true,
			default: 15
		},
		
		actif: {
			type: 'boolean',
			notNull: true,
			default: true
		}
	})
}

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
export const down = (pgm) => {
	pgm.dropTable('service_fiscal')
}
