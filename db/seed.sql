INSERT INTO users (email, username)
  SELECT lower(first_name) || '.' || lower(last_name) || '@example.com' as email,
         lower(first_name) || '_' || lower(last_name) as username
  FROM UNNEST(ARRAY[
    'Alice', 'Bob', 'Charlie', 'Dave', 'Eve', 'Frank', 'Grace', 'Heidi', 'Ivy', 'Jack', 'Kyle', 'Liam', 'Mia', 'Noah',
    'Olivia', 'Paul', 'Quinn', 'Ryan', 'Sarah', 'Terry', 'Uma', 'Violet', 'William', 'Xavier', 'Yvonne', 'Zach'
  ]) as first_name
  CROSS JOIN UNNEST(ARRAY[
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez'
  ]) as last_name;

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
      (SELECT floor(user_rnd * (MAX(id) - MIN(id)) + MIN(id)) FROM users) as user_id,
      random() as status_rnd
    FROM (SELECT random() as user_rnd FROM GENERATE_SERIES(1, 100000))
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

VACUUM (ANALYZE) users, conversions, source_images, converted_versions;
