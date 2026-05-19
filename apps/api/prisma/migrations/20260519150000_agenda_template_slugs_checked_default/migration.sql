-- Lege calendarSlugs = geen agenda geselecteerd; vul met alle slugs zodat bestaande sjablonen blijven werken tot u ze bewerkt.
UPDATE `AgendaNotificationTemplate` `t`
SET `t`.`calendarSlugs` = COALESCE(
  (
    SELECT JSON_ARRAYAGG(`x`.`slug`)
    FROM (
      SELECT `c`.`slug`
      FROM `AgendaCalendar` `c`
      ORDER BY `c`.`sortOrder`, `c`.`title`
    ) AS `x`
  ),
  JSON_ARRAY()
)
WHERE JSON_TYPE(`t`.`calendarSlugs`) = 'ARRAY'
  AND JSON_LENGTH(`t`.`calendarSlugs`) = 0;
