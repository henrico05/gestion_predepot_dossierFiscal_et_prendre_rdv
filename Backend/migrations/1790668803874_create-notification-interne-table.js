/**
 * @type {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
	pgm.sql(`
	CREATE TABLE IF NOT EXISTS notification_interne (
		id_notification    SERIAL PRIMARY KEY,
		type_notification  VARCHAR(80)  NOT NULL,
													 contenu            TEXT         NOT NULL,
												  type_acteur        VARCHAR(30)  NOT NULL,  -- CONTRIBUABLE | AGENT | SYSTEME
												  id_acteur          VARCHAR(80),
													 nom_acteur         VARCHAR(160),
													 action             VARCHAR(80),
													 table_cible        VARCHAR(80),
													 id_cible           VARCHAR(80),
													 details_json       JSONB,
												  lu                 BOOLEAN      DEFAULT FALSE,
												  date_creation      TIMESTAMPTZ  DEFAULT NOW()
	);
	`);
};

exports.down = (pgm) => {
	pgm.sql(`
	DROP TABLE IF EXISTS notification_interne;
	`);
};
