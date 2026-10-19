
exports.up = (pgm) => {
  pgm.sql(`
    CREATE OR REPLACE FUNCTION public.verifier_agent_piece()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $function$
    DECLARE
      role_agent VARCHAR(50);
    BEGIN
      IF NEW.id_agent_verificateur IS NOT NULL THEN
        SELECT role
        INTO role_agent
        FROM public.agents
        WHERE id = NEW.id_agent_verificateur;

        IF role_agent IS NULL THEN
          RAISE EXCEPTION
            'Agent vérificateur introuvable : %.',
            NEW.id_agent_verificateur
            USING ERRCODE = 'P0001';
        END IF;

        IF role_agent NOT IN ('VERIFICATEUR', 'CHEF_CENTRE') THEN
          RAISE EXCEPTION
            'L''agent % n''est pas autorisé à vérifier une pièce justificative.',
            NEW.id_agent_verificateur
            USING ERRCODE = 'P0001';
        END IF;
      END IF;

      RETURN NEW;
    END;
    $function$;

    CREATE TABLE public.piece_justificative (
      id_piece BIGSERIAL PRIMARY KEY,
      nom_fichier VARCHAR(255) NOT NULL,
      type_mime VARCHAR(100),
      chemin_stockage TEXT NOT NULL,
      taille_fichier BIGINT,
      date_upload TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      statut_verification VARCHAR(30) NOT NULL DEFAULT 'EN_ATTENTE',
      empreinte_hash VARCHAR(255),
      date_verification TIMESTAMP,
      commentaire_verification TEXT,
      id_dossier BIGINT NOT NULL,
      id_agent_verificateur UUID,
      id_type_piece UUID NOT NULL,

      CONSTRAINT fk_piece_agent
        FOREIGN KEY (id_agent_verificateur)
        REFERENCES public.agents(id)
        ON DELETE SET NULL,

      CONSTRAINT fk_piece_dossier
        FOREIGN KEY (id_dossier)
        REFERENCES public.dossier_fiscal(id_dossier)
        ON DELETE CASCADE,

      CONSTRAINT fk_piece_type
        FOREIGN KEY (id_type_piece)
        REFERENCES public.type_piece(id_type_piece)
    );

    CREATE TRIGGER trg_verifier_agent_piece
    BEFORE INSERT OR UPDATE OF id_agent_verificateur
    ON public.piece_justificative
    FOR EACH ROW
    EXECUTE FUNCTION public.verifier_agent_piece();
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS public.piece_justificative;
    DROP FUNCTION IF EXISTS public.verifier_agent_piece();
  `);
};
