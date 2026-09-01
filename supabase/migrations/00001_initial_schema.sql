-- ============================================================================
-- BACKSTAGE — MIGRATION 00001: INITIAL SCHEMA & RLS POLICIES
-- Fuente de verdad: docs/spec.md y AGENTS.md
-- ============================================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. FUNCIÓN GENÉRICA PARA ACTUALIZAR updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. TABLA: profile_users (Perfiles de Usuario)
-- Extiende auth.users de Supabase
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profile_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('MUSICIAN', 'ORGANIZER')),
  avatar_url TEXT,
  bio TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profile_users_email ON public.profile_users(email);
CREATE INDEX IF NOT EXISTS idx_profile_users_role ON public.profile_users(role);

ALTER TABLE public.profile_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view profiles" ON public.profile_users;
CREATE POLICY "Public can view profiles"
  ON public.profile_users
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profile_users;
CREATE POLICY "Users can insert own profile"
  ON public.profile_users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profile_users;
CREATE POLICY "Users can update own profile"
  ON public.profile_users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can delete own profile" ON public.profile_users;
CREATE POLICY "Users can delete own profile"
  ON public.profile_users
  FOR DELETE
  USING (auth.uid() = id);

DROP TRIGGER IF EXISTS trigger_profile_users_updated_at ON public.profile_users;
CREATE TRIGGER trigger_profile_users_updated_at
BEFORE UPDATE ON public.profile_users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 3. TABLA: musical_projects (Proyectos Musicales)
-- Pertenece a un Músico
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.musical_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profile_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  genre TEXT NOT NULL,
  approximate_cache NUMERIC(12, 2) CHECK (approximate_cache IS NULL OR approximate_cache >= 0),
  location TEXT,
  city TEXT,
  image_url TEXT,
  spotify_url TEXT,
  youtube_url TEXT,
  instagram_url TEXT,
  website_url TEXT,
  custom_links JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_musical_projects_user_id ON public.musical_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_musical_projects_genre ON public.musical_projects(genre);
CREATE INDEX IF NOT EXISTS idx_musical_projects_is_active ON public.musical_projects(is_active);

-- Trigger para validar que el dueño sea un MUSICIAN
CREATE OR REPLACE FUNCTION public.check_project_owner_is_musician()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM public.profile_users WHERE id = NEW.user_id;
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'User does not exist in profile_users';
  END IF;
  IF v_role <> 'MUSICIAN' THEN
    RAISE EXCEPTION 'Only users with MUSICIAN role can create or own musical projects';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_musical_projects_check_musician ON public.musical_projects;
CREATE TRIGGER trigger_musical_projects_check_musician
BEFORE INSERT OR UPDATE OF user_id ON public.musical_projects
FOR EACH ROW
EXECUTE FUNCTION public.check_project_owner_is_musician();

DROP TRIGGER IF EXISTS trigger_musical_projects_updated_at ON public.musical_projects;
CREATE TRIGGER trigger_musical_projects_updated_at
BEFORE UPDATE ON public.musical_projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.musical_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active musical projects" ON public.musical_projects;
CREATE POLICY "Public can view active musical projects"
  ON public.musical_projects
  FOR SELECT
  USING (is_active = true OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Musicians can insert own musical projects" ON public.musical_projects;
CREATE POLICY "Musicians can insert own musical projects"
  ON public.musical_projects
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.profile_users
      WHERE id = auth.uid() AND role = 'MUSICIAN'
    )
  );

DROP POLICY IF EXISTS "Musicians can update own musical projects" ON public.musical_projects;
CREATE POLICY "Musicians can update own musical projects"
  ON public.musical_projects
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Musicians can delete own musical projects" ON public.musical_projects;
CREATE POLICY "Musicians can delete own musical projects"
  ON public.musical_projects
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 4. TABLA: events (Eventos)
-- Pertenece a un Organizador
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID NOT NULL REFERENCES public.profile_users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  location TEXT NOT NULL,
  venue_name TEXT,
  city TEXT,
  required_musicians_count INTEGER NOT NULL DEFAULT 1 CHECK (required_musicians_count > 0),
  offered_cache NUMERIC(12, 2) CHECK (offered_cache IS NULL OR offered_cache >= 0),
  status TEXT NOT NULL DEFAULT 'PUBLISHED' CHECK (status IN ('DRAFT', 'PUBLISHED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  banner_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON public.events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON public.events(event_date);

-- Trigger para validar que el creador sea un ORGANIZER
CREATE OR REPLACE FUNCTION public.check_event_owner_is_organizer()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM public.profile_users WHERE id = NEW.organizer_id;
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'User does not exist in profile_users';
  END IF;
  IF v_role <> 'ORGANIZER' THEN
    RAISE EXCEPTION 'Only users with ORGANIZER role can create or own events';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_events_check_organizer ON public.events;
CREATE TRIGGER trigger_events_check_organizer
BEFORE INSERT OR UPDATE OF organizer_id ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.check_event_owner_is_organizer();

DROP TRIGGER IF EXISTS trigger_events_updated_at ON public.events;
CREATE TRIGGER trigger_events_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published events" ON public.events;
CREATE POLICY "Public can view published events"
  ON public.events
  FOR SELECT
  USING (
    status IN ('PUBLISHED', 'IN_PROGRESS', 'COMPLETED') OR
    auth.uid() = organizer_id
  );

DROP POLICY IF EXISTS "Organizers can insert own events" ON public.events;
CREATE POLICY "Organizers can insert own events"
  ON public.events
  FOR INSERT
  WITH CHECK (
    auth.uid() = organizer_id AND
    EXISTS (
      SELECT 1 FROM public.profile_users
      WHERE id = auth.uid() AND role = 'ORGANIZER'
    )
  );

DROP POLICY IF EXISTS "Organizers can update own events" ON public.events;
CREATE POLICY "Organizers can update own events"
  ON public.events
  FOR UPDATE
  USING (auth.uid() = organizer_id)
  WITH CHECK (auth.uid() = organizer_id);

DROP POLICY IF EXISTS "Organizers can delete own events" ON public.events;
CREATE POLICY "Organizers can delete own events"
  ON public.events
  FOR DELETE
  USING (auth.uid() = organizer_id);

-- ============================================================================
-- 5. TABLA: contracts (Contrataciones)
-- Vincula Evento, Proyecto Musical, Organizador y Músico
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  musical_project_id UUID NOT NULL REFERENCES public.musical_projects(id) ON DELETE RESTRICT,
  organizer_id UUID NOT NULL REFERENCES public.profile_users(id) ON DELETE RESTRICT,
  musician_id UUID NOT NULL REFERENCES public.profile_users(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'NEGOTIATING', 'AGREED', 'CANCELLED', 'COMPLETED', 'REJECTED')),
  agreed_amount NUMERIC(12, 2) CHECK (agreed_amount IS NULL OR agreed_amount >= 0),
  agreed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_by UUID NOT NULL REFERENCES public.profile_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_contracts_event_project UNIQUE (event_id, musical_project_id),
  CONSTRAINT chk_contracts_agreed_fields CHECK (
    (status = 'AGREED' AND agreed_amount IS NOT NULL AND agreed_at IS NOT NULL) OR
    (status <> 'AGREED')
  )
);

CREATE INDEX IF NOT EXISTS idx_contracts_event_id ON public.contracts(event_id);
CREATE INDEX IF NOT EXISTS idx_contracts_musical_project_id ON public.contracts(musical_project_id);
CREATE INDEX IF NOT EXISTS idx_contracts_organizer_id ON public.contracts(organizer_id);
CREATE INDEX IF NOT EXISTS idx_contracts_musician_id ON public.contracts(musician_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.contracts(status);

-- Trigger para validar correspondencia de participantes
CREATE OR REPLACE FUNCTION public.validate_contract_participants()
RETURNS TRIGGER AS $$
DECLARE
  v_actual_organizer_id UUID;
  v_actual_musician_id UUID;
BEGIN
  -- Validar que organizer_id coincida con el organizador del evento
  SELECT organizer_id INTO v_actual_organizer_id FROM public.events WHERE id = NEW.event_id;
  IF v_actual_organizer_id IS NULL THEN
    RAISE EXCEPTION 'Event does not exist';
  END IF;
  IF NEW.organizer_id <> v_actual_organizer_id THEN
    RAISE EXCEPTION 'Contract organizer_id must match event organizer_id';
  END IF;

  -- Validar que musician_id coincida con el dueño del proyecto musical
  SELECT user_id INTO v_actual_musician_id FROM public.musical_projects WHERE id = NEW.musical_project_id;
  IF v_actual_musician_id IS NULL THEN
    RAISE EXCEPTION 'Musical project does not exist';
  END IF;
  IF NEW.musician_id <> v_actual_musician_id THEN
    RAISE EXCEPTION 'Contract musician_id must match musical project owner user_id';
  END IF;

  -- Validar que created_by sea una de las partes
  IF NEW.created_by <> NEW.organizer_id AND NEW.created_by <> NEW.musician_id THEN
    RAISE EXCEPTION 'Contract creator must be either the organizer or the musician';
  END IF;

  -- Si el contrato pasa a cancelado, registrar timestamp si no vino
  IF NEW.status = 'CANCELLED' AND (OLD IS NULL OR OLD.status <> 'CANCELLED') AND NEW.cancelled_at IS NULL THEN
    NEW.cancelled_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_contracts_validate_participants ON public.contracts;
CREATE TRIGGER trigger_contracts_validate_participants
BEFORE INSERT OR UPDATE ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION public.validate_contract_participants();

DROP TRIGGER IF EXISTS trigger_contracts_updated_at ON public.contracts;
CREATE TRIGGER trigger_contracts_updated_at
BEFORE UPDATE ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view contracts" ON public.contracts;
CREATE POLICY "Participants can view contracts"
  ON public.contracts
  FOR SELECT
  USING (
    auth.uid() = organizer_id OR
    auth.uid() = musician_id
  );

DROP POLICY IF EXISTS "Participants can insert contracts" ON public.contracts;
CREATE POLICY "Participants can insert contracts"
  ON public.contracts
  FOR INSERT
  WITH CHECK (
    (auth.uid() = organizer_id OR auth.uid() = musician_id) AND
    auth.uid() = created_by
  );

DROP POLICY IF EXISTS "Participants can update contracts" ON public.contracts;
CREATE POLICY "Participants can update contracts"
  ON public.contracts
  FOR UPDATE
  USING (auth.uid() = organizer_id OR auth.uid() = musician_id)
  WITH CHECK (auth.uid() = organizer_id OR auth.uid() = musician_id);

-- ============================================================================
-- 6. TABLA: offers (Ofertas y Contraofertas)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profile_users(id) ON DELETE RESTRICT,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  message TEXT,
  status TEXT NOT NULL DEFAULT 'PROPOSED' CHECK (status IN ('PROPOSED', 'ACCEPTED', 'REJECTED', 'COUNTERED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offers_contract_id ON public.offers(contract_id);
CREATE INDEX IF NOT EXISTS idx_offers_sender_id ON public.offers(sender_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON public.offers(status);
CREATE INDEX IF NOT EXISTS idx_offers_created_at ON public.offers(created_at);

-- Trigger para validar reglas de negocio en ofertas
CREATE OR REPLACE FUNCTION public.validate_offer_rules()
RETURNS TRIGGER AS $$
DECLARE
  v_contract RECORD;
BEGIN
  SELECT * INTO v_contract FROM public.contracts WHERE id = NEW.contract_id;
  IF v_contract IS NULL THEN
    RAISE EXCEPTION 'Contract does not exist';
  END IF;

  -- 1. Validar que el remitente sea participante del contrato
  IF NEW.sender_id <> v_contract.organizer_id AND NEW.sender_id <> v_contract.musician_id THEN
    RAISE EXCEPTION 'Offer sender must be a participant in the contract';
  END IF;

  -- 2. En INSERT: No permitir ofertas en contratos cerrados, cancelados o acordados
  IF TG_OP = 'INSERT' THEN
    IF v_contract.status IN ('AGREED', 'CANCELLED', 'COMPLETED', 'REJECTED') THEN
      RAISE EXCEPTION 'Cannot create an offer on a contract with status %', v_contract.status;
    END IF;

    -- Si había ofertas previas en estado PROPOSED, pasan a COUNTERED
    UPDATE public.offers
    SET status = 'COUNTERED', updated_at = NOW()
    WHERE contract_id = NEW.contract_id
      AND status = 'PROPOSED'
      AND id <> NEW.id;

    -- Si el contrato estaba en PENDING, avanza a NEGOTIATING
    IF v_contract.status = 'PENDING' THEN
      UPDATE public.contracts
      SET status = 'NEGOTIATING', updated_at = NOW()
      WHERE id = NEW.contract_id;
    END IF;
  END IF;

  -- 3. En UPDATE hacia ACCEPTED:
  IF TG_OP = 'UPDATE' AND NEW.status = 'ACCEPTED' AND OLD.status <> 'ACCEPTED' THEN
    IF v_contract.status IN ('CANCELLED', 'COMPLETED', 'REJECTED') THEN
      RAISE EXCEPTION 'Cannot accept an offer on a closed or cancelled contract';
    END IF;

    -- Actualizar contrato a AGREED con monto pactado definitivo
    UPDATE public.contracts
    SET status = 'AGREED',
        agreed_amount = NEW.amount,
        agreed_at = NOW(),
        updated_at = NOW()
    WHERE id = NEW.contract_id;

    -- Marcar las demás ofertas pendientes como REJECTED
    UPDATE public.offers
    SET status = 'REJECTED', updated_at = NOW()
    WHERE contract_id = NEW.contract_id
      AND id <> NEW.id
      AND status = 'PROPOSED';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_offers_validate ON public.offers;
CREATE TRIGGER trigger_offers_validate
BEFORE INSERT OR UPDATE ON public.offers
FOR EACH ROW
EXECUTE FUNCTION public.validate_offer_rules();

DROP TRIGGER IF EXISTS trigger_offers_updated_at ON public.offers;
CREATE TRIGGER trigger_offers_updated_at
BEFORE UPDATE ON public.offers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Contract participants can view offers" ON public.offers;
CREATE POLICY "Contract participants can view offers"
  ON public.offers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_id AND
      (c.organizer_id = auth.uid() OR c.musician_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Contract participants can insert offers" ON public.offers;
CREATE POLICY "Contract participants can insert offers"
  ON public.offers
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_id AND
      (c.organizer_id = auth.uid() OR c.musician_id = auth.uid()) AND
      c.status IN ('PENDING', 'NEGOTIATING')
    )
  );

DROP POLICY IF EXISTS "Contract participants can update offers" ON public.offers;
CREATE POLICY "Contract participants can update offers"
  ON public.offers
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_id AND
      (c.organizer_id = auth.uid() OR c.musician_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_id AND
      (c.organizer_id = auth.uid() OR c.musician_id = auth.uid())
    )
  );

-- ============================================================================
-- 7. TABLA: ratings (Valoraciones)
-- Evaluaciones mutuas entre organizador y músico tras una contratación
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profile_users(id) ON DELETE RESTRICT,
  target_id UUID NOT NULL REFERENCES public.profile_users(id) ON DELETE RESTRICT,
  target_project_id UUID REFERENCES public.musical_projects(id) ON DELETE SET NULL,
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_ratings_contract_author UNIQUE (contract_id, author_id),
  CONSTRAINT chk_ratings_author_not_target CHECK (author_id <> target_id)
);

CREATE INDEX IF NOT EXISTS idx_ratings_contract_id ON public.ratings(contract_id);
CREATE INDEX IF NOT EXISTS idx_ratings_author_id ON public.ratings(author_id);
CREATE INDEX IF NOT EXISTS idx_ratings_target_id ON public.ratings(target_id);
CREATE INDEX IF NOT EXISTS idx_ratings_target_project_id ON public.ratings(target_project_id);

-- Trigger para validar participantes y estado del contrato en valoraciones
CREATE OR REPLACE FUNCTION public.validate_rating_rules()
RETURNS TRIGGER AS $$
DECLARE
  v_contract RECORD;
BEGIN
  SELECT * INTO v_contract FROM public.contracts WHERE id = NEW.contract_id;
  IF v_contract IS NULL THEN
    RAISE EXCEPTION 'Contract does not exist';
  END IF;

  -- 1. La contratación debe estar acordada o completada
  IF v_contract.status NOT IN ('AGREED', 'COMPLETED') THEN
    RAISE EXCEPTION 'Ratings are only allowed for contracts that are AGREED or COMPLETED (status: %)', v_contract.status;
  END IF;

  -- 2. El autor debe haber sido participante de la contratación
  IF NEW.author_id <> v_contract.organizer_id AND NEW.author_id <> v_contract.musician_id THEN
    RAISE EXCEPTION 'Only contract participants can rate';
  END IF;

  -- 3. El destinatario debe ser la contraparte
  IF NEW.author_id = v_contract.organizer_id THEN
    IF NEW.target_id <> v_contract.musician_id THEN
      RAISE EXCEPTION 'Target user must be the musician from the contract';
    END IF;
    IF NEW.target_project_id IS NOT NULL AND NEW.target_project_id <> v_contract.musical_project_id THEN
      RAISE EXCEPTION 'Target project must match the contract musical project';
    END IF;
  ELSE
    IF NEW.target_id <> v_contract.organizer_id THEN
      RAISE EXCEPTION 'Target user must be the organizer from the contract';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ratings_validate ON public.ratings;
CREATE TRIGGER trigger_ratings_validate
BEFORE INSERT OR UPDATE ON public.ratings
FOR EACH ROW
EXECUTE FUNCTION public.validate_rating_rules();

DROP TRIGGER IF EXISTS trigger_ratings_updated_at ON public.ratings;
CREATE TRIGGER trigger_ratings_updated_at
BEFORE UPDATE ON public.ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view ratings" ON public.ratings;
CREATE POLICY "Public can view ratings"
  ON public.ratings
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Contract participants can insert ratings" ON public.ratings;
CREATE POLICY "Contract participants can insert ratings"
  ON public.ratings
  FOR INSERT
  WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_id AND
      (c.organizer_id = auth.uid() OR c.musician_id = auth.uid()) AND
      c.status IN ('AGREED', 'COMPLETED')
    )
  );

DROP POLICY IF EXISTS "Authors can update own ratings" ON public.ratings;
CREATE POLICY "Authors can update own ratings"
  ON public.ratings
  FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Authors can delete own ratings" ON public.ratings;
CREATE POLICY "Authors can delete own ratings"
  ON public.ratings
  FOR DELETE
  USING (auth.uid() = author_id);

-- ============================================================================
-- 8. TABLA: tickets (Entradas - Alcance Conceptual MVP)
-- Sin procesamiento de pagos ni pasarelas reales en el MVP
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  ticket_type TEXT NOT NULL DEFAULT 'GENERAL',
  price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  capacity INTEGER CHECK (capacity IS NULL OR capacity > 0),
  description TEXT,
  external_purchase_url TEXT,
  is_free BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON public.tickets(event_id);

DROP TRIGGER IF EXISTS trigger_tickets_updated_at ON public.tickets;
CREATE TRIGGER trigger_tickets_updated_at
BEFORE UPDATE ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view tickets for published events" ON public.tickets;
CREATE POLICY "Public can view tickets for published events"
  ON public.tickets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND
      (e.status IN ('PUBLISHED', 'IN_PROGRESS', 'COMPLETED') OR e.organizer_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Organizers can insert tickets for own events" ON public.tickets;
CREATE POLICY "Organizers can insert tickets for own events"
  ON public.tickets
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.organizer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Organizers can update tickets for own events" ON public.tickets;
CREATE POLICY "Organizers can update tickets for own events"
  ON public.tickets
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.organizer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.organizer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Organizers can delete tickets for own events" ON public.tickets;
CREATE POLICY "Organizers can delete tickets for own events"
  ON public.tickets
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.organizer_id = auth.uid()
    )
  );

