export const up = (pgm) => {
	pgm.createTable('affectation_guichet', {
		id_affectation: {
			type: 'uuid',
			primaryKey: true,
			default: pgm.func('uuid_generate_v4()'),
		},
		
		id_agent: {
			type: 'uuid',
			notNull: true,
			references: 'agents(id)',
					onDelete: 'RESTRICT',
		},
		
		id_guichet: {
			type: 'uuid',
			notNull: true,
			references: 'guichet(id_guichet)',
					onDelete: 'RESTRICT',
		},
		
		date_debut: {
			type: 'timestamp',
			notNull: true,
			default: pgm.func('NOW()'),
		},
		
		date_fin: {
			type: 'timestamp',
		},
	})
	
	pgm.sql(`
	CREATE UNIQUE INDEX uq_affectation_agent_active
	ON affectation_guichet (id_agent)
	WHERE date_fin IS NULL
	`)
	
	pgm.sql(`
	CREATE UNIQUE INDEX uq_affectation_guichet_active
	ON affectation_guichet (id_guichet)
	WHERE date_fin IS NULL
	`)
	
	pgm.createIndex(
		'affectation_guichet',
		['id_agent']
	)
	
	pgm.createIndex(
		'affectation_guichet',
		['id_guichet']
	)
}

export const down = (pgm) => {
	pgm.dropTable('affectation_guichet')
}
