-- Zet de vier gevraagde modellen op ingeschreven + betaald (incl. Ilse Heymans-variant).

INSERT INTO `TryoutModeshowRegistration` (
  `id`,
  `userId`,
  `editionSlug`,
  `interestStatus`,
  `termsAcceptedAt`,
  `paymentStatus`,
  `isFree`,
  `createdAt`,
  `updatedAt`
)
SELECT
  UUID(),
  u.`id`,
  'tryout-2027-03-27',
  'paid',
  UTC_TIMESTAMP(3),
  'manual',
  1,
  UTC_TIMESTAMP(3),
  UTC_TIMESTAMP(3)
FROM `User` u
WHERE (
  (LOWER(TRIM(u.`firstName`)) = 'leen' AND LOWER(TRIM(u.`lastName`)) = 'martens')
  OR (LOWER(TRIM(u.`firstName`)) = 'nadine' AND LOWER(REPLACE(TRIM(u.`lastName`), ' ', '')) IN ('deroos', 'de-roos'))
  OR (LOWER(TRIM(u.`firstName`)) = 'nadine' AND LOWER(TRIM(u.`lastName`)) = 'de roos')
  OR (LOWER(TRIM(u.`firstName`)) = 'carine' AND LOWER(TRIM(u.`lastName`)) = 'vermeiren')
  OR (LOWER(TRIM(u.`firstName`)) = 'ilse' AND LOWER(TRIM(u.`lastName`)) IN ('huysmans', 'heymans'))
  OR (LOWER(TRIM(u.`firstName`)) IN ('huysmans', 'heymans') AND LOWER(TRIM(u.`lastName`)) = 'ilse')
)
AND NOT EXISTS (
  SELECT 1
  FROM `TryoutModeshowRegistration` r
  WHERE r.`userId` = u.`id`
    AND r.`editionSlug` IN ('tryout-2027-03-27', 'tryout-2026-10-31')
);

UPDATE `TryoutModeshowRegistration` r
INNER JOIN `User` u ON u.`id` = r.`userId`
SET
  r.`interestStatus` = 'paid',
  r.`paymentStatus` = COALESCE(NULLIF(r.`paymentStatus`, ''), 'manual'),
  r.`termsAcceptedAt` = COALESCE(r.`termsAcceptedAt`, UTC_TIMESTAMP(3)),
  r.`isFree` = 1,
  r.`updatedAt` = UTC_TIMESTAMP(3)
WHERE r.`editionSlug` IN ('tryout-2027-03-27', 'tryout-2026-10-31')
  AND (
    (LOWER(TRIM(u.`firstName`)) = 'leen' AND LOWER(TRIM(u.`lastName`)) = 'martens')
    OR (LOWER(TRIM(u.`firstName`)) = 'nadine' AND LOWER(REPLACE(TRIM(u.`lastName`), ' ', '')) IN ('deroos', 'de-roos'))
    OR (LOWER(TRIM(u.`firstName`)) = 'nadine' AND LOWER(TRIM(u.`lastName`)) = 'de roos')
    OR (LOWER(TRIM(u.`firstName`)) = 'carine' AND LOWER(TRIM(u.`lastName`)) = 'vermeiren')
    OR (LOWER(TRIM(u.`firstName`)) = 'ilse' AND LOWER(TRIM(u.`lastName`)) IN ('huysmans', 'heymans'))
    OR (LOWER(TRIM(u.`firstName`)) IN ('huysmans', 'heymans') AND LOWER(TRIM(u.`lastName`)) = 'ilse')
  );
