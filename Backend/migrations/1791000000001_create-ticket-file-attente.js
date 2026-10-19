
exports.up = (pgm) => {
  pgm.sql(`
  CREATE TABLE public.ticket_file_attente (
    id_ticket BIGSERIAL PRIMARY KEY,
    numero_ticket VARCHAR(20) NOT NULL,
                                           date_emission DATE NOT NULL DEFAULT CURRENT_DATE,
                                           heure_arrivee TIME,
                                           heure_appel TIME,
                                           heure_fin TIME,
                                           statut_ticket VARCHAR(30) NOT NULL DEFAULT 'EN_ATTENTE',
                                           nom_visiteur VARCHAR(200),
                                           motif_visite TEXT,
                                           id_contribuable BIGINT,
                                           id_rdv BIGINT,
                                           id_agent UUID,
                                           id_guichet UUID,
                                           date_file DATE,
                                           id_local TEXT,
                                           
                                           CONSTRAINT chk_statut_ticket
                                           CHECK (statut_ticket IN (
                                             'RESERVE',
                                             'EN_ATTENTE',
                                             'APPELE',
                                             'EN_COURS',
                                             'TERMINE',
                                             'ABSENT',
                                             'ANNULE'
                                           )),
                                           
                                           CONSTRAINT ticket_file_attente_id_local_key
                                           UNIQUE (id_local),
                                           
                                           CONSTRAINT uq_ticket_numero_file
                                           UNIQUE (date_file, numero_ticket),
                                           
                                           CONSTRAINT uq_ticket_numero_jour
                                           UNIQUE (date_file, numero_ticket),
                                           
                                           CONSTRAINT fk_ticket_agent
                                           FOREIGN KEY (id_agent)
                                           REFERENCES public.agents(id)
                                           ON DELETE SET NULL,
                                           
                                           CONSTRAINT fk_ticket_contribuable
                                           FOREIGN KEY (id_contribuable)
                                           REFERENCES public.contribuable(id_contribuable)
                                           ON DELETE SET NULL,
                                           
                                           CONSTRAINT fk_ticket_guichet
                                           FOREIGN KEY (id_guichet)
                                           REFERENCES public.guichet(id_guichet)
                                           ON DELETE SET NULL,
                                           
                                           CONSTRAINT fk_ticket_rdv
                                           FOREIGN KEY (id_rdv)
                                           REFERENCES public.rendez_vous(id_rdv)
                                           ON DELETE SET NULL
  );
  
  CREATE INDEX idx_ticket_date_agent
  ON public.ticket_file_attente (date_file, id_agent);
  
  CREATE INDEX idx_ticket_date_statut
  ON public.ticket_file_attente (date_file, statut_ticket);
  
  CREATE INDEX ticket_file_attente_id_local_index
  ON public.ticket_file_attente (id_local)
  WHERE id_local IS NOT NULL;
  
  CREATE OR REPLACE FUNCTION public.generer_numero_ticket(p_date DATE)
  RETURNS VARCHAR
  LANGUAGE plpgsql
  AS $function$
  DECLARE
  i INTEGER;
  numero VARCHAR(20);
  BEGIN
  FOR i IN 1..50 LOOP
  numero := 'A-' || LPAD(i::TEXT, 3, '0');
  
  IF NOT EXISTS (
    SELECT 1
    FROM public.ticket_file_attente
    WHERE date_file = p_date
    AND numero_ticket = numero
  ) THEN
  RETURN numero;
  END IF;
  END LOOP;
  
  RAISE EXCEPTION
  'La file d''attente est complète pour le % (A-001 à A-050).',
          p_date;
          END;
          $function$;
          `);
};

exports.down = (pgm) => {
  pgm.sql(`
  DROP TABLE IF EXISTS public.ticket_file_attente;
  DROP FUNCTION IF EXISTS public.generer_numero_ticket(DATE);
  `);
};
