SELECT count(si.id) as source_images_count, c.id, c.destination_format, c.status, c.created_at FROM
  source_images si JOIN conversions c ON si.conversion_id = c.id JOIN users u ON c.user_id = u.id WHERE
  u.username = 'alice_smith1' GROUP BY c.id ORDER BY c.created_at DESC;
