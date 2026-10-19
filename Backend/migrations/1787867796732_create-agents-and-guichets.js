/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
	
	// =====================================================
	// EXTENSION UUID
	// =====================================================
	
	pgm.sql(`
	CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
	`);
	
	
	// =====================================================
	// TABLE GUICHET
	// =====================================================
	
	pgm.createTable('guichet', {
		
		id_guichet: {
			type: 'uuid',
			primaryKey: true,
			default: pgm.func('uuid_generate_v4()'),
		},
		
		numero_guichet: {
			type: 'varchar(20)',
					notNull: true,
					unique: true,
		},
		
		libelle: {
			type: 'varchar(100)',
					notNull: true,
		},
		
		etat_guichet: {
			type: 'varchar(20)',
					notNull: true,
			default: 'FERME',
		},
	});
	
	
	// =====================================================
	// CONTRAINTE ETAT GUICHET
	// =====================================================
	
	pgm.addConstraint(
		'guichet',
		'guichet_etat_check',
		{
			check: `
			etat_guichet IN (
				'OUVERT',
				'FERME',
				'EN_PAUSE',
				'MAINTENANCE'
			)
			`,
		}
	);
	
	
	// =====================================================
	// TABLE AGENTS
	// =====================================================
	
	pgm.createTable('agents', {
		
		id: {
			type: 'uuid',
			primaryKey: true,
			default: pgm.func('uuid_generate_v4()'),
		},
		
		nom: {
			type: 'varchar(100)',
					notNull: true,
		},
		
		prenom: {
			type: 'varchar(100)',
					notNull: true,
		},
		
		matricule: {
			type: 'varchar(50)',
					notNull: true,
					unique: true,
		},
		
		email: {
			type: 'varchar(150)',
					notNull: true,
					unique: true,
		},
		
		password_hash: {
			type: 'text',
			notNull: true,
		},
		
		role: {
			type: 'varchar(30)',
					notNull: true,
		},
		
		id_guichet: {
			type: 'uuid',
			references: 'guichet(id_guichet)',
					onDelete: 'SET NULL',
				 onUpdate: 'CASCADE',
		},
		
		photo_base64: {
			type: 'text',
		},
		
		photo_content_type: {
			type: 'varchar(50)',
		},
		
		email_verified: {
			type: 'boolean',
			notNull: true,
			default: false,
		},
		
		email_token: {
			type: 'varchar(255)',
		},
		
		email_token_expires: {
			type: 'timestamptz',
		},
		
		admin_status: {
			type: 'varchar(20)',
					notNull: true,
			default: 'pending',
		},
		
		admin_comment: {
			type: 'text',
		},
		
		reviewed_by: {
			type: 'uuid',
		},
		
		reviewed_at: {
			type: 'timestamptz',
		},
		
		is_active: {
			type: 'boolean',
			notNull: true,
			default: true,
		},
		
		last_login: {
			type: 'timestamptz',
		},
		
		created_at: {
			type: 'timestamptz',
			notNull: true,
			default: pgm.func('NOW()'),
		},
		
		updated_at: {
			type: 'timestamptz',
			notNull: true,
			default: pgm.func('NOW()'),
		},
	});
	
	
	// =====================================================
	// CONTRAINTE ROLE
	// =====================================================
	
	pgm.addConstraint(
		'agents',
		'agents_role_check',
		{
			check: `
			role IN (
				'VERIFICATEUR',
			'GUICHETIER',
			'CHEF_CENTRE'
			)
			`,
		}
	);
	
	
	// =====================================================
	// CONTRAINTE ADMIN STATUS
	// =====================================================
	
	pgm.addConstraint(
		'agents',
		'agents_admin_status_check',
		{
			check: `
			admin_status IN (
				'pending',
				'approved',
				'rejected'
			)
			`,
		}
	);
	
	
	// =====================================================
	// CONTRAINTE EMAIL
	// =====================================================
	
	pgm.addConstraint(
		'agents',
		'agents_email_check',
		{
			check: `position('@' in email) > 1`,
		}
	);
	
	
	// =====================================================
	// INDEX
	// =====================================================
	
	pgm.createIndex(
		'agents',
		'admin_status',
		{
			name: 'idx_agents_admin_status',
		}
	);
	
	pgm.createIndex(
		'agents',
		'role',
		{
			name: 'idx_agents_role',
		}
	);
	
	pgm.createIndex(
		'agents',
		'id_guichet',
		{
			name: 'idx_agents_guichet',
		}
	);
};


/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
	
	pgm.dropTable('agents', {
		cascade: true,
	});
	
	pgm.dropTable('guichet', {
		cascade: true,
	});
};
