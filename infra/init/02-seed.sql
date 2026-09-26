CREATE TABLE users (
  id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email               text NOT NULL UNIQUE CHECK (email ~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' AND length(email) <= 254),
  username            text NOT NULL UNIQUE CHECK (username ~ '^[a-zA-Z0-9_-]+$' AND length(username) <= 32 AND length(username) >= 3),
  -- TODO: Improve rate limiting
  pts_left            integer NOT NULL DEFAULT 10
);

CREATE TYPE image_format AS ENUM ('jpeg', 'png', 'webp', 'gif', 'avif', 'svg');

CREATE TYPE conversion_status AS ENUM ('pending', 'completed', 'failed');

CREATE TABLE conversions (
  id                 bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id            bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  destination_format image_format NOT NULL,
  status             conversion_status NOT NULL DEFAULT 'pending',
  created_at         timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE source_images (
  id                 bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  conversion_id      bigint NOT NULL REFERENCES conversions(id) ON DELETE CASCADE,
  format             image_format NOT NULL,
  original_name      text NOT NULL CHECK (length(original_name) <= 255 AND length(original_name) >= 1),
  size               bigint NOT NULL CHECK (size > 0),
  storage_url        text NOT NULL UNIQUE CHECK (storage_url ~ '^https?://'),
  processed          integer NOT NULL DEFAULT 0,
  worker             text,
  conversion_error   text
);

CREATE TABLE converted_versions (
  id                 bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_image_id    bigint NOT NULL UNIQUE REFERENCES source_images(id) ON DELETE CASCADE,
  format             image_format NOT NULL,
  size               bigint NOT NULL CHECK (size > 0),
  storage_url        text NOT NULL UNIQUE CHECK (storage_url ~ '^https?://'),
  created_at         timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE conversion_handlers (
  id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name                text NOT NULL,
  source_formats      image_format[] NOT NULL,
  destination_formats image_format[] NOT NULL,
  -- TODO: Improve rate limiting
  pts_left            integer NOT NULL DEFAULT 10
);

INSERT INTO users (email, username)
  SELECT lower(first_name) || '.' || lower(last_name) || n.n::text || '@example.com' as email,
         lower(first_name) || '_' || lower(last_name) || n.n::text as username
  FROM UNNEST(ARRAY[
    'Alice', 'Bob', 'Charlie', 'Dave', 'Eve', 'Frank', 'Grace', 'Heidi', 'Ivy', 'Jack', 'Kyle', 'Liam', 'Mia', 'Noah',
    'Olivia', 'Paul', 'Quinn', 'Ryan', 'Sarah', 'Terry', 'Uma', 'Violet', 'William', 'Xavier', 'Yvonne', 'Zach'
  ]) as first_name
  CROSS JOIN UNNEST(ARRAY[
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez'
  ]) as last_name
  CROSS JOIN (SELECT n FROM GENERATE_SERIES(1, 100) as n) as n;

INSERT INTO conversions (user_id, destination_format, status, created_at)
  SELECT
    x.user_id,
    (ARRAY['jpeg', 'png', 'webp', 'gif', 'avif', 'svg'])[floor(random() * 6) + 1]::image_format,
    (CASE WHEN x.status_rnd < 0.95 THEN 'completed'
         WHEN x.status_rnd < 0.98 THEN 'pending'
         ELSE                          'failed' END)::conversion_status,
    now() - (random() * INTERVAL '365 days')
  FROM (
    SELECT
      floor(user_rnd * (u.max_id - u.min_id + 1) + u.min_id) as user_id,
      random() as status_rnd
    FROM (SELECT random() as user_rnd FROM GENERATE_SERIES(1, 100000))
    CROSS JOIN (SELECT MIN(id) as min_id, MAX(id) as max_id FROM users) as u
  ) as x;

INSERT INTO source_images (conversion_id, format, original_name, size, storage_url, conversion_error)
  SELECT
    x.conversion_id,
    x.format,
    'image_' || x.n || '.' || x.format,
    floor(random() * 1000000) + 1000,
    'https://example.com/image_' || x.n || '.' || x.format,
    CASE WHEN c.status = 'failed' THEN 'Mock error' ELSE NULL END
  FROM (
    SELECT
      y.n,
      CASE WHEN y.n <= 100000 THEN y.n
           ELSE (b.min_id + floor(y.conversion_id_rnd * (b.max_id - b.min_id + 1)))::bigint
           END as conversion_id,
      (ARRAY['jpeg', 'png', 'webp', 'gif', 'avif', 'svg'])[floor(random() * 6) + 1]::image_format as format
    FROM (SELECT n, random() as conversion_id_rnd FROM GENERATE_SERIES(1, 300000) as n) as y
    CROSS JOIN (SELECT MIN(id) as min_id, MAX(id) as max_id FROM conversions) as b
  ) as x
  JOIN conversions c ON c.id = x.conversion_id;

INSERT INTO converted_versions (source_image_id, format, size, storage_url)
  SELECT
    x.source_image_id,
    x.format,
    floor(random() * 1000000) + 1000,
    'https://example.com/converted_image_' || x.source_image_id || '.' || x.format
  FROM (
    SELECT
      (ARRAY['jpeg', 'png', 'webp', 'gif', 'avif', 'svg'])[floor(random() * 6) + 1]::image_format as format,
      y.source_image_id
    FROM (
      SELECT si.id as source_image_id FROM source_images si JOIN conversions c ON si.conversion_id = c.id WHERE c.status = 'completed'
    ) as y
  ) as x
  JOIN source_images si ON si.id = x.source_image_id;

INSERT INTO conversion_handlers (name, source_formats, destination_formats, pts_left)
  VALUES
    ('oxipng', ARRAY['png'::image_format], ARRAY['png'::image_format], 10),
    ('svgo', ARRAY['svg'::image_format], ARRAY['svg'::image_format], 10);
