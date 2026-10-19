
exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE public.dossier_fiscal (
      id_dossier BIGSERIAL PRIMARY KEY,
      reference_dossier VARCHAR(50) NOT NULL UNIQUE,
      date_predepot TIMESTAMP NOT NULL DEFAULT NOW(),
      statut_dossier VARCHAR(30) NOT NULL DEFAULT 'BROUILLON',
      id_contribuable BIGINT NOT NULL,
      id_service BIGINT NOT NULL,
      id_rdv INTEGER
    );

    CREATE INDEX idx_dossier_predepot_statut
      ON public.dossier_fiscal (date_predepot, statut_dossier);

    ALTER TABLE public.dossier_fiscal
      ADD CONSTRAINT fk_dossier_contribuable
      FOREIGN KEY (id_contribuable)
      REFERENCES public.contribuable(id_contribuable);

    ALTER TABLE public.dossier_fiscal
      ADD CONSTRAINT fk_dossier_rdv
      FOREIGN KEY (id_rdv)
      REFERENCES public.rendez_vous(id_rdv);

    ALTER TABLE public.dossier_fiscal
      ADD CONSTRAINT fk_dossier_service
      FOREIGN KEY (id_service)
      REFERENCES public.service_fiscal(id_service);
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP TABLE public.dossier_fiscal;');
};
