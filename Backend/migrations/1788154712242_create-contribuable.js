export const up = (pgm) => {
	pgm.createTable('contribuable', {
		id_contribuable: {
			type: 'serial',
			primaryKey: true
		},
		
		nif: {
			type: 'varchar(20)',
					notNull: true,
					unique: true
		},
		
		nom: {
			type: 'varchar(100)',
					notNull: true
		},
		
		prenom: {
			type: 'varchar(100)'
		},
		
		email: {
			type: 'varchar(255)',
					unique: true
		},
		
		telephone: {
			type: 'varchar(30)'
		},
		
		adresse: {
			type: 'text'
		},
		
		mot_de_passe: {
			type: 'text'
		},
		
		actif: {
			type: 'boolean',
			notNull: true,
			default: true
		},
		
		date_creation: {
			type: 'timestamp',
			notNull: true,
			default: pgm.func('CURRENT_TIMESTAMP')
		}
	})
}

export const down = (pgm) => {
	pgm.dropTable('contribuable')
}
