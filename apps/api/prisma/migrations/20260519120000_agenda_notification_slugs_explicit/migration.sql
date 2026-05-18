-- Vervang lege calendarSlugs (oude "alle agenda's") door expliciete slug-lijst zodat sjablonen blijven werken.
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
