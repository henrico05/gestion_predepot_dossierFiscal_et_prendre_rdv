export const up = (pgm) => {
	pgm.createTable('rendez_vous', {
		id_rdv: {
			type: 'serial',
			primaryKey: true
		},
		
		date_rdv: {
			type: 'date',
			notNull: true
		},
		
		heure_rdv: {
			type: 'time',
			notNull: true
		},
		
		statut_rdv: {
			type: 'varchar(30)',
					notNull: true,
					default: 'EN_ATTENTE'
		},
		
		canal_creation: {
			type: 'varchar(30)',
					notNull: true,
					default: 'PORTAIL'
		},
		
		date_creation: {
			type: 'timestamp',
			notNull: true,
					default: pgm.func('CURRENT_TIMESTAMP')
		},
		
		commentaire: {
			type: 'text'
		},
		
		id_contribuable: {
			type: 'integer',
			notNull: true,
			references: 'contribuable(id_contribuable)',
					onDelete: 'RESTRICT'
		},
		
		id_service: {
			type: 'integer',
			notNull: true,
			references: 'service_fiscal(id_service)',
					onDelete: 'RESTRICT'
		}
	})
	
	// Empêcher deux rendez-vous pour le même service,
	// à la même date et à la même heure.
	pgm.addConstraint(
		'rendez_vous',
		'rendez_vous_date_heure_service_unique',
		{
			unique: ['date_rdv', 'heure_rdv', 'id_service']
		}
	)
	
	pgm.createIndex(
		'rendez_vous',
		['id_contribuable']
	)
	
	pgm.createIndex(
		'rendez_vous',
		['id_service']
	)
	
	pgm.createIndex(
		'rendez_vous',
		['date_rdv']
	)
}

export const down = (pgm) => {
	pgm.dropTable('rendez_vous')
}
