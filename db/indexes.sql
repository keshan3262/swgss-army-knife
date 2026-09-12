CREATE INDEX idx_conversions_user_id ON conversions (user_id);
CREATE INDEX idx_source_images_conversion_id ON source_images (conversion_id);
CREATE INDEX idx_failed_conversions ON conversions (created_at) WHERE status = 'failed';
