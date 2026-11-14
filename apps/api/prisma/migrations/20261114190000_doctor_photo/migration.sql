-- Portrait of Dr. Soltantouye ships with the web app at /photos/dr-amir-soltantouye.webp.
-- Record it in the editable landing-page content so every environment shows it after deploy.
-- A picture the admin already uploaded for this slot is left alone.
UPDATE "ClinicSettings"
SET "content" = jsonb_set(COALESCE("content", '{}'::jsonb), '{doctor.image}', '"/photos/dr-amir-soltantouye.webp"'::jsonb, true)
WHERE "id" = 'clinic' AND NOT (COALESCE("content", '{}'::jsonb) ? 'doctor.image');
