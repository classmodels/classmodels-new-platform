<?php
/**
 * Exporteert WordPress-modellen (rol model/newface + cm_* usermeta) naar JSON voor Class-Models nieuw platform.
 *
 * Gebruik (op de machine waar WordPress draait, in de WP-root naast wp-load.php):
 *   php wp-export-class-models.php > wp-models-export.json
 *
 * Of kopieer dit bestand naar de WordPress-root en run daar hetzelfde commando.
 */
declare(strict_types=1);

$root = dirname(__FILE__);
if (!is_file($root . '/wp-load.php')) {
    fwrite(STDERR, "Geen wp-load.php hier. Plaats dit script in de WordPress-root (map met wp-config.php).\n");
    exit(1);
}

require_once $root . '/wp-load.php';

/** Beste publieke URL voor een attachment (large → full → ruwe bestands-url). */
function cm_attachment_public_url(int $attachment_id): string
{
    if ($attachment_id <= 0) {
        return '';
    }
    foreach (['large', 'full', 'medium'] as $size) {
        $u = wp_get_attachment_image_url($attachment_id, $size);
        if ($u) {
            return (string) $u;
        }
    }
    $u = wp_get_attachment_url($attachment_id);
    return $u ? (string) $u : '';
}

/** URL uit _wp_attached_file + upload-pad (fallback als bovenstaande leeg blijft). */
function cm_attachment_url_from_attached_file(int $attachment_id): string
{
    if ($attachment_id <= 0) {
        return '';
    }
    $rel = get_post_meta($attachment_id, '_wp_attached_file', true);
    if (!is_string($rel) || $rel === '') {
        return '';
    }
    $rel = str_replace('\\', '/', $rel);
    $uploads = wp_upload_dir();
    $base = isset($uploads['baseurl']) ? (string) $uploads['baseurl'] : '';
    if ($base === '') {
        return '';
    }

    return rtrim($base, '/') . '/' . ltrim($rel, '/');
}

function cm_best_attachment_url(int $attachment_id): string
{
    $u = cm_attachment_public_url($attachment_id);
    if ($u !== '') {
        return $u;
    }

    return cm_attachment_url_from_attached_file($attachment_id);
}

/** Eerste attachment-ID uit cm_galerijfotos (array of geserialiseerd). */
function cm_first_gallery_attachment_id(array $meta): int
{
    if (!isset($meta['cm_galerijfotos'])) {
        return 0;
    }
    $raw = $meta['cm_galerijfotos'];
    if (is_numeric($raw)) {
        return (int) $raw;
    }
    if (is_array($raw)) {
        foreach ($raw as $x) {
            if (is_numeric($x)) {
                return (int) $x;
            }
        }

        return 0;
    }
    if (is_string($raw)) {
        $un = maybe_unserialize($raw);
        if (is_array($un)) {
            foreach ($un as $x) {
                if (is_numeric($x)) {
                    return (int) $x;
                }
            }
        }
    }

    return 0;
}

if (!function_exists('get_users')) {
    fwrite(STDERR, "WordPress niet geladen.\n");
    exit(1);
}

$users = get_users([
    'role__in' => ['model', 'newface', 'tryout', 'inactief'],
    'number' => -1,
    'orderby' => 'ID',
    'order' => 'ASC',
    'fields' => 'all',
]);

global $wpdb;
$out = [];
foreach ($users as $u) {
    $uid = (int) $u->ID;
    $rows = $wpdb->get_results(
        $wpdb->prepare(
            "SELECT meta_key, meta_value FROM {$wpdb->usermeta} WHERE user_id = %d",
            $uid
        ),
        ARRAY_A
    );
    $meta = [];
    foreach ($rows ?: [] as $row) {
        $k = (string) $row['meta_key'];
        if (strpos($k, 'cm_') !== 0 && !in_array($k, ['first_name', 'last_name', 'nickname'], true)) {
            continue;
        }
        $raw = $row['meta_value'];
        $val = maybe_unserialize($raw);
        $meta[$k] = $val;
    }

    $roles = array_values(array_filter((array) $u->roles));

    $hoofdId = 0;
    if (isset($meta['cm_hoofdfoto'])) {
        $h = $meta['cm_hoofdfoto'];
        $hoofdId = is_numeric($h) ? (int) $h : 0;
    }
    $profId = 0;
    if (isset($meta['cm_profielfoto'])) {
        $p = $meta['cm_profielfoto'];
        $profId = is_numeric($p) ? (int) $p : 0;
    }
    $galId = cm_first_gallery_attachment_id($meta);
    $hoofdUrl = $hoofdId ? cm_best_attachment_url($hoofdId) : '';
    $profUrl = $profId ? cm_best_attachment_url($profId) : '';
    if ($hoofdUrl === '' && $profId) {
        $hoofdUrl = cm_best_attachment_url($profId);
    }
    if ($hoofdUrl === '' && $galId) {
        $hoofdUrl = cm_best_attachment_url($galId);
    }

    $out[] = [
        'wpUserId' => $uid,
        'user_login' => (string) $u->user_login,
        'user_email' => strtolower(trim((string) $u->user_email)),
        'roles' => $roles,
        'meta' => $meta,
        'hoofdfotoUrl' => $hoofdUrl,
        'profielfotoUrl' => $profUrl,
    ];
}

$payload = [
    'exportedAt' => gmdate('c'),
    'wpBaseUrl' => home_url('/'),
    'userCount' => count($out),
    'users' => $out,
];

echo wp_json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE | JSON_PRETTY_PRINT);
echo "\n";
