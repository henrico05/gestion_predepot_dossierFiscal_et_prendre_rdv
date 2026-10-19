/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
	
	// =====================================================
	// TABLE COMMENTAIRE
	// =====================================================
	
	pgm.createTable('commentaire', {
		
		id_commentaire: {
			type: 'serial',
			primaryKey: true,
		},
		
		contenu: {
			type: 'text',
			notNull: true,
		},
		
		interne: {
			type: 'boolean',
			notNull: true,
			default: true,
		},
		
		date_creation: {
			type: 'timestamptz',
			notNull: true,
			default: pgm.func('NOW()'),
		},
		
		date_modification: {
			type: 'timestamptz',
		},
		
		// =================================================
		// RELATIONS
		// =================================================
		
		id_dossier: {
			type: 'integer',
			notNull: true,
			references: 'dossier_fiscal(id_dossier)',
					onDelete: 'CASCADE',
					onUpdate: 'CASCADE',
		},
		
		id_agent: {
			type: 'uuid',
			references: 'agents(id)',
					onDelete: 'SET NULL',
					onUpdate: 'CASCADE',
		},
		
		id_contribuable: {
			type: 'integer',
			references: 'contribuable(id_contribuable)',
					onDelete: 'SET NULL',
					onUpdate: 'CASCADE',
		},
		
		// =================================================
		// TYPE D'AUTEUR (dénormalisé pour requêtes rapides)
		// =================================================
		
		auteur_type: {
			type: 'varchar(20)',
					notNull: true,
		},
	});
	
	
	// =====================================================
	// CONTRAINTE : auteur_type
	// =====================================================
	
	pgm.addConstraint(
		'commentaire',
		'commentaire_auteur_type_check',
		{
			check: `
			auteur_type IN (
				'AGENT',
				'CONTRIBUABLE'
			)
			`,
		}
	);
	
	
	// =====================================================
	// CONTRAINTE : au moins un auteur (agent OU contribuable)
	// =====================================================
	
	pgm.addConstraint(
		'commentaire',
		'commentaire_auteur_check',
		{
			check: `
			(id_agent IS NOT NULL)
			OR
			(id_contribuable IS NOT NULL)
			`,
		}
	);
	
	
	// =====================================================
	// INDEX
	// =====================================================
	
	pgm.createIndex(
		'commentaire',
		'id_dossier',
		{
			name: 'idx_commentaire_dossier',
		}
	);
	
	pgm.createIndex(
		'commentaire',
		'date_creation',
		{
			name: 'idx_commentaire_date',
			method: 'btree',
		}
	);
	
	pgm.createIndex(
		'commentaire',
		'auteur_type',
		{
			name: 'idx_commentaire_auteur_type',
		}
	);
};


/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
	
	pgm.dropTable('commentaire', {
		cascade: true,
	});
};
