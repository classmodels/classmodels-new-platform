-- Sjablonen waar alle agenda-slugs expliciet staan → lege lijst (= alle agenda's, zoals voorheen).
UPDATE `AgendaNotificationTemplate` `t`
SET `t`.`calendarSlugs` = JSON_ARRAY()
WHERE JSON_TYPE(`t`.`calendarSlugs`) = 'ARRAY'
  AND JSON_LENGTH(`t`.`calendarSlugs`) > 0
  AND JSON_LENGTH(`t`.`calendarSlugs`) >= (SELECT COUNT(*) FROM `AgendaCalendar`);
