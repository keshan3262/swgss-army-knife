SELECT
  cv.storage_url as converted_url,
  cv.size as converted_size,
  si.original_name as original_name,
  si.size as original_size,
  c.destination_format as output_format,
  c.status as status,
  c.created_at as started_at,
  c.user_id as user_id
FROM converted_versions cv RIGHT JOIN source_images si ON cv.source_image_id = si.id JOIN conversions c ON si.conversion_id = c.id
WHERE c.id = 1234;
