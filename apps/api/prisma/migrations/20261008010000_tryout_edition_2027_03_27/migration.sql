-- Verplaats actieve try-out-editie: 31 okt 2026 → 27 maart 2027 (Stadsfeestzaal Aarschot).
-- Bestaande inschrijvingen blijven behouden via editionSlug-rename.

UPDATE `TryoutModeshowRegistration`
SET `editionSlug` = 'tryout-2027-03-27'
WHERE `editionSlug` = 'tryout-2026-10-31';

UPDATE `TryoutCoupon`
SET `editionSlug` = 'tryout-2027-03-27'
WHERE `editionSlug` = 'tryout-2026-10-31';

-- Markeer genoemde modellen als ingeschreven + betaald (aanmaken indien nog geen rij).
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
  OR (LOWER(TRIM(u.`firstName`)) = 'nadine' AND LOWER(TRIM(u.`lastName`)) = 'de roos')
  OR (LOWER(TRIM(u.`firstName`)) = 'carine' AND LOWER(TRIM(u.`lastName`)) = 'vermeiren')
  OR (LOWER(TRIM(u.`firstName`)) = 'ilse' AND LOWER(TRIM(u.`lastName`)) = 'huysmans')
)
AND NOT EXISTS (
  SELECT 1
  FROM `TryoutModeshowRegistration` r
  WHERE r.`userId` = u.`id`
    AND r.`editionSlug` = 'tryout-2027-03-27'
);

UPDATE `TryoutModeshowRegistration` r
INNER JOIN `User` u ON u.`id` = r.`userId`
SET
  r.`interestStatus` = 'paid',
  r.`paymentStatus` = COALESCE(r.`paymentStatus`, 'manual'),
  r.`termsAcceptedAt` = COALESCE(r.`termsAcceptedAt`, UTC_TIMESTAMP(3)),
  r.`updatedAt` = UTC_TIMESTAMP(3)
WHERE r.`editionSlug` = 'tryout-2027-03-27'
  AND (
    (LOWER(TRIM(u.`firstName`)) = 'leen' AND LOWER(TRIM(u.`lastName`)) = 'martens')
    OR (LOWER(TRIM(u.`firstName`)) = 'nadine' AND LOWER(TRIM(u.`lastName`)) = 'de roos')
    OR (LOWER(TRIM(u.`firstName`)) = 'carine' AND LOWER(TRIM(u.`lastName`)) = 'vermeiren')
    OR (LOWER(TRIM(u.`firstName`)) = 'ilse' AND LOWER(TRIM(u.`lastName`)) = 'huysmans')
  );
