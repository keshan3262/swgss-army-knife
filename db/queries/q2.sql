SELECT
  c.created_at as started_at,
  si.format as input_format,
  si.storage_url as input_url,
  si.size as input_size,
  c.destination_format as output_format,
  si.conversion_error as error_message
  FROM source_images si JOIN conversions c ON si.conversion_id = c.id WHERE
  c.status = 'failed' AND si.conversion_error IS NOT NULL AND c.created_at >= DATE_TRUNC('month', CURRENT_TIMESTAMP)
  ORDER BY c.created_at DESC;
