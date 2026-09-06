CREATE TABLE users (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email      text NOT NULL UNIQUE CHECK (email ~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' AND length(email) <= 254),
  username   text NOT NULL UNIQUE CHECK (username ~ '^[a-zA-Z0-9_-]+$' AND length(username) <= 32 AND length(username) >= 3)
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
