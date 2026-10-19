
exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE public.type_piece (
      id_type_piece UUID NOT NULL DEFAULT gen_random_uuid(),
      libelle VARCHAR(150) NOT NULL,
      description TEXT,
      actif BOOLEAN NOT NULL DEFAULT TRUE,
      multiple BOOLEAN NOT NULL DEFAULT FALSE,

      CONSTRAINT type_piece_pkey
        PRIMARY KEY (id_type_piece),

      CONSTRAINT type_piece_libelle_key
        UNIQUE (libelle)
    );
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TABLE public.type_piece;
  `);
};
