/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
export const up = (pgm) => {
	pgm.createTable('service_piece', {
		id_service: {
			type: 'integer',
			notNull: true,
			references: 'service_fiscal(id_service)',
					onDelete: 'CASCADE'
		},
		
		id_type_piece: {
			type: 'uuid',
			notNull: true,
			references: 'type_piece(id_type_piece)',
					onDelete: 'RESTRICT'
		},
		
		obligatoire: {
			type: 'boolean',
			notNull: true,
			default: true
		}
	})
	
	// Clé primaire composée
	pgm.addConstraint(
		'service_piece',
		'pk_service_piece',
		{
			primaryKey: ['id_service', 'id_type_piece']
		}
	)
}

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
export const down = (pgm) => {
	pgm.dropTable('service_piece')
}
