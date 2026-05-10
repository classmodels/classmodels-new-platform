<?php
/**
 * Plugin Name: Class Models Agenda Pro
 * Description: Uitgebreide afsprakenplugin voor Class-Models: portfolio, opleiding, casting, gratis fotoshoot, intake, vrije agenda's, veldenbouwer, templates, sms/e-mail, kalender, app API en Bookly-achtige workflow in Class-Models stijl.
 * Version: 3.5.4-deepfix-delete-layout
 * Author: Class Models / OpenAI
 * Text Domain: class-models-agenda-pro
 */

if (!defined('ABSPATH')) exit;

if (!class_exists('CM_Agenda_Pro_V3')):
final class CM_Agenda_Pro_V3 {
    const VERSION = '3.5.4-deepfix-delete-layout';
    const SLUG = 'cm-agenda-pro';
    const DB_OPT = 'cmap_db_version';
    private static $instance = null;

    public static function instance(){
        if (!self::$instance) self::$instance = new self();
        return self::$instance;
    }

    private function __construct(){
        add_action('init', [$this,'init']);
        add_action('admin_menu', [$this,'admin_menu']);
        add_action('admin_enqueue_scripts', [$this,'enqueue_admin']);
        add_action('wp_enqueue_scripts', [$this,'enqueue_front']);
        add_action('rest_api_init', [$this,'rest_routes']);
        add_action('cmap_cron_notifications', [$this,'run_scheduled_notifications']);
        add_action('wp_ajax_cmap_admin_save', [$this,'ajax_admin_save']);
        add_action('admin_head', [$this,'admin_head_clean_cm_page']);
        add_action('admin_init', [$this,'maybe_export_bookings_csv']);
    }

    public static function activate(){
        self::create_tables();
        self::seed_defaults();
        if (!wp_next_scheduled('cmap_cron_notifications')) {
            wp_schedule_event(time()+300, 'hourly', 'cmap_cron_notifications');
        }
    }

    public static function deactivate(){
        $ts = wp_next_scheduled('cmap_cron_notifications');
        if ($ts) wp_unschedule_event($ts, 'cmap_cron_notifications');
    }

    public static function tables(){
        global $wpdb;
        return [
            'cal' => $wpdb->prefix.'cmap_calendars',
            'slots' => $wpdb->prefix.'cmap_slots',
            'book' => $wpdb->prefix.'cmap_bookings',
            'fields' => $wpdb->prefix.'cmap_fields',
            'templates' => $wpdb->prefix.'cmap_templates',
            'rules' => $wpdb->prefix.'cmap_template_rules',
            'closed' => $wpdb->prefix.'cmap_closed_days',
            'logs' => $wpdb->prefix.'cmap_notification_logs',
        ];
    }

    public static function create_tables(){
        global $wpdb;
        require_once ABSPATH.'wp-admin/includes/upgrade.php';
        $t = self::tables();
        $charset = $wpdb->get_charset_collate();
        dbDelta("CREATE TABLE {$t['cal']} (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            slug VARCHAR(80) NOT NULL,
            title VARCHAR(190) NOT NULL,
            description TEXT NULL,
            color VARCHAR(20) NOT NULL DEFAULT '#070414',
            duration INT NOT NULL DEFAULT 30,
            capacity INT NOT NULL DEFAULT 1,
            active TINYINT(1) NOT NULL DEFAULT 1,
            public_booking TINYINT(1) NOT NULL DEFAULT 1,
            use_model_data TINYINT(1) NOT NULL DEFAULT 0,
            legacy_type VARCHAR(60) NULL,
            admin_only TINYINT(1) NOT NULL DEFAULT 0,
            sort_order INT NOT NULL DEFAULT 100,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            PRIMARY KEY (id), UNIQUE KEY slug (slug), KEY active (active), KEY legacy_type (legacy_type)
        ) $charset;");
        dbDelta("CREATE TABLE {$t['slots']} (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            calendar_id BIGINT UNSIGNED NOT NULL,
            slot_date DATE NOT NULL,
            start_time TIME NOT NULL,
            end_time TIME NOT NULL,
            capacity INT NOT NULL DEFAULT 1,
            color VARCHAR(20) NULL,
            status VARCHAR(30) NOT NULL DEFAULT 'open',
            notes TEXT NULL,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            PRIMARY KEY (id), KEY cal_date (calendar_id,slot_date), KEY status (status), KEY start_time (start_time)
        ) $charset;");
        dbDelta("CREATE TABLE {$t['book']} (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            calendar_id BIGINT UNSIGNED NOT NULL,
            slot_id BIGINT UNSIGNED NULL,
            user_id BIGINT UNSIGNED NULL,
            start_at DATETIME NOT NULL,
            end_at DATETIME NOT NULL,
            status VARCHAR(30) NOT NULL DEFAULT 'confirmed',
            name VARCHAR(190) NULL,
            firstname VARCHAR(120) NULL,
            lastname VARCHAR(120) NULL,
            email VARCHAR(190) NULL,
            phone VARCHAR(80) NULL,
            file_id BIGINT UNSIGNED NULL,
            fields LONGTEXT NULL,
            source VARCHAR(80) NULL,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            PRIMARY KEY (id), KEY cal_start (calendar_id,start_at), KEY slot_id (slot_id), KEY user_id (user_id), KEY status (status)
        ) $charset;");
        dbDelta("CREATE TABLE {$t['fields']} (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            calendar_id BIGINT UNSIGNED NOT NULL,
            field_key VARCHAR(100) NOT NULL,
            label VARCHAR(190) NOT NULL,
            type VARCHAR(40) NOT NULL DEFAULT 'text',
            required TINYINT(1) NOT NULL DEFAULT 0,
            width VARCHAR(20) NOT NULL DEFAULT '1',
            placeholder VARCHAR(190) NULL,
            title_position VARCHAR(20) NOT NULL DEFAULT 'above',
            sort_order INT NOT NULL DEFAULT 100,
            active TINYINT(1) NOT NULL DEFAULT 1,
            options TEXT NULL,
            PRIMARY KEY (id), KEY calendar_id (calendar_id), KEY field_key (field_key)
        ) $charset;");
        dbDelta("CREATE TABLE {$t['templates']} (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            name VARCHAR(190) NOT NULL,
            channel VARCHAR(20) NOT NULL DEFAULT 'email',
            subject VARCHAR(190) NULL,
            body LONGTEXT NOT NULL,
            active TINYINT(1) NOT NULL DEFAULT 1,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            PRIMARY KEY (id), KEY channel (channel)
        ) $charset;");
        dbDelta("CREATE TABLE {$t['rules']} (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            calendar_id BIGINT UNSIGNED NOT NULL,
            template_id BIGINT UNSIGNED NOT NULL,
            trigger_type VARCHAR(40) NOT NULL DEFAULT 'confirmation',
            offset_minutes INT NOT NULL DEFAULT 0,
            active TINYINT(1) NOT NULL DEFAULT 1,
            PRIMARY KEY (id), KEY calendar_id (calendar_id), KEY template_id (template_id), KEY trigger_type (trigger_type)
        ) $charset;");
        dbDelta("CREATE TABLE {$t['closed']} (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            calendar_id BIGINT UNSIGNED NOT NULL,
            closed_date DATE NOT NULL,
            reason VARCHAR(190) NULL,
            created_at DATETIME NOT NULL,
            PRIMARY KEY (id), UNIQUE KEY cal_date (calendar_id,closed_date)
        ) $charset;");
        dbDelta("CREATE TABLE {$t['logs']} (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            booking_id BIGINT UNSIGNED NOT NULL,
            rule_id BIGINT UNSIGNED NULL,
            template_id BIGINT UNSIGNED NULL,
            channel VARCHAR(20) NOT NULL,
            trigger_type VARCHAR(40) NOT NULL,
            sent_at DATETIME NOT NULL,
            result VARCHAR(190) NULL,
            PRIMARY KEY (id), KEY booking_id (booking_id), KEY rule_id (rule_id), KEY trigger_type (trigger_type)
        ) $charset;");
        update_option(self::DB_OPT, self::VERSION);
    }

    public static function seed_defaults(){
        $defs = [
            ['portfolio','Portfolio afspraak','#070414',30,1,'portfolio',10,1],
            ['opleiding','Opleiding afspraak','#45525f',60,1,'opleiding',20,1],
            ['intake-gesprek','Intake-Gesprek','#2f6f55',60,1,'generic',30,0],
            ['casting','Casting','#2e66c7',60,1,'generic',40,0],
            ['gratis-fotoshoot','Gratis Fotoshoot','#b7cae8',90,1,'generic',50,0],
        ];
        foreach($defs as $d){
            $id = self::ensure_calendar($d[0],$d[1],$d[2],$d[3],$d[4],$d[5],$d[6],$d[7]);
            self::seed_fields($id, $d[5]);
        }
        self::seed_templates();
        self::seed_template_rules();
        $portfolio = self::get_calendar('portfolio');
        $opleiding = self::get_calendar('opleiding');
        if ($portfolio) self::import_legacy_portfolio((int)$portfolio->id);
        if ($opleiding) self::import_legacy_opleiding((int)$opleiding->id);
    }

    public static function ensure_calendar($slug,$title,$color,$duration,$capacity,$legacy_type='generic',$sort=100,$use_model=0){
        global $wpdb; $t=self::tables(); $now=current_time('mysql');
        $id = (int)$wpdb->get_var($wpdb->prepare("SELECT id FROM {$t['cal']} WHERE slug=%s", $slug));
        $data = [
            'slug'=>$slug,'title'=>$title,'description'=>'','color'=>$color,'duration'=>(int)$duration,'capacity'=>(int)$capacity,
            'active'=>1,'public_booking'=>1,'use_model_data'=>(int)$use_model,'legacy_type'=>$legacy_type,'admin_only'=>0,'sort_order'=>(int)$sort,'updated_at'=>$now
        ];
        if ($id) {
            $wpdb->update($t['cal'], $data, ['id'=>$id]);
        } else {
            $data['created_at']=$now;
            $wpdb->insert($t['cal'], $data);
            $id = (int)$wpdb->insert_id;
        }
        return $id;
    }

    public static function seed_fields($calendar_id, $type='generic'){
        global $wpdb; $t=self::tables();
        $exists=(int)$wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$t['fields']} WHERE calendar_id=%d",$calendar_id));
        if ($exists) return;
        $generic = [
            ['voornaam','Voornaam','text',1,'2','Voornaam','above',10,''],
            ['familienaam','Familienaam','text',1,'2','Familienaam','above',20,''],
            ['geboortedatum','Geboortedatum','date',0,'2','Geboortedatum','above',25,''],
            ['straat','Straat','text',0,'2','Straat','above',30,''],
            ['nr','Nr.','text',0,'3','Nr.','above',35,''],
            ['postcode','Postcode','text',0,'3','Postcode','above',40,''],
            ['gemeente','Gemeente','text',0,'2','Gemeente','above',45,''],
            ['email','E-mail','email',1,'2','E-mail','above',50,''],
            ['telefoon','Telefoon','tel',0,'2','Telefoon','above',55,''],
            ['hoe_terecht','Hoe bent u bij ons terecht gekomen?','select',0,'2','Kies','above',60,"Google\nFacebook\nInstagram\nTikTok\nAndere"],
            ['bericht','Opmerkingen','textarea',0,'1','Eventuele opmerking','above',65,''],
            ['foto','Foto uploaden','file',0,'1','','above',70,''],
        ];
        $model = [
            ['naam','Naam','text',0,'1','Naam','above',10,''],
            ['geboortedatum','Geboortedatum','date',0,'2','Geboortedatum','above',15,''],
            ['straat','Straat','text',0,'2','Straat','above',20,''],
            ['nr','Nr.','text',0,'3','Nr.','above',25,''],
            ['postcode','Postcode','text',0,'3','Postcode','above',30,''],
            ['gemeente','Gemeente','text',0,'2','Gemeente','above',35,''],
            ['email','E-mail','email',0,'2','E-mail','above',40,''],
            ['telefoon','Telefoon','tel',0,'2','Telefoon','above',45,''],
            ['hoe_terecht','Hoe bent u bij ons terecht gekomen?','select',0,'2','Kies','above',50,"Google\nFacebook\nInstagram\nTikTok\nAndere"],
            ['bericht','Opmerkingen','textarea',0,'1','Eventuele opmerking','above',55,''],
        ];
        $rows = in_array($type, ['portfolio','opleiding'], true) ? $model : $generic;
        foreach($rows as $d){
            $wpdb->insert($t['fields'], [
                'calendar_id'=>$calendar_id,'field_key'=>$d[0],'label'=>$d[1],'type'=>$d[2],'required'=>$d[3],'width'=>$d[4],
                'placeholder'=>$d[5],'title_position'=>$d[6],'sort_order'=>$d[7],'active'=>1,'options'=>$d[8]
            ]);
        }
    }

    public static function ensure_missing_default_fields(){
        global $wpdb; $t=self::tables();
        $cals=self::get_calendars(false);
        $wanted=[
            ['geboortedatum','Geboortedatum','date',0,'2','Geboortedatum','above',25,''],
            ['straat','Straat','text',0,'2','Straat','above',30,''],
            ['nr','Nr.','text',0,'3','Nr.','above',35,''],
            ['postcode','Postcode','text',0,'3','Postcode','above',40,''],
            ['gemeente','Gemeente','text',0,'2','Gemeente','above',45,''],
            ['telefoon','Telefoon','tel',0,'2','Telefoon','above',55,''],
            ['hoe_terecht','Hoe bent u bij ons terecht gekomen?','select',0,'2','Kies','above',60,"Google\nFacebook\nInstagram\nTikTok\nAndere"],
            ['bericht','Opmerkingen','textarea',0,'1','Eventuele opmerking','above',65,''],
        ];
        foreach($cals as $cal){
            foreach($wanted as $d){
                $exists=(int)$wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$t['fields']} WHERE calendar_id=%d AND field_key=%s",$cal->id,$d[0]));
                if($exists) continue;
                $wpdb->insert($t['fields'], [
                    'calendar_id'=>(int)$cal->id,'field_key'=>$d[0],'label'=>$d[1],'type'=>$d[2],'required'=>$d[3],'width'=>$d[4],
                    'placeholder'=>$d[5],'title_position'=>$d[6],'sort_order'=>$d[7],'active'=>1,'options'=>$d[8]
                ]);
            }
        }
    }
    public static function seed_templates(){
        global $wpdb; $t=self::tables(); $now=current_time('mysql');
        $exists=(int)$wpdb->get_var("SELECT COUNT(*) FROM {$t['templates']}");
        if ($exists) return;
        $templates = [
            ['Bevestiging afspraak','email','Bevestiging {calendar_title}','Beste {name},<br><br>Je afspraak voor <strong>{calendar_title}</strong> is bevestigd op <strong>{date}</strong> om <strong>{time}</strong>.<br><br>Class-Models'],
            ['Herinnering afspraak','email','Herinnering {calendar_title}','Beste {name},<br><br>Herinnering: je afspraak voor <strong>{calendar_title}</strong> is op {date} om {time}.<br><br>Class-Models'],
            ['Opvolging afspraak','email','Opvolging {calendar_title}','Beste {name},<br><br>Bedankt voor je afspraak bij Class-Models. We nemen indien nodig verder contact op.<br><br>Class-Models'],
            ['SMS bevestiging','sms','','Class-Models: je afspraak voor {calendar_title} is bevestigd op {date} om {time}.'],
            ['SMS herinnering','sms','','Class-Models herinnering: {calendar_title} op {date} om {time}.'],
        ];
        foreach($templates as $tpl){
            $wpdb->insert($t['templates'], ['name'=>$tpl[0],'channel'=>$tpl[1],'subject'=>$tpl[2],'body'=>$tpl[3],'active'=>1,'created_at'=>$now,'updated_at'=>$now]);
        }
    }

    public static function seed_template_rules(){
        global $wpdb; $t=self::tables();
        $exists=(int)$wpdb->get_var("SELECT COUNT(*) FROM {$t['rules']}");
        if ($exists) return;
        $cals=self::get_calendars(false);
        $confirm=(int)$wpdb->get_var("SELECT id FROM {$t['templates']} WHERE name='Bevestiging afspraak' LIMIT 1");
        $remind=(int)$wpdb->get_var("SELECT id FROM {$t['templates']} WHERE name='Herinnering afspraak' LIMIT 1");
        foreach($cals as $cal){
            if($confirm) $wpdb->insert($t['rules'], ['calendar_id'=>$cal->id,'template_id'=>$confirm,'trigger_type'=>'confirmation','offset_minutes'=>0,'active'=>1]);
            if($remind) $wpdb->insert($t['rules'], ['calendar_id'=>$cal->id,'template_id'=>$remind,'trigger_type'=>'before','offset_minutes'=>1440,'active'=>1]);
        }
    }

    public static function import_legacy_portfolio($calendar_id){
        $dagen=get_option('pa_agenda_dagen', []); $urenAll=get_option('pa_agenda_uren', []);
        if (!is_array($dagen)) return;
        foreach($dagen as $d){
            $datum = is_array($d) ? ($d['datum'] ?? $d['date'] ?? '') : (string)$d;
            if(!self::valid_date($datum)) continue;
            $uren = isset($urenAll[$datum]) && is_array($urenAll[$datum]) ? $urenAll[$datum] : [];
            foreach($uren as $uur){
                if(is_array($uur)) $uur = $uur['uur'] ?? $uur['time'] ?? '';
                if(self::valid_time($uur)) self::ensure_slot($calendar_id,$datum,self::norm_time($uur),self::add_minutes_to_time($uur,30),1);
            }
        }
    }

    public static function import_legacy_opleiding($calendar_id){
        $datums=get_option('sm_opleiding_datums', []);
        if(!is_array($datums)) return;
        foreach($datums as $d){
            if(!is_array($d)) continue;
            $datum=$d['datum']??$d['date']??''; $van=$d['van']??$d['start']??''; $tot=$d['tot']??$d['end']??'';
            if(self::valid_date($datum) && self::valid_time($van) && self::valid_time($tot)) self::ensure_slot($calendar_id,$datum,self::norm_time($van),self::norm_time($tot),1);
        }
    }

    public static function ensure_slot($calendar_id,$date,$start,$end,$capacity=1,$color='',$notes=''){
        global $wpdb; $t=self::tables(); $now=current_time('mysql');
        $start=self::norm_time($start); $end=self::norm_time($end);
        $id=(int)$wpdb->get_var($wpdb->prepare("SELECT id FROM {$t['slots']} WHERE calendar_id=%d AND slot_date=%s AND start_time=%s AND end_time=%s",$calendar_id,$date,$start,$end));
        $data=['calendar_id'=>$calendar_id,'slot_date'=>$date,'start_time'=>$start,'end_time'=>$end,'capacity'=>max(1,(int)$capacity),'color'=>$color?:null,'status'=>'open','notes'=>$notes,'updated_at'=>$now];
        if($id) $wpdb->update($t['slots'],$data,['id'=>$id]);
        else { $data['created_at']=$now; $wpdb->insert($t['slots'],$data); $id=(int)$wpdb->insert_id; }
        return $id;
    }

    public function init(){
        self::ensure_missing_default_fields();
        $shortcodes = [
            'cm_agenda_booking'=>'shortcode_booking',
            'cm_agenda_admin'=>'shortcode_admin',
            'cm_agenda_calendar'=>'shortcode_calendar',
            'cm_agenda_my_bookings'=>'shortcode_my_bookings',
            'cm_agenda_shortcode_lijst'=>'shortcode_list',
            'cm_agenda_slots_admin'=>'shortcode_slots_admin',
            'cm_agenda_bookings_admin'=>'shortcode_bookings_admin',
            'portfolio_agenda_afspraak'=>'shortcode_portfolio_booking',
            'portfolio_agenda_beheer'=>'shortcode_portfolio_admin',
            'portfolio_agenda_admin'=>'shortcode_portfolio_bookings',
            'portfolio_agenda_mijn'=>'shortcode_my_bookings',
            'opleiding_inschrijven'=>'shortcode_opleiding_booking',
            'opleiding_datums_beheer'=>'shortcode_opleiding_admin',
            'opleiding_inschrijvingen_admin'=>'shortcode_opleiding_bookings',
            'opleiding_mijn_inschrijvingen'=>'shortcode_my_bookings',
            'casting_afspraak'=>'shortcode_casting_booking',
            'gratis_fotoshoot_afspraak'=>'shortcode_gratis_booking',
            'intake_gesprek_afspraak'=>'shortcode_intake_booking',
        ];
        foreach($shortcodes as $tag=>$method) add_shortcode($tag, [$this,$method]);
    }

    public function admin_menu(){
        add_menu_page('Class Models Agenda', 'CM Agenda', 'manage_options', self::SLUG, [$this,'admin_page'], 'dashicons-calendar-alt', 58);
        add_submenu_page(self::SLUG, 'Overzicht', 'Overzicht', 'manage_options', self::SLUG.'&tab=dashboard', [$this,'admin_page']);
        add_submenu_page(self::SLUG, 'Kalender', 'Kalender', 'manage_options', self::SLUG.'&tab=calendar', [$this,'admin_page']);
        add_submenu_page(self::SLUG, 'Afspraken', 'Afspraken', 'manage_options', self::SLUG.'&tab=bookings', [$this,'admin_page']);
        add_submenu_page(self::SLUG, 'Dagen/uren', 'Dagen/uren', 'manage_options', self::SLUG.'&tab=slots', [$this,'admin_page']);
        add_submenu_page(self::SLUG, 'Vrije dagen', 'Vrije dagen', 'manage_options', self::SLUG.'&tab=closed', [$this,'admin_page']);
        add_submenu_page(self::SLUG, 'Agenda’s', 'Agenda’s', 'manage_options', self::SLUG.'&tab=calendars', [$this,'admin_page']);
        add_submenu_page(self::SLUG, 'Formuliervelden', 'Formuliervelden', 'manage_options', self::SLUG.'&tab=fields', [$this,'admin_page']);
        add_submenu_page(self::SLUG, 'Mail/SMS', 'Mail/SMS', 'manage_options', self::SLUG.'&tab=templates', [$this,'admin_page']);
        add_submenu_page(self::SLUG, 'Automatisatie', 'Automatisatie', 'manage_options', self::SLUG.'&tab=rules', [$this,'admin_page']);
        add_submenu_page(self::SLUG, 'Shortcodes', 'Shortcodes', 'manage_options', self::SLUG.'&tab=shortcodes', [$this,'admin_page']);
    }
    public function enqueue_admin(){ wp_enqueue_style('cmap-admin', plugins_url('assets/agenda.css', __FILE__), [], self::VERSION); wp_add_inline_style('cmap-admin', '.cmap-closed-day{background:#fff!important;border:1px solid #e1e5eb!important;color:#18212f!important}.cmap-closed-day.is-available{background:#f59e0b!important;border-color:#f59e0b!important;color:#fff!important}.cmap-closed-day input{display:none!important}.cmap-availability-note{margin:8px 0 12px;color:#6d6675;font-size:13px}.cmap-availability-note b{color:#f59e0b}'); wp_enqueue_script('cmap-admin', plugins_url('assets/agenda.js', __FILE__), ['jquery'], self::VERSION, true); wp_localize_script('cmap-admin','CMAP_AJAX',['ajax_url'=>admin_url('admin-ajax.php'),'nonce'=>wp_create_nonce('cmap_ajax')]); }
    public function enqueue_front(){ wp_enqueue_style('cmap-front', plugins_url('assets/agenda.css', __FILE__), [], self::VERSION); wp_enqueue_script('cmap-front', plugins_url('assets/agenda.js', __FILE__), ['jquery'], self::VERSION, true); wp_localize_script('cmap-front','CMAP_AJAX',['ajax_url'=>admin_url('admin-ajax.php'),'nonce'=>wp_create_nonce('cmap_ajax')]); }

    public static function valid_date($d){ return (bool)preg_match('/^\d{4}-\d{2}-\d{2}$/',(string)$d); }
    public static function valid_time($t){ return (bool)preg_match('/^\d{2}:\d{2}(:\d{2})?$/',(string)$t); }
    public static function norm_time($t){ return strlen($t)===5 ? $t.':00' : $t; }
    public static function add_minutes_to_time($time,$min){ $ts=strtotime('2000-01-01 '.self::norm_time($time)); return date('H:i:s',$ts+((int)$min*60)); }
    public static function h($s){ return esc_html((string)$s); }
    public static function admin_user(){ return current_user_can('manage_options'); }
    public static function now_mysql(){ return current_time('mysql'); }

    public static function get_calendars($active_only=false){
        global $wpdb; $t=self::tables(); $where=$active_only?'WHERE active=1':'';
        return $wpdb->get_results("SELECT * FROM {$t['cal']} {$where} ORDER BY sort_order ASC, title ASC");
    }
    public static function get_calendar($slug_or_id){
        global $wpdb; $t=self::tables();
        if(is_numeric($slug_or_id)) return $wpdb->get_row($wpdb->prepare("SELECT * FROM {$t['cal']} WHERE id=%d",(int)$slug_or_id));
        return $wpdb->get_row($wpdb->prepare("SELECT * FROM {$t['cal']} WHERE slug=%s",sanitize_title($slug_or_id)));
    }
    public static function get_fields($calendar_id, $active=true){
        global $wpdb; $t=self::tables(); $sql=$wpdb->prepare("SELECT * FROM {$t['fields']} WHERE calendar_id=%d",$calendar_id);
        if($active) $sql.=" AND active=1"; $sql.=" ORDER BY sort_order ASC,id ASC"; return $wpdb->get_results($sql);
    }
    public static function slot_booked_count($slot_id){
        global $wpdb; $t=self::tables(); return (int)$wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$t['book']} WHERE slot_id=%d AND status IN ('pending','confirmed','attended')",$slot_id));
    }
    public static function is_closed($calendar_id,$date){
        global $wpdb; $t=self::tables(); return (int)$wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$t['closed']} WHERE calendar_id=%d AND closed_date=%s",$calendar_id,$date)) > 0;
    }
    public static function save_available_dates($calendar_id,$year,$available_dates,$reason='Niet beschikbaar'){
        global $wpdb; $t=self::tables();
        $calendar_id=(int)$calendar_id; $year=(int)$year; if(!$calendar_id || $year<2024) return 0;
        $available=[];
        foreach((array)$available_dates as $date){
            $date=sanitize_text_field($date);
            if(self::valid_date($date) && substr($date,0,4)===(string)$year) $available[$date]=true;
        }
        update_option('cmap_available_saved_'.$calendar_id, 1, false);
        $wpdb->query($wpdb->prepare("DELETE FROM {$t['closed']} WHERE calendar_id=%d AND closed_date BETWEEN %s AND %s",$calendar_id,$year.'-01-01',$year.'-12-31'));
        $from=strtotime($year.'-01-01'); $to=strtotime($year.'-12-31'); $now=current_time('mysql');
        for($ts=$from; $ts<=$to; $ts=strtotime('+1 day',$ts)){
            $date=date('Y-m-d',$ts);
            if(isset($available[$date])) continue;
            $wpdb->replace($t['closed'], ['calendar_id'=>$calendar_id,'closed_date'=>$date,'reason'=>$reason,'created_at'=>$now]);
        }
        // Houd geboekte slots intact, maar ruim niet-geboekte slots buiten de gekozen beschikbaarheid op.
        $slot_ids=$wpdb->get_col($wpdb->prepare("SELECT id FROM {$t['slots']} WHERE calendar_id=%d AND slot_date BETWEEN %s AND %s",$calendar_id,$year.'-01-01',$year.'-12-31'));
        foreach((array)$slot_ids as $slot_id){
            $slot=$wpdb->get_row($wpdb->prepare("SELECT slot_date FROM {$t['slots']} WHERE id=%d",(int)$slot_id));
            if($slot && isset($available[$slot->slot_date])) continue;
            if(self::slot_booked_count((int)$slot_id)===0) $wpdb->delete($t['slots'],['id'=>(int)$slot_id]);
        }
        self::ensure_slots_for_available_dates($calendar_id,$available);
        return count($available);
    }
    public static function get_slots($calendar_id,$from=null,$to=null,$only_future=true){
        global $wpdb; $t=self::tables();
        $from=$from?:current_time('Y-m-d'); $to=$to?:date('Y-m-d',strtotime($from.' +90 days'));
        $sql=$wpdb->prepare("SELECT s.*, c.title calendar_title, c.color calendar_color, (SELECT COUNT(*) FROM {$t['book']} b WHERE b.slot_id=s.id AND b.status IN ('pending','confirmed','attended')) booked FROM {$t['slots']} s JOIN {$t['cal']} c ON c.id=s.calendar_id WHERE s.calendar_id=%d AND s.status='open' AND s.slot_date BETWEEN %s AND %s",$calendar_id,$from,$to);
        if($only_future) $sql.=$wpdb->prepare(" AND CONCAT(s.slot_date,' ',s.start_time) >= %s",current_time('mysql'));
        $sql.=" ORDER BY s.slot_date ASC, s.start_time ASC";
        $rows=$wpdb->get_results($sql); $out=[];
        foreach($rows as $r){ if(!self::is_closed($calendar_id,$r->slot_date)) $out[]=$r; }
        return $out;
    }


    public static function calendar_booking_total($calendar_id){
        global $wpdb; $t=self::tables();
        return (int)$wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$t['book']} WHERE calendar_id=%d AND status IN ('pending','confirmed','attended')",(int)$calendar_id));
    }
    public static function calendar_closed_total($calendar_id){
        global $wpdb; $t=self::tables();
        return (int)$wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$t['closed']} WHERE calendar_id=%d",(int)$calendar_id));
    }
    public static function default_calendar_plan($cal){
        $days=[];
        for($i=1;$i<=7;$i++){
            $days[$i]=[
                'enabled'=>1,
                'start'=>'08:00',
                'end'=>$i>=6?'18:00':'20:00',
                'start2'=>'',
                'end2'=>'',
                'breaks'=>[]
            ];
        }
        return [
            'duration'=>max(5,(int)($cal->duration??60)),
            'capacity'=>max(1,(int)($cal->capacity??1)),
            'color'=>!empty($cal->color)?$cal->color:'#070414',
            'days'=>$days,
        ];
    }
    public static function get_calendar_plan($calendar_id){
        $cal=self::get_calendar($calendar_id); if(!$cal) return [];
        $default=self::default_calendar_plan($cal);
        $stored=get_option('cmap_plan_'.(int)$calendar_id, []);
        if(!is_array($stored)) $stored=[];
        $plan=wp_parse_args($stored,$default);
        $plan['days']=is_array($plan['days']??null)?$plan['days']:[];
        foreach($default['days'] as $day=>$conf){
            $raw=is_array($plan['days'][$day]??null)?$plan['days'][$day]:[];
            $plan['days'][$day]=wp_parse_args($raw,$conf);
            $plan['days'][$day]['breaks']=is_array($plan['days'][$day]['breaks']??null)?$plan['days'][$day]['breaks']:[];
        }
        return $plan;
    }
    public static function save_calendar_plan($calendar_id,$plan){
        update_option('cmap_plan_'.(int)$calendar_id,$plan,false);
    }

    public static function availability_saved($calendar_id){
        return (bool)get_option('cmap_available_saved_'.(int)$calendar_id, false);
    }

    public static function ensure_slots_for_available_dates($calendar_id, $available_dates){
        global $wpdb; $t=self::tables();
        $cal=self::get_calendar((int)$calendar_id); if(!$cal) return 0;
        $plan=self::get_calendar_plan((int)$calendar_id);
        $duration=max(5,(int)($plan['duration']??$cal->duration??60));
        $capacity=max(1,(int)($plan['capacity']??$cal->capacity??1));
        $color=sanitize_hex_color($plan['color']??$cal->color??'#070414')?:($cal->color??'#070414');
        $made=0;
        foreach(array_keys((array)$available_dates) as $date){
            if(!self::valid_date($date)) continue;
            $dow=(int)date('N',strtotime($date)); $conf=$plan['days'][$dow]??[];
            if(isset($conf['enabled']) && empty($conf['enabled'])) continue;
            $intervals=[];
            $start=$conf['start']??'08:00'; $end=$conf['end']??'20:00';
            if(self::valid_time($start) && self::valid_time($end)) $intervals[]=[$start,$end];
            $start2=$conf['start2']??''; $end2=$conf['end2']??'';
            if(self::valid_time($start2) && self::valid_time($end2)) $intervals[]=[$start2,$end2];
            $breaks=is_array($conf['breaks']??null)?$conf['breaks']:[];
            foreach($intervals as $period){
                $open_ts=strtotime($date.' '.self::norm_time($period[0])); $close_ts=strtotime($date.' '.self::norm_time($period[1]));
                if($close_ts <= $open_ts) continue;
                for($cur=$open_ts; $cur+$duration*60 <= $close_ts; $cur += $duration*60){
                    $slot_end=$cur+$duration*60; $blocked=false;
                    foreach($breaks as $br){
                        $bs=strtotime($date.' '.self::norm_time($br['start']??'')); $be=strtotime($date.' '.self::norm_time($br['end']??''));
                        if($bs && $be && $cur < $be && $slot_end > $bs){ $blocked=true; break; }
                    }
                    if($blocked) continue;
                    self::ensure_slot((int)$calendar_id,$date,date('H:i:s',$cur),date('H:i:s',$slot_end),$capacity,$color,'Beschikbare dag');
                    $made++;
                }
            }
        }
        return $made;
    }

    public function rest_routes(){
        register_rest_route('classmodels-agenda/v1','/calendars',['methods'=>'GET','callback'=>[$this,'rest_calendars'],'permission_callback'=>'__return_true']);
        register_rest_route('classmodels-agenda/v1','/slots/(?P<slug>[a-zA-Z0-9_-]+)',['methods'=>'GET','callback'=>[$this,'rest_slots'],'permission_callback'=>'__return_true']);
        register_rest_route('classmodels-agenda/v1','/book',['methods'=>'POST','callback'=>[$this,'rest_book'],'permission_callback'=>'__return_true']);
        register_rest_route('classmodels-agenda/v1','/my-bookings',['methods'=>'GET','callback'=>[$this,'rest_my_bookings'],'permission_callback'=>function(){return is_user_logged_in();}]);
        register_rest_route('classmodels/v1','/portfolio-appointments/me',['methods'=>'GET','callback'=>function($req){ return $this->rest_app_appointment_me($req,'portfolio'); },'permission_callback'=>'__return_true']);
        register_rest_route('classmodels/v1','/portfolio-appointments/book',['methods'=>'POST','callback'=>function($req){ return $this->rest_app_appointment_book($req,'portfolio'); },'permission_callback'=>'__return_true']);
        register_rest_route('classmodels/v1','/portfolio-appointments/cancel',['methods'=>'POST','callback'=>function($req){ return $this->rest_app_appointment_cancel($req,'portfolio'); },'permission_callback'=>'__return_true']);
        register_rest_route('classmodels/v1','/training-appointments/me',['methods'=>'GET','callback'=>function($req){ return $this->rest_app_appointment_me($req,'opleiding'); },'permission_callback'=>'__return_true']);
        register_rest_route('classmodels/v1','/training-appointments/book',['methods'=>'POST','callback'=>function($req){ return $this->rest_app_appointment_book($req,'opleiding'); },'permission_callback'=>'__return_true']);
        register_rest_route('classmodels/v1','/training-appointments/cancel',['methods'=>'POST','callback'=>function($req){ return $this->rest_app_appointment_cancel($req,'opleiding'); },'permission_callback'=>'__return_true']);
    }
    public function rest_calendars(){ return rest_ensure_response(self::get_calendars(true)); }
    public function rest_slots($req){ $cal=self::get_calendar($req['slug']); if(!$cal) return new WP_Error('not_found','Agenda niet gevonden',['status'=>404]); return rest_ensure_response(self::get_slots($cal->id)); }
    public function rest_book($req){ return $this->handle_booking_request($req->get_params(),true); }
    public function rest_my_bookings(){ return rest_ensure_response($this->get_user_bookings(get_current_user_id())); }

    public function admin_head_clean_cm_page(){
        if(empty($_GET['page']) || strpos((string)$_GET['page'], self::SLUG) === false) return;
        echo '<style>body.toplevel_page_cm-agenda-pro .notice:not(.cmap-own-notice),body[class*="cm-agenda-pro"] .notice:not(.cmap-own-notice),body.toplevel_page_cm-agenda-pro .update-nag,body.toplevel_page_cm-agenda-pro div[class*="license"],body.toplevel_page_cm-agenda-pro div[class*="License"],body.toplevel_page_cm-agenda-pro div[class*="eael"],body[class*="cm-agenda-pro"] div[class*="license"],body[class*="cm-agenda-pro"] div[class*="License"]{display:none!important}</style>';
    }
    public function maybe_export_bookings_csv(){
        if(!is_admin()) return;
        if(empty($_GET['page']) || $_GET['page'] !== self::SLUG) return;
        if(isset($_GET['cmap_export']) && $_GET['cmap_export'] === 'bookings'){
            $this->export_bookings_csv();
            exit;
        }
    }
    public function export_bookings_csv(){
        if(!self::admin_user()) wp_die('Geen toegang.');
        check_admin_referer('cmap_export_bookings');
        global $wpdb; $t=self::tables();
        $picked=array_map('intval',(array)($_GET['cals']??[]));
        $fields=array_map('sanitize_key',(array)($_GET['export_fields']??['datum','agenda','naam','email','telefoon','status','leeftijd','gsm','gemeente']));
        if(!$fields) $fields=['datum','agenda','naam','email','telefoon','status'];
        $where='WHERE b.start_at >= %s'; $args=[date('Y-m-d H:i:s',strtotime('-2 years'))];
        if($picked){ $in=implode(',',array_fill(0,count($picked),'%d')); $where.=" AND b.calendar_id IN ($in)"; $args=array_merge($args,$picked); }
        $rows=$wpdb->get_results($wpdb->prepare("SELECT b.*,c.title calendar_title,c.color calendar_color FROM {$t['book']} b JOIN {$t['cal']} c ON c.id=b.calendar_id {$where} ORDER BY b.start_at ASC",$args));
        while (ob_get_level()) { ob_end_clean(); }
        nocache_headers(); header('Content-Type: text/csv; charset=utf-8'); header('Content-Disposition: attachment; filename=class-models-afspraken-'.date('Y-m-d').'.csv'); header('Pragma: no-cache'); header('Expires: 0');
        echo "\xEF\xBB\xBF";
        $out=fopen('php://output','w'); fputcsv($out,$fields,';');
        foreach($rows as $r){ $extra=json_decode((string)$r->fields,true); if(!is_array($extra)) $extra=[]; $line=[];
            foreach($fields as $f){
                if($f==='datum') $line[]=date_i18n('d-m-Y H:i',strtotime($r->start_at));
                elseif($f==='agenda') $line[]=$r->calendar_title;
                elseif($f==='naam') $line[]=$r->name;
                elseif($f==='email') $line[]=$r->email;
                elseif($f==='telefoon' || $f==='gsm') $line[]=$r->phone ?: ($extra['gsm']??$extra['telefoon']??'');
                elseif($f==='status') $line[]=$this->status_label($r->status);
                else $line[]=$extra[$f]??'';
            }
            fputcsv($out,$line,';');
        }
        fclose($out); exit;
    }
    public function calendar_filter_cards($picked=[],$submit=true,$compact=false){
        $cals=self::get_calendars(true); if(!$picked) foreach($cals as $c) $picked[]=(int)$c->id;
        $out='<div class="cmap-source-tabs '.($compact?'is-compact':'').'"><button type="button" class="cmap-source is-active" data-cmap-all><span class="dashicons dashicons-groups"></span><strong>Allemaal</strong></button>';
        foreach($cals as $c){ $active=in_array((int)$c->id,$picked,true); $out.='<label class="cmap-source '.($active?'is-active':'').'" style="--cmap-color:'.esc_attr($c->color).'"><input type="checkbox" name="cals[]" value="'.(int)$c->id.'" '.checked($active,true,false).'><span class="cmap-source-icon"></span><strong>'.self::h($c->title).'</strong></label>'; }
        $out.='</div>'; if($submit) $out.='<button class="cmap-btn cmap-btn-small cmap-apply-top">Toepassen</button>'; return $out;
    }
    public function calendar_select($selected=0, $name='calendar_id'){
        $cals=self::get_calendars(false);
        $out='<select name="'.esc_attr($name).'">';
        foreach($cals as $c){
            $out.='<option value="'.(int)$c->id.'" '.selected((int)$selected,(int)$c->id,false).'>'.self::h($c->title).'</option>';
        }
        return $out.'</select>';
    }
    public function admin_page(){
        if(!self::admin_user()) wp_die('Geen toegang.');
        if(isset($_GET['cmap_export']) && $_GET['cmap_export']==='bookings'){ $this->export_bookings_csv(); return; }
        $tab=isset($_GET['tab'])?sanitize_key($_GET['tab']):'dashboard';
        $this->handle_admin_post();
        echo '<div class="wrap cmap-admin-page"><div class="cmap-admin-panel">';
        switch($tab){
            case 'dashboard': $this->render_admin_dashboard(); break;
            case 'calendars': $this->render_admin_calendars(); break;
            case 'slots': $this->render_admin_slots(); break;
            case 'closed': $this->render_admin_closed(); break;
            case 'fields': $this->render_admin_fields(); break;
            case 'bookings': $this->render_admin_bookings(); break;
            case 'calendar': $this->render_admin_calendar_view(); break;
            case 'templates': $this->render_admin_templates(); break;
            case 'rules': $this->render_admin_rules(); break;
            case 'shortcodes': echo $this->shortcode_list_markup(); break;
            default: $this->render_admin_dashboard();
        }
        echo '</div></div>';
    }
    public function admin_tabs($active){
        $tabs=['dashboard'=>'Overzicht','calendars'=>'Agenda’s','slots'=>'Dagen/uren','closed'=>'Vrije dagen','fields'=>'Formuliervelden','bookings'=>'Afspraken','calendar'=>'Kalender','templates'=>'Mail/SMS','rules'=>'Automatisatie','shortcodes'=>'Shortcodes'];
        $out='<nav class="cmap-tabs">'; foreach($tabs as $k=>$l){ $out.='<a class="'.($active===$k?'is-active':'').'" href="'.esc_url(admin_url('admin.php?page='.self::SLUG.'&tab='.$k)).'">'.esc_html($l).'</a>'; } return $out.'</nav>';
    }


    public function handle_admin_post(){
        if(empty($_POST['cmap_action']) || !self::admin_user()) return; check_admin_referer('cmap_admin');
        global $wpdb; $t=self::tables(); $act=sanitize_key($_POST['cmap_action']); $now=current_time('mysql');
        if($act==='mail_calendar_list'){
            $to=sanitize_text_field($_POST['mail_to']??'');
            $fields=array_map('sanitize_key',(array)($_POST['mail_fields']??[]));
            $picked=array_map('intval',(array)($_POST['cals']??[]));
            $statuses=array_map('sanitize_key',(array)($_POST['statuses']??[]));
            $from=sanitize_text_field($_POST['list_from']??current_time('Y-m-d'));
            $to_date=sanitize_text_field($_POST['list_to']??$from);
            $allowed_status=['pending','confirmed','attended','cancelled','cancelled_cm','no_show'];
            $statuses=array_values(array_intersect($statuses,$allowed_status));
            if(!$statuses) $statuses=['pending','confirmed','attended'];
            $allowed_fields=['afspraak','naam','voornaam','email','telefoon','leeftijd'];
            $fields=array_values(array_intersect($fields,$allowed_fields));
            if(!$fields) $fields=['afspraak','naam','email'];
            if(!self::valid_date($from)) $from=current_time('Y-m-d');
            if(!self::valid_date($to_date)) $to_date=$from;
            if(strtotime($to_date)<strtotime($from)) $to_date=$from;
            $args=[$from.' 00:00:00',$to_date.' 23:59:59'];
            $where='b.start_at BETWEEN %s AND %s';
            if($picked){ $in=implode(',',array_fill(0,count($picked),'%d')); $where.=" AND b.calendar_id IN ($in)"; $args=array_merge($args,$picked); }
            if($statuses){ $in=implode(',',array_fill(0,count($statuses),'%s')); $where.=" AND b.status IN ($in)"; $args=array_merge($args,$statuses); }
            $rows=$wpdb->get_results($wpdb->prepare("SELECT b.*,c.title calendar_title,c.color calendar_color FROM {$t['book']} b JOIN {$t['cal']} c ON c.id=b.calendar_id WHERE {$where} ORDER BY b.start_at ASC",$args));
            if($to && is_email($to)){
                $labels=['afspraak'=>'Afspraak','naam'=>'Naam','voornaam'=>'Voornaam','email'=>'E-mail','telefoon'=>'Telefoon/GSM','leeftijd'=>'Leeftijd'];
                $body='<p>Geselecteerde afsprakenlijst van '.esc_html(date_i18n('d-m-Y',strtotime($from))).' tot '.esc_html(date_i18n('d-m-Y',strtotime($to_date))).'.</p>';
                $body.='<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:13px"><tr>';
                foreach($fields as $f){ $body.='<th align="left">'.esc_html($labels[$f]??$f).'</th>'; }
                $body.='</tr>';
                foreach($rows as $r){ $body.='<tr>'; foreach($fields as $f){ $body.='<td>'.esc_html($this->booking_mail_value($r,$f)).'</td>'; } $body.='</tr>'; }
                $body.='</table>';
                $sent=wp_mail($to,'Class Models afsprakenlijst '.$from.' - '.$to_date,$body,['Content-Type: text/html; charset=UTF-8']);
                echo '<div class="notice '.($sent?'notice-success':'notice-error').'"><p>'.($sent?'Lijst gemaild naar '.esc_html($to).'.':'Mail kon niet verzonden worden.').'</p></div>';
            } else { echo '<div class="notice notice-error"><p>Vul een geldig e-mailadres in om de lijst te mailen.</p></div>'; }
        }
        if($act==='save_calendar'){
            $id=(int)($_POST['id']??0); $existing=$id?self::get_calendar($id):null;
            $title=sanitize_text_field($_POST['title']??'');
            $slug=sanitize_title($_POST['slug']??''); if(!$slug) $slug=sanitize_title($title?:'agenda');
            $active=empty($_POST['active'])?0:1;
            $data=[
                'slug'=>$slug,
                'title'=>$title,
                'description'=>sanitize_textarea_field($_POST['description']??''),
                'color'=>sanitize_hex_color($_POST['color']??'#070414')?:'#070414',
                'duration'=>max(5,(int)($_POST['duration']??30)),
                'capacity'=>max(1,(int)($_POST['capacity']??1)),
                'active'=>$active,
                'public_booking'=>$active,
                'use_model_data'=>1,
                'legacy_type'=>sanitize_key($_POST['legacy_type']??($existing->legacy_type??'generic')),
                'admin_only'=>empty($_POST['admin_only'])?0:1,
                'sort_order'=>(int)($_POST['sort_order']??100),
                'updated_at'=>$now
            ];
            if($id){
                $wpdb->update($t['cal'],$data,['id'=>$id]);
            } else {
                $data['created_at']=$now;
                $wpdb->insert($t['cal'],$data);
                $id=(int)$wpdb->insert_id;
                self::seed_fields($id,$data['legacy_type']);
            }
            echo '<div class="notice notice-success"><p>Agenda opgeslagen.</p></div>';
        }
        if($act==='clone_calendar'){
            $src=(int)($_POST['calendar_id']??0);
            $cal=$src ? self::get_calendar($src) : null;
            if($cal){
                $base=sanitize_title($cal->slug.'-kopie'); $slug=$base; $i=2;
                while(self::get_calendar($slug)){ $slug=$base.'-'.$i; $i++; }
                $data=['slug'=>$slug,'title'=>$cal->title.' kopie','description'=>$cal->description,'color'=>$cal->color,'duration'=>(int)$cal->duration,'capacity'=>(int)$cal->capacity,'active'=>(int)$cal->active,'public_booking'=>(int)$cal->public_booking,'use_model_data'=>(int)$cal->use_model_data,'legacy_type'=>$cal->legacy_type,'admin_only'=>(int)$cal->admin_only,'sort_order'=>(int)$cal->sort_order+1,'created_at'=>$now,'updated_at'=>$now];
                $wpdb->insert($t['cal'],$data); $new_id=(int)$wpdb->insert_id;
                if($new_id){
                    $fields=$wpdb->get_results($wpdb->prepare("SELECT * FROM {$t['fields']} WHERE calendar_id=%d ORDER BY sort_order,id",$src));
                    foreach($fields as $f){
                        $wpdb->insert($t['fields'], ['calendar_id'=>$new_id,'field_key'=>$f->field_key,'label'=>$f->label,'type'=>$f->type,'required'=>(int)$f->required,'width'=>$f->width,'placeholder'=>$f->placeholder,'title_position'=>$f->title_position,'sort_order'=>(int)$f->sort_order,'active'=>(int)$f->active,'options'=>$f->options]);
                    }
                    $slots=$wpdb->get_results($wpdb->prepare("SELECT * FROM {$t['slots']} WHERE calendar_id=%d",$src));
                    foreach($slots as $sl){ $wpdb->insert($t['slots'], ['calendar_id'=>$new_id,'slot_date'=>$sl->slot_date,'start_time'=>$sl->start_time,'end_time'=>$sl->end_time,'capacity'=>(int)$sl->capacity,'color'=>$sl->color,'status'=>$sl->status,'notes'=>$sl->notes,'created_at'=>$now,'updated_at'=>$now]); }
                    $closed=$wpdb->get_results($wpdb->prepare("SELECT * FROM {$t['closed']} WHERE calendar_id=%d",$src));
                    foreach($closed as $cl){ $wpdb->replace($t['closed'], ['calendar_id'=>$new_id,'closed_date'=>$cl->closed_date,'reason'=>$cl->reason,'created_at'=>$now]); }
                    $rules=$wpdb->get_results($wpdb->prepare("SELECT * FROM {$t['rules']} WHERE calendar_id=%d",$src));
                    foreach($rules as $ru){ $wpdb->insert($t['rules'], ['calendar_id'=>$new_id,'template_id'=>(int)$ru->template_id,'trigger_type'=>$ru->trigger_type,'offset_minutes'=>(int)$ru->offset_minutes,'active'=>(int)$ru->active]); }
                    $plan=get_option('cmap_plan_'.$src, []);
                    if(is_array($plan) && $plan) update_option('cmap_plan_'.$new_id,$plan,false);
                    echo '<div class="notice notice-success"><p>Agenda volledig gekloond: instellingen, velden, momenten, vrije dagen en automatisaties.</p></div>';
                }
            }
        }
        if($act==='delete_calendar'){
            $cid=(int)($_POST['calendar_id']??0);
            if($cid){
                $wpdb->delete($t['book'],['calendar_id'=>$cid]);
                $wpdb->delete($t['slots'],['calendar_id'=>$cid]);
                $wpdb->delete($t['fields'],['calendar_id'=>$cid]);
                $wpdb->delete($t['closed'],['calendar_id'=>$cid]);
                $wpdb->delete($t['rules'],['calendar_id'=>$cid]);
                $wpdb->delete($t['cal'],['id'=>$cid]);
                delete_option('cmap_plan_'.$cid);
                echo '<div class="notice notice-success"><p>Agenda verwijderd.</p></div>';
            }
        }
        if($act==='save_slot'){
            $cal=(int)($_POST['calendar_id']??0); $date=sanitize_text_field($_POST['slot_date']??''); $start=sanitize_text_field($_POST['start_time']??''); $end=sanitize_text_field($_POST['end_time']??'');
            if($cal && self::valid_date($date) && self::valid_time($start) && self::valid_time($end)){ self::ensure_slot($cal,$date,$start,$end,max(1,(int)($_POST['capacity']??1)),sanitize_hex_color($_POST['color']??'')?:'',sanitize_textarea_field($_POST['notes']??'')); echo '<div class="notice notice-success"><p>Moment opgeslagen.</p></div>'; }
        }
        if($act==='bulk_slots'){
            $cal=(int)($_POST['calendar_id']??0); $from=sanitize_text_field($_POST['from_date']??''); $to=sanitize_text_field($_POST['to_date']??''); $days=array_map('intval',(array)($_POST['weekdays']??[])); $count=0;
            $times=[];
            foreach((array)($_POST['selected_times']??[]) as $line){ $line=sanitize_text_field($line); if(strpos($line,'-')!==false) $times[]=$line; }
            if(!$times && !empty($_POST['times'])) $times=array_filter(array_map('trim',explode("
",sanitize_textarea_field($_POST['times']))));
            if($cal && self::valid_date($from) && self::valid_date($to) && $times && $days){
                for($ts=strtotime($from); $ts<=strtotime($to); $ts=strtotime('+1 day',$ts)){
                    if(!in_array((int)date('N',$ts),$days,true)) continue; $d=date('Y-m-d',$ts);
                    foreach($times as $line){ $parts=preg_split('/\s*-\s*/',$line); if(count($parts)<2) continue; if(self::valid_time($parts[0]) && self::valid_time($parts[1])){ self::ensure_slot($cal,$d,self::norm_time($parts[0]),self::norm_time($parts[1]),max(1,(int)($_POST['capacity']??1))); $count++; } }
                }
                echo '<div class="notice notice-success"><p>'.$count.' momenten toegevoegd/bijgewerkt.</p></div>';
            }
        }
        if($act==='save_week_plan'){
            $cal=(int)($_POST['calendar_id']??0); $calendar=$cal?self::get_calendar($cal):null;
            $duration=max(5,(int)($_POST['duration']??($calendar->duration??60)));
            $capacity=max(1,(int)($_POST['capacity']??($calendar->capacity??1)));
            $color=sanitize_hex_color($_POST['color']??($calendar->color??'#070414'))?:($calendar->color??'#070414');
            $from=current_time('Y-m-d');
            $to=date('Y-m-d',strtotime('+365 days',strtotime($from)));
            $made=0;
            $plan=['duration'=>$duration,'capacity'=>$capacity,'color'=>$color,'days'=>[]];
            if($cal && $calendar){
                for($d=1;$d<=7;$d++){
                    $enabled=!empty($_POST['day_enabled'][$d])?1:0;
                    $start=sanitize_text_field($_POST['day_start'][$d]??'08:00');
                    $end=sanitize_text_field($_POST['day_end'][$d]??($d>=6?'18:00':'20:00'));
                    $start2=sanitize_text_field($_POST['day_start2'][$d]??'');
                    $end2=sanitize_text_field($_POST['day_end2'][$d]??'');
                    $breaks=[];
                    $breakStarts=(array)($_POST['day_break_start'][$d]??[]);
                    $breakEnds=(array)($_POST['day_break_end'][$d]??[]);
                    foreach($breakStarts as $i=>$bs){
                        $bs=sanitize_text_field($bs); $be=sanitize_text_field($breakEnds[$i]??'');
                        if(self::valid_time($bs) && self::valid_time($be) && strtotime('2000-01-01 '.self::norm_time($be)) > strtotime('2000-01-01 '.self::norm_time($bs))){
                            $breaks[]=['start'=>substr($bs,0,5),'end'=>substr($be,0,5)];
                        }
                    }
                    $plan['days'][$d]=['enabled'=>$enabled,'start'=>substr($start,0,5),'end'=>substr($end,0,5),'start2'=>substr($start2,0,5),'end2'=>substr($end2,0,5),'breaks'=>$breaks];
                }
                self::save_calendar_plan($cal,$plan);
                $slot_ids=$wpdb->get_col($wpdb->prepare("SELECT id FROM {$t['slots']} WHERE calendar_id=%d AND slot_date BETWEEN %s AND %s",$cal,$from,$to));
                foreach((array)$slot_ids as $slot_id){
                    if(self::slot_booked_count((int)$slot_id)===0) $wpdb->delete($t['slots'],['id'=>(int)$slot_id]);
                }
                for($ts=strtotime($from); $ts<=strtotime($to); $ts=strtotime('+1 day',$ts)){
                    $dow=(int)date('N',$ts); $conf=$plan['days'][$dow]??[];
                    if(empty($conf['enabled'])) continue;
                    $date=date('Y-m-d',$ts);
                    if(self::is_closed($cal,$date)) continue;
                    $intervals=[];
                    $open=$conf['start']??''; $close=$conf['end']??'';
                    if(self::valid_time($open) && self::valid_time($close)) $intervals[]=[$open,$close];
                    $open2=$conf['start2']??''; $close2=$conf['end2']??'';
                    if(self::valid_time($open2) && self::valid_time($close2)) $intervals[]=[$open2,$close2];
                    if(!$intervals) continue;
                    $breaks=is_array($conf['breaks']??null)?$conf['breaks']:[];
                    foreach($intervals as $period){
                        $open_ts=strtotime($date.' '.self::norm_time($period[0])); $close_ts=strtotime($date.' '.self::norm_time($period[1]));
                        if($close_ts<=$open_ts) continue;
                        for($cur=$open_ts; $cur+$duration*60 <= $close_ts; $cur += $duration*60){
                            $slot_end=$cur+$duration*60; $skip=false;
                            foreach($breaks as $br){
                                $bs=$br['start']??''; $be=$br['end']??'';
                                if(!self::valid_time($bs) || !self::valid_time($be)) continue;
                                $b1=strtotime($date.' '.self::norm_time($bs)); $b2=strtotime($date.' '.self::norm_time($be));
                                if($cur < $b2 && $slot_end > $b1){ $skip=true; break; }
                            }
                            if(!$skip){ self::ensure_slot($cal,$date,date('H:i:s',$cur),date('H:i:s',$slot_end),$capacity,$color,'Aangemaakt via weekplanning'); $made++; }
                        }
                    }
                }
                $wpdb->update($t['cal'],['duration'=>$duration,'capacity'=>$capacity,'color'=>$color,'public_booking'=>((int)$calendar->active?1:0),'use_model_data'=>1,'updated_at'=>$now],['id'=>$cal]);
                echo '<div class="notice notice-success"><p>'.$made.' afspraakblokken aangemaakt of bijgewerkt. De popup blijft open tot je zelf op sluiten drukt.</p></div>';
            }
        }
        if($act==='delete_slot') $wpdb->delete($t['slots'],['id'=>(int)($_POST['slot_id']??0)]);
        if($act==='save_closed'){
            $cal=(int)($_POST['calendar_id']??0); $date=sanitize_text_field($_POST['closed_date']??''); if($cal && self::valid_date($date)) $wpdb->replace($t['closed'], ['calendar_id'=>$cal,'closed_date'=>$date,'reason'=>sanitize_text_field($_POST['reason']??''),'created_at'=>$now]);
        }
        if($act==='save_closed_dates'){
            $cal=(int)($_POST['calendar_id']??0); $reason=sanitize_text_field($_POST['reason']??'Niet beschikbaar'); $year=(int)($_POST['year']??date('Y')); $dates=(array)($_POST['closed_dates']??[]);
            $available=self::save_available_dates($cal,$year,$dates,$reason);
            echo '<div class="notice notice-success"><p>'.$available.' beschikbare dagen opgeslagen. Niet geselecteerde dagen zijn niet boekbaar.</p></div>';
        }
        if($act==='delete_closed') $wpdb->delete($t['closed'],['id'=>(int)($_POST['closed_id']??0)]);
        if($act==='save_field'){
            $id=(int)($_POST['id']??0); $data=['calendar_id'=>(int)$_POST['calendar_id'],'field_key'=>sanitize_key($_POST['field_key']??''),'label'=>sanitize_text_field($_POST['label']??''),'type'=>sanitize_key($_POST['type']??'text'),'required'=>empty($_POST['required'])?0:1,'width'=>sanitize_text_field($_POST['width']??'1'),'placeholder'=>sanitize_text_field($_POST['placeholder']??''),'title_position'=>sanitize_key($_POST['title_position']??'above'),'sort_order'=>(int)($_POST['sort_order']??100),'active'=>empty($_POST['active'])?0:1,'options'=>sanitize_textarea_field($_POST['options']??'')];
            if($id) $wpdb->update($t['fields'],$data,['id'=>$id]); else $wpdb->insert($t['fields'],$data); echo '<div class="notice notice-success"><p>Veld opgeslagen.</p></div>';
        }
        if($act==='save_field_flags'){
            $calendar_id=(int)($_POST['calendar_id']??0);
            if(!empty($_POST['cmap_delete_field_inline'])){
                $fid=(int)$_POST['cmap_delete_field_inline'];
                $wpdb->delete($t['fields'],['id'=>$fid,'calendar_id'=>$calendar_id]);
                echo '<div class="notice notice-success"><p>Veld verwijderd.</p></div>';
                return;
            }
            $orders=(array)($_POST['sort_order']??[]);
            $required=(array)($_POST['required']??[]);
            $active=(array)($_POST['active']??[]);
            $ids=array_map('intval',(array)($_POST['field_ids']??[]));
            foreach($ids as $fid){
                $wpdb->update($t['fields'],[
                    'required'=>isset($required[$fid])?1:0,
                    'active'=>isset($active[$fid])?1:0,
                    'sort_order'=>isset($orders[$fid])?(int)$orders[$fid]:100,
                ],['id'=>$fid,'calendar_id'=>$calendar_id]);
            }
            echo '<div class="notice notice-success"><p>Veldenlijst opgeslagen.</p></div>';
        }
        if($act==='clone_fieldset'){
            $from=(int)($_POST['from_calendar_id']??0);
            $to_cal=(int)($_POST['to_calendar_id']??0);
            $replace=!empty($_POST['replace_target']);
            if($from && $to_cal && $from!==$to_cal){
                if($replace) $wpdb->delete($t['fields'],['calendar_id'=>$to_cal]);
                $rows=$wpdb->get_results($wpdb->prepare("SELECT * FROM {$t['fields']} WHERE calendar_id=%d ORDER BY sort_order,id",$from));
                foreach($rows as $r){
                    $exists=$wpdb->get_var($wpdb->prepare("SELECT id FROM {$t['fields']} WHERE calendar_id=%d AND field_key=%s",$to_cal,$r->field_key));
                    if($exists && !$replace) continue;
                    $wpdb->insert($t['fields'],['calendar_id'=>$to_cal,'field_key'=>$r->field_key,'label'=>$r->label,'type'=>$r->type,'required'=>(int)$r->required,'width'=>$r->width,'placeholder'=>$r->placeholder,'title_position'=>$r->title_position,'sort_order'=>(int)$r->sort_order,'active'=>(int)$r->active,'options'=>$r->options]);
                }
                echo '<div class="notice notice-success"><p>Veldenset gekloond.</p></div>';
            }
        }
        if($act==='delete_field') $wpdb->delete($t['fields'],['id'=>(int)($_POST['field_id']??0)]);
        if($act==='save_template'){
            $id=(int)($_POST['id']??0); $data=['name'=>sanitize_text_field($_POST['name']??''),'channel'=>sanitize_key($_POST['channel']??'email'),'subject'=>sanitize_text_field($_POST['subject']??''),'body'=>wp_kses_post($_POST['body']??''),'active'=>empty($_POST['active'])?0:1,'updated_at'=>$now];
            if($id) $wpdb->update($t['templates'],$data,['id'=>$id]); else { $data['created_at']=$now; $wpdb->insert($t['templates'],$data); }
            echo '<div class="notice notice-success"><p>Template opgeslagen.</p></div>';
        }
        if($act==='delete_template') $wpdb->delete($t['templates'],['id'=>(int)($_POST['template_id']??0)]);
        if($act==='save_rule'){
            $id=(int)($_POST['id']??0);
            $preset=sanitize_text_field($_POST['offset_preset']??'custom');
            $offset=($preset!=='' && $preset!=='custom') ? (int)$preset : (int)($_POST['offset_minutes']??0);
            $data=['calendar_id'=>(int)($_POST['calendar_id']??0),'template_id'=>(int)($_POST['template_id']??0),'trigger_type'=>sanitize_key($_POST['trigger_type']??'confirmation'),'offset_minutes'=>$offset,'active'=>empty($_POST['active'])?0:1];
            if($data['calendar_id'] && $data['template_id']){
                if($id) $wpdb->update($t['rules'],$data,['id'=>$id]); else $wpdb->insert($t['rules'],$data);
                echo '<div class="notice notice-success"><p>Automatisatie opgeslagen.</p></div>';
            }
        }
        if($act==='delete_rule') $wpdb->delete($t['rules'],['id'=>(int)($_POST['rule_id']??0)]);
        if($act==='save_booking' || $act==='update_booking'){
            $bid=(int)($_POST['booking_id']??0); $date=sanitize_text_field($_POST['booking_date']??''); $start=sanitize_text_field($_POST['booking_start']??($_POST['start_time']??'')); $end=sanitize_text_field($_POST['booking_end']??($_POST['end_time']??''));
            $status=sanitize_key($_POST['status']??'pending'); $allowed=['pending','confirmed','cancelled','cancelled_cm','attended','no_show']; if(!in_array($status,$allowed,true)) $status='pending';
            if($bid && self::valid_date($date) && self::valid_time($start) && self::valid_time($end)){
                $wpdb->update($t['book'],['start_at'=>$date.' '.self::norm_time($start),'end_at'=>$date.' '.self::norm_time($end),'status'=>$status,'updated_at'=>$now],['id'=>$bid]);
                echo '<div class="notice notice-success"><p>Afspraak opgeslagen.</p></div>';
            }
        }
        if($act==='delete_booking'){
            $bid=(int)($_POST['booking_id']??0); if($bid){ $wpdb->delete($t['book'],['id'=>$bid]); echo '<div class="notice notice-success"><p>Afspraak verwijderd.</p></div>'; }
        }
    }

    public function ajax_admin_save(){
        if(!self::admin_user()) wp_send_json_error(['message'=>'Geen toegang.'],403);
        if(!check_ajax_referer('cmap_ajax','ajax_nonce',false)) wp_send_json_error(['message'=>'Ongeldige sessie.'],403);
        $act=sanitize_key($_POST['cmap_action']??'');
        if($act==='save_closed_dates'){
            $cal=(int)($_POST['calendar_id']??0);
            $reason=sanitize_text_field($_POST['reason']??'Niet beschikbaar');
            $year=(int)($_POST['year']??date('Y'));
            $dates=(array)($_POST['closed_dates']??[]);
            $available=self::save_available_dates($cal,$year,$dates,$reason);
            wp_send_json_success(['message'=>$available.' beschikbare dagen opgeslagen. Niet geselecteerde dagen zijn niet boekbaar.','count'=>$available]);
        }
        ob_start();
        $this->handle_admin_post();
        $html=ob_get_clean();
        wp_send_json_success(['message'=>'Opgeslagen.','html'=>$html]);
    }

    public function render_admin_dashboard(){
        $cals=self::get_calendars(false);
        echo '<section class="cmap-card"><h2>Agenda overzicht</h2><div class="cmap-dashboard">';
        foreach($cals as $c){
            echo '<div class="cmap-stat"><span class="cmap-dot" style="background:'.esc_attr($c->color).'"></span><strong>'.self::h($c->title).'</strong><small>['.self::h($c->slug).']</small><div class="cmap-stat-actions"><a class="cmap-mini" href="'.esc_url(admin_url('admin.php?page='.self::SLUG.'&tab=slots&calendar_id='.$c->id)).'">momenten</a><a class="cmap-mini" href="'.esc_url(admin_url('admin.php?page='.self::SLUG.'&tab=fields&calendar_id='.$c->id)).'">velden</a><a class="cmap-mini" href="'.esc_url(admin_url('admin.php?page='.self::SLUG.'&tab=calendars')).'">bewerken</a><form method="post" class="cmap-mini-form">'.wp_nonce_field('cmap_admin','_wpnonce',true,false).'<input type="hidden" name="cmap_action" value="clone_calendar"><input type="hidden" name="calendar_id" value="'.(int)$c->id.'"><button class="cmap-mini" type="submit">kloon</button></form></div></div>';
        }
        echo '</div></section>';
    }

    public function render_admin_calendars(){
        $cals=self::get_calendars(false);
        $current=(int)($_GET['calendar_id']??0); if(!$current && $cals) $current=(int)$cals[0]->id;
        $active_cal=$current ? self::get_calendar($current) : null;
        echo '<section class="cmap-card cmap-agenda-workspace"><div class="cmap-agenda-left"><div class="cmap-agenda-left-head"><h2>CM agenda</h2><button type="button" class="cmap-btn cmap-btn-small js-cmap-open" data-target="cmap-new-agenda">Nieuwe agenda</button></div><div class="cmap-agenda-list">';
        foreach($cals as $c){
            $url=admin_url('admin.php?page='.self::SLUG.'&tab=calendars&calendar_id='.$c->id);
            $bookings=self::calendar_booking_total((int)$c->id);
            echo '<div class="cmap-agenda-card '.($current==(int)$c->id?'is-active':'').'"><a class="cmap-agenda-item" href="'.esc_url($url).'"><span class="cmap-dot" style="background:'.esc_attr($c->color).'"></span><span class="cmap-agenda-text"><strong>'.self::h($c->title).'</strong><em>'.self::h($c->slug).'</em></span><small>'.(int)$c->duration.'m</small><span class="cmap-agenda-check '.($c->active?'is-on':'is-off').'">'.($c->active?'✓':'×').'</span></a><div class="cmap-agenda-submeta"><span>Ingeschreven: '.(int)$bookings.'</span></div><div class="cmap-agenda-card-actions"><form method="post" class="cmap-inline-form">'.wp_nonce_field('cmap_admin','_wpnonce',true,false).'<input type="hidden" name="cmap_action" value="clone_calendar"><input type="hidden" name="calendar_id" value="'.(int)$c->id.'"><button class="cmap-btn cmap-btn-small" type="submit">Kloon agenda</button></form><form method="post" class="cmap-inline-form" onsubmit="return confirm(&quot;Deze agenda volledig verwijderen?&quot;)">'.wp_nonce_field('cmap_admin','_wpnonce',true,false).'<input type="hidden" name="cmap_action" value="delete_calendar"><input type="hidden" name="calendar_id" value="'.(int)$c->id.'"><button class="cmap-btn cmap-btn-small cmap-btn-close" type="submit">Verwijder agenda</button></form></div></div>';
        }
        echo '</div></div><div class="cmap-agenda-right">';
        if($active_cal){
            $shortcode='[cm_agenda_booking calendar="'.$active_cal->slug.'"]';
            $plan=self::get_calendar_plan((int)$active_cal->id);
            $days=[1=>'ma',2=>'di',3=>'wo',4=>'do',5=>'vr',6=>'za',7=>'zo'];
            echo '<div class="cmap-agenda-toolbar"><div class="cmap-agenda-title-wrap"><h2>'.self::h($active_cal->title).'</h2></div><div class="cmap-toolbar-actions"><button type="button" class="cmap-btn cmap-btn-small js-cmap-open" data-target="cmap-edit-agenda">Bewerken</button></div></div>';
            echo '<div class="cmap-agenda-minimal-box"><button type="button" class="cmap-shortcode-copy" data-shortcode="'.esc_attr($shortcode).'">Kopieer shortcode <span class="cmap-copy-icon">⧉</span><span class="cmap-copy-ok">✓</span></button></div>';
            echo '<div class="cmap-agenda-overview-layout"><div class="cmap-agenda-week-box cmap-agenda-week-left"><h3>Openingsuren</h3><div class="cmap-agenda-week-list">';
            foreach($days as $n=>$label){
                $conf=$plan['days'][$n]??[];
                $enabled=!empty($conf['enabled']);
                $line=$enabled ? self::h(($conf['start']??'08:00').' - '.($conf['end']??($n>=6?'18:00':'20:00'))) : 'gesloten';
                $s2=trim((string)($conf['start2']??'')); $e2=trim((string)($conf['end2']??''));
                if($enabled && self::valid_time($s2) && self::valid_time($e2)) $line.=' / '.self::h($s2.' - '.$e2);
                $breaks=is_array($conf['breaks']??null)?$conf['breaks']:[];
                echo '<div class="cmap-agenda-week-item"><strong>'.esc_html($label).'</strong><span class="'.($enabled?'':'is-closed').'">'.$line.'</span>';
                if($breaks){ echo '<em>'; $parts=[]; foreach($breaks as $br){ if(!empty($br['start'])&&!empty($br['end'])) $parts[]=self::h($br['start'].'-'.$br['end']); } echo implode(', ',$parts).'</em>'; }
                echo '</div>';
            }
            echo '</div></div>';
            echo '<div class="cmap-agenda-info-grid"><div><span>Kleur</span><b><span class="cmap-color-pill" style="background:'.esc_attr($active_cal->color).'">'.self::h($active_cal->color).'</span></b></div><div><span>Duur afspraak</span><b>'.(int)$active_cal->duration.' minuten</b></div><div><span>Afspraken per opening</span><b>'.(int)$active_cal->capacity.'</b></div><div><span>Status</span><b class="'.($active_cal->active?'cmap-text-green':'cmap-text-red').'">'.($active_cal->active?'actief':'inactief').'</b></div><div><span>Ingeschreven</span><b>'.(int)self::calendar_booking_total((int)$active_cal->id).'</b></div></div></div>';
        } else { echo '<div class="cmap-empty">Geen agenda gevonden.</div>'; }
        echo '</div></section>';
        $this->calendar_modal('cmap-new-agenda',null);
        if($active_cal){ $this->calendar_modal('cmap-edit-agenda',$active_cal); $this->planning_modal('cmap-plan-agenda',$active_cal); $this->closed_days_modal('cmap-closed-agenda',$active_cal); }
    }

    private function modal_switcher($active,$cal){
        $items=['edit'=>'Bewerken','plan'=>'Planning','closed'=>'Vrije dagen'];
        $map=['edit'=>'cmap-edit-agenda','plan'=>'cmap-plan-agenda','closed'=>'cmap-closed-agenda'];
        $out='<div class="cmap-modal-switcher">';
        foreach($items as $key=>$label){ $out.='<button type="button" class="cmap-modal-tab '.($active===$key?'is-active':'').'" data-target="'.$map[$key].'">'.esc_html($label).'</button>'; }
        return $out.'</div>';
    }

    public function calendar_modal($id,$cal=null){
        $is_edit=$cal && !empty($cal->id); $title=$is_edit?'Agenda bewerken':'Nieuwe agenda';
        $legacy=$is_edit ? ($cal->legacy_type?:'generic') : 'generic';
        echo '<div id="'.esc_attr($id).'" class="cmap-modal cmap-modal-large"><div class="cmap-modal-box cmap-modal-panel"><button type="button" class="cmap-modal-close js-cmap-close">×</button><div class="cmap-modal-head"><h2>'.esc_html($title).'</h2></div><div class="cmap-modal-subtitle">'.($is_edit?self::h($cal->title):'Nieuwe agenda').'</div>';
        if($is_edit) echo $this->modal_switcher('edit',$cal);
        echo '<form method="post" class="cmap-form js-cmap-modal-form" data-modal-id="'.esc_attr($id).'" data-reopen="1">'.wp_nonce_field('cmap_admin','_wpnonce',true,false).'<input type="hidden" name="cmap_action" value="save_calendar"><input type="hidden" name="id" value="'.($is_edit?(int)$cal->id:0).'"><input type="hidden" name="legacy_type" value="'.esc_attr($legacy).'"><input type="hidden" name="use_model_data" value="1"><div class="cmap-modal-grid cmap-modal-grid-2"><div class="cmap-stack-rows"><div class="cmap-form-line"><label>Titel</label><div><input name="title" class="js-cmap-title-sync" required value="'.($is_edit?esc_attr($cal->title):'').'" placeholder="Naam van de agenda"></div></div><div class="cmap-form-line"><label>Slug</label><div><input name="slug" class="js-cmap-slug-sync" value="'.($is_edit?esc_attr($cal->slug):'').'" placeholder="intake-gesprek"></div></div><div class="cmap-form-line"><label>Type</label><div><input value="'.($is_edit?esc_attr($cal->title):'Nieuwe agenda').'" class="js-cmap-type-mirror" readonly></div></div><div class="cmap-form-line"><label>Kleur</label><div><input type="color" class="cmap-color-tall" name="color" value="'.esc_attr($is_edit?$cal->color:'#070414').'"></div></div></div><div class="cmap-stack-rows"><div class="cmap-form-line"><label>Duur afspraak</label><div><input type="number" min="5" step="5" name="duration" value="'.esc_attr($is_edit?(int)$cal->duration:60).'"></div></div><div class="cmap-form-line"><label>Afspraken per opening</label><div><input type="number" min="1" name="capacity" value="'.esc_attr($is_edit?(int)$cal->capacity:1).'"></div></div><div class="cmap-form-line"><label>Volgorde</label><div><input type="number" name="sort_order" value="'.esc_attr($is_edit?(int)$cal->sort_order:100).'"></div></div><div class="cmap-form-line"><label>Status</label><div><label class="cmap-toggle-line"><input type="checkbox" name="active" '.checked(!$is_edit || $cal->active,true,false).'><span class="cmap-status-preview '.((!$is_edit || $cal->active)?'is-on':'is-off').'">'.((!$is_edit || $cal->active)?'Actief / frontend zichtbaar':'inactief').'</span></label></div></div></div></div><div class="cmap-form-line cmap-form-line-block"><label>Omschrijving</label><div><textarea name="description" placeholder="Interne beschrijving of notitie">'.($is_edit?esc_textarea($cal->description):'').'</textarea></div></div><div class="cmap-form-line"><label>Alleen admin</label><div><label class="cmap-toggle-line"><input type="checkbox" name="admin_only" '.checked($is_edit && $cal->admin_only,true,false).'><span>Enkel intern tonen</span></label></div></div><div class="cmap-modal-feedback" aria-live="polite"></div><div class="cmap-modal-actions"><button class="cmap-btn" type="submit">Opslaan</button><button type="button" class="cmap-btn cmap-btn-close js-cmap-close">Sluiten</button></div></form></div></div>';
    }

    public function planning_modal($id,$cal){
        $days=[1=>'maandag',2=>'dinsdag',3=>'woensdag',4=>'donderdag',5=>'vrijdag',6=>'zaterdag',7=>'zondag'];
        $plan=self::get_calendar_plan((int)$cal->id);
        $form_action=admin_url('admin.php?page='.self::SLUG.'&tab=calendars&calendar_id='.(int)$cal->id);
        echo '<div id="'.esc_attr($id).'" class="cmap-modal cmap-modal-xl"><div class="cmap-modal-box cmap-modal-panel"><button type="button" class="cmap-modal-close js-cmap-close">×</button><div class="cmap-modal-head"><h2>Planning - '.self::h($cal->title).'</h2></div>'.$this->modal_switcher('plan',$cal).'<form method="post" action="'.esc_url($form_action).'" class="cmap-form js-cmap-modal-form" data-modal-id="'.esc_attr($id).'" data-reopen="1">'.wp_nonce_field('cmap_admin','_wpnonce',true,false).'<input type="hidden" name="cmap_action" value="save_week_plan"><input type="hidden" name="calendar_id" value="'.(int)$cal->id.'"><input type="hidden" name="duration" value="'.(int)($plan['duration']??$cal->duration).'"><input type="hidden" name="capacity" value="'.(int)($plan['capacity']??$cal->capacity).'"><input type="hidden" name="color" value="'.esc_attr($plan['color']??$cal->color).'"><div class="cmap-plan-compact cmap-plan-v18">';
        foreach($days as $n=>$label){
            $conf=$plan['days'][$n]??['enabled'=>1,'start'=>'08:00','end'=>$n>=6?'18:00':'20:00','start2'=>'','end2'=>'','breaks'=>[]];
            $breaks=is_array($conf['breaks']??null)?array_values($conf['breaks']):[];
            echo '<div class="cmap-plan-row-v18" data-day="'.$n.'">';
            echo '<div class="cmap-plan-day-v18"><label class="cmap-plan-check-v18"><input id="cmap-day-'.$n.'" type="checkbox" name="day_enabled['.$n.']" value="1" '.checked(!empty($conf['enabled']),true,false).'></label><strong>'.esc_html($label).'</strong></div>';
            echo '<div class="cmap-plan-times-v18"><span>Van</span><input type="time" name="day_start['.$n.']" value="'.esc_attr($conf['start']??'08:00').'"><span>Tot</span><input type="time" name="day_end['.$n.']" value="'.esc_attr($conf['end']??($n>=6?'18:00':'20:00')).'"><i></i><span>Van</span><input type="time" name="day_start2['.$n.']" value="'.esc_attr($conf['start2']??'').'"><span>Tot</span><input type="time" name="day_end2['.$n.']" value="'.esc_attr($conf['end2']??'').'"><button type="button" class="cmap-btn cmap-btn-small cmap-btn-ghost js-cmap-add-break" data-day="'.$n.'">onderbreking</button></div>';
            echo '<div class="cmap-breaks cmap-breaks-v18" id="cmap-breaks-'.$n.'">';
            foreach($breaks as $br){ echo '<div class="cmap-break-row"><span class="cmap-break-label">ONDERBREKING</span><span class="cmap-break-between">Van</span><input type="time" name="day_break_start['.$n.'][]" value="'.esc_attr($br['start']??'').'"><span class="cmap-break-between">tot</span><input type="time" name="day_break_end['.$n.'][]" value="'.esc_attr($br['end']??'').'"><button type="button" class="cmap-break-remove js-cmap-remove-break">×</button></div>'; }
            echo '</div></div>';
        }
        echo '</div><div class="cmap-modal-feedback" aria-live="polite"></div><div class="cmap-modal-actions"><button class="cmap-btn" type="submit">Opslaan</button><button type="button" class="cmap-btn cmap-btn-close js-cmap-close">Sluiten</button></div></form></div></div>';
    }

    public function closed_days_modal($id,$cal){
        $year=(int)date('Y'); global $wpdb; $t=self::tables();
        $existing=$wpdb->get_results($wpdb->prepare("SELECT closed_date,reason FROM {$t['closed']} WHERE calendar_id=%d AND closed_date BETWEEN %s AND %s",(int)$cal->id,$year.'-01-01',$year.'-12-31'));
        $map=[]; foreach($existing as $r){ $map[$r->closed_date]=$r->reason; }
        echo '<div id="'.esc_attr($id).'" class="cmap-modal cmap-modal-xl"><div class="cmap-modal-box cmap-modal-panel cmap-closed-modal-panel"><button type="button" class="cmap-modal-close js-cmap-close">×</button><div class="cmap-modal-head"><h2>Beschikbare dagen - '.self::h($cal->title).'</h2></div>'.$this->modal_switcher('closed',$cal).'<form method="post" action="'.esc_url(admin_url('admin.php?page='.self::SLUG.'&tab=calendars&calendar_id='.(int)$cal->id)).'" class="cmap-form js-cmap-modal-form" data-modal-id="'.esc_attr($id).'" data-reopen="1">'.wp_nonce_field('cmap_admin','_wpnonce',true,false).'<input type="hidden" name="cmap_action" value="save_closed_dates"><input type="hidden" name="calendar_id" value="'.(int)$cal->id.'"><input type="hidden" name="year" value="'.(int)$year.'"><input type="hidden" name="reason" value="Niet beschikbaar"><p class="cmap-availability-note">Witte dagen zijn niet beschikbaar. Selecteer dagen om ze <b>oranje beschikbaar</b> te maken en klik op opslaan.</p><div class="cmap-year-grid cmap-year-grid-modal">';
        for($m=1;$m<=12;$m++){
            $first=strtotime(sprintf('%04d-%02d-01',$year,$m)); $days=(int)date('t',$first);
            echo '<div class="cmap-month"><h3>'.esc_html(date_i18n('F',$first)).'</h3><div class="cmap-month-head"><span>ma</span><span>di</span><span>wo</span><span>do</span><span>vr</span><span>za</span><span>zo</span></div><div class="cmap-month-days">';
            $pad=(int)date('N',$first)-1; for($i=0;$i<$pad;$i++) echo '<span class="muted"></span>';
            for($d=1;$d<=$days;$d++){ $date=sprintf('%04d-%02d-%02d',$year,$m,$d); $saved=self::availability_saved((int)$cal->id); $checked=$saved && !isset($map[$date]); echo '<label class="cmap-closed-day '.($checked?'is-available':'').'" data-date="'.esc_attr($date).'"><input type="checkbox" name="closed_dates[]" value="'.esc_attr($date).'" '.checked($checked,true,false).'><span>'.(int)$d.'</span></label>'; }
            echo '</div></div>';
        }
        echo '</div><div class="cmap-modal-feedback" aria-live="polite"></div></form></div></div>';
    }

    public function render_admin_closed(){
        global $wpdb; $t=self::tables(); $cals=self::get_calendars(false); $current=(int)($_GET['calendar_id']??0); if(!$current && $cals) $current=(int)$cals[0]->id; $year=max(2024,(int)($_GET['year']??date('Y')));
        $existing=$wpdb->get_results($wpdb->prepare("SELECT closed_date,reason FROM {$t['closed']} WHERE calendar_id=%d AND closed_date BETWEEN %s AND %s",$current,$year.'-01-01',$year.'-12-31')); $map=[]; foreach($existing as $r){ $map[$r->closed_date]=$r->reason; }
        echo '<section class="cmap-card cmap-compact"><h2>Beschikbare dagen per agenda</h2><form method="get" class="cmap-form cmap-inline-form"><input type="hidden" name="page" value="'.esc_attr(self::SLUG).'"><input type="hidden" name="tab" value="closed"><label>Agenda'.$this->calendar_select($current).'</label><label>Jaar<input type="number" name="year" value="'.(int)$year.'"></label><button class="cmap-btn">Tonen</button></form></section>';
        echo '<section class="cmap-card cmap-compact"><form method="post" class="cmap-form">'.wp_nonce_field('cmap_admin','_wpnonce',true,false).'<input type="hidden" name="cmap_action" value="save_closed_dates"><input type="hidden" name="calendar_id" value="'.(int)$current.'"><input type="hidden" name="year" value="'.(int)$year.'"><label>Reden<input name="reason" value="Niet beschikbaar"></label><p class="cmap-availability-note">Witte dagen zijn niet beschikbaar. Selecteer dagen om ze <b>oranje beschikbaar</b> te maken en klik op Beschikbare dagen opslaan.</p><div class="cmap-year-grid">';
        for($m=1;$m<=12;$m++){
            $first=strtotime(sprintf('%04d-%02d-01',$year,$m)); $days=(int)date('t',$first);
            echo '<div class="cmap-month"><h3>'.esc_html(date_i18n('F',$first)).'</h3><div class="cmap-month-head"><span>ma</span><span>di</span><span>wo</span><span>do</span><span>vr</span><span>za</span><span>zo</span></div><div class="cmap-month-days">'; $pad=(int)date('N',$first)-1; for($i=0;$i<$pad;$i++) echo '<span class="muted"></span>'; for($d=1;$d<=$days;$d++){ $date=sprintf('%04d-%02d-%02d',$year,$m,$d); $saved=self::availability_saved((int)$current); $checked=$saved && !isset($map[$date]); echo '<label class="cmap-closed-day '.($checked?'is-available':'').'" data-date="'.esc_attr($date).'"><input type="checkbox" name="closed_dates[]" value="'.esc_attr($date).'" '.checked($checked,true,false).'><span>'.$d.'</span></label>'; } echo '</div></div>';
        }
        echo '</div><div class="cmap-modal-actions cmap-modal-actions-spaced"><button class="cmap-btn">Beschikbare dagen opslaan</button></div></form></section>';
        $rows=$wpdb->get_results($wpdb->prepare("SELECT cl.*,c.title calendar_title FROM {$t['closed']} cl JOIN {$t['cal']} c ON c.id=cl.calendar_id WHERE cl.calendar_id=%d ORDER BY cl.closed_date DESC LIMIT 200",$current)); echo '<section class="cmap-card cmap-compact"><h2>Niet beschikbare dagen</h2><div class="cmap-tablewrap"><table class="cmap-table"><tr><th>Datum</th><th>Agenda</th><th>Reden</th><th></th></tr>'; foreach($rows as $r){ echo '<tr><td>'.self::h(date_i18n('d-m-Y',strtotime($r->closed_date))).'</td><td>'.self::h($r->calendar_title).'</td><td>'.self::h($r->reason).'</td><td><form method="post">'.wp_nonce_field('cmap_admin','_wpnonce',true,false).'<input type="hidden" name="cmap_action" value="delete_closed"><input type="hidden" name="closed_id" value="'.(int)$r->id.'"><button class="cmap-btn cmap-btn-small cmap-danger">Verwijder</button></form></td></tr>'; } echo '</table></div></section>';
    }

    public function render_admin_fields(){
        global $wpdb; $t=self::tables();
        $cals=self::get_calendars(false);
        $current=(int)($_GET['calendar_id']??0);
        if(!$current && $cals) $current=(int)$cals[0]->id;
        $field_types=['text'=>'Tekst','email'=>'E-mail','tel'=>'Telefoon/GSM','textarea'=>'Tekstvlak','select'=>'Keuzelijst','checkbox'=>'Checkbox','date'=>'Datum','file'=>'Foto/bestand','number'=>'Nummer','url'=>'Website'];
        $presets=[''=>'Kies voorinstelling','voornaam'=>'Voornaam','familienaam'=>'Familienaam','naam'=>'Volledige naam','email'=>'E-mail','telefoon'=>'Telefoon','gsm'=>'GSM','geboortedatum'=>'Geboortedatum','leeftijd'=>'Leeftijd','straat'=>'Straat','nr'=>'Nr.','postcode'=>'Postcode','gemeente'=>'Gemeente','opmerkingen'=>'Opmerkingen','hoe_terecht'=>'Hoe bij ons terecht gekomen','foto'=>'Foto'];
        echo '<section class="cmap-card cmap-fields-builder"><h2>Formulierveld toevoegen / aanpassen</h2><form method="post" class="cmap-form cmap-field-editor-form" id="cmap-field-editor">'.wp_nonce_field('cmap_admin','_wpnonce',true,false).'<input type="hidden" name="cmap_action" value="save_field"><input type="hidden" name="id" value=""><div class="cmap-field-editor-grid"><div class="cmap-field-editor-col">';
        echo '<label>Agenda'.$this->calendar_select($current).'</label>';
        echo '<label>Voorinstelling<select class="js-cmap-field-preset"><option value="">Kies voorinstelling</option>'; foreach($presets as $k=>$l){ if($k!=='') echo '<option value="'.esc_attr($k).'">'.esc_html($l).'</option>'; } echo '</select></label>';
        echo '<label>Key<input name="field_key" required placeholder="bv. geboortedatum"></label><label>Label<input name="label" required placeholder="bv. Geboortedatum"></label><label>Placeholder<input name="placeholder"></label>';
        echo '</div><div class="cmap-field-editor-col">';
        echo '<label>Type<select name="type">'; foreach($field_types as $k=>$l){ echo '<option value="'.esc_attr($k).'">'.esc_html($l).'</option>'; } echo '</select></label>';
        echo '<label>Kolom<select name="width"><option value="1">1 kolom</option><option value="2" selected>2 kolommen</option><option value="3">3 kolommen</option></select></label><label>Titelpositie<select name="title_position"><option value="above">Titel boven veld</option><option value="inside">Titel in placeholder</option></select></label><label>Volgorde<input type="number" name="sort_order" value="100"></label>';
        echo '<div class="cmap-field-checkline"><label><input type="checkbox" name="required"> Verplicht</label><label><input type="checkbox" name="active" checked> Zichtbaar/actief</label></div>';
        echo '</div></div><label class="cmap-field-options">Opties<textarea name="options" placeholder="Voor select: 1 optie per lijn"></textarea></label><div class="cmap-field-actions"><button class="cmap-btn">Veld opslaan</button><button type="button" class="cmap-btn cmap-btn-small cmap-btn-ghost js-cmap-field-clear">Nieuw veld</button></div></form></section>';

        echo '<section class="cmap-card cmap-fields-accordions"><h2>Formuliervelden per dienst</h2>';
        foreach($cals as $cal){
            $rows=$wpdb->get_results($wpdb->prepare("SELECT * FROM {$t['fields']} WHERE calendar_id=%d ORDER BY sort_order,id",(int)$cal->id));
            $open=((int)$cal->id===$current) ? ' open' : '';
            echo '<details class="cmap-field-accordion"'.$open.'><summary><strong>'.self::h($cal->title).'</strong><span>'.count($rows).' velden</span></summary>';
            echo '<form method="post" class="cmap-form cmap-fields-list-form">'.wp_nonce_field('cmap_admin','_wpnonce',true,false).'<input type="hidden" name="cmap_action" value="save_field_flags"><input type="hidden" name="calendar_id" value="'.(int)$cal->id.'"><div class="cmap-tablewrap"><table class="cmap-table cmap-fields-table"><tr><th>Volgorde</th><th>Key</th><th>Label</th><th>Type</th><th>Kolom</th><th>Verplicht</th><th>Zichtbaar</th><th></th></tr>';
            foreach($rows as $r){
                $data=' data-id="'.(int)$r->id.'" data-calendar="'.(int)$r->calendar_id.'" data-key="'.esc_attr($r->field_key).'" data-label="'.esc_attr($r->label).'" data-type="'.esc_attr($r->type).'" data-width="'.esc_attr($r->width).'" data-placeholder="'.esc_attr($r->placeholder).'" data-title-position="'.esc_attr($r->title_position).'" data-sort="'.(int)$r->sort_order.'" data-required="'.(int)$r->required.'" data-active="'.(int)$r->active.'" data-options="'.esc_attr($r->options).'"';
                echo '<tr class="cmap-field-row"'.$data.'><td><input type="hidden" name="field_ids[]" value="'.(int)$r->id.'"><input class="cmap-order-input" type="number" name="sort_order['.(int)$r->id.']" value="'.(int)$r->sort_order.'"></td><td>'.self::h($r->field_key).'</td><td><button type="button" class="cmap-field-edit-link js-cmap-field-edit">'.self::h($r->label).'</button></td><td>'.self::h($field_types[$r->type]??$r->type).'</td><td>'.self::h($r->width).'</td><td><input type="checkbox" name="required['.(int)$r->id.']" '.checked($r->required,true,false).'></td><td><input type="checkbox" name="active['.(int)$r->id.']" '.checked($r->active,true,false).'></td><td><button class="cmap-btn cmap-btn-small cmap-danger" type="submit" name="cmap_delete_field_inline" value="'.(int)$r->id.'" onclick="return confirm(&quot;Dit veld verwijderen?&quot;)">Verwijder</button></td></tr>';
            }
            echo '</table></div><div class="cmap-field-list-actions"><button class="cmap-btn cmap-btn-small">Deze lijst opslaan</button><button type="button" class="cmap-btn cmap-btn-small cmap-btn-ghost js-cmap-new-for-calendar" data-calendar="'.(int)$cal->id.'">Nieuw veld in '.esc_attr($cal->title).'</button></div></form>';
            echo '<form method="post" class="cmap-form cmap-field-clone-form">'.wp_nonce_field('cmap_admin','_wpnonce',true,false).'<input type="hidden" name="cmap_action" value="clone_fieldset"><input type="hidden" name="from_calendar_id" value="'.(int)$cal->id.'"><label>Kloon volledige veldenset naar '.$this->calendar_select(0,'to_calendar_id').'</label><label><input type="checkbox" name="replace_target"> doel eerst leegmaken</label><button class="cmap-btn cmap-btn-small">Kloon veldenset</button></form>';
            echo '</details>';
        }
        echo '</section>';
    }

    public function render_admin_bookings(){
        $picked=array_map('intval',(array)($_GET['cals']??[]));
        $export_fields=['naam'=>'Naam','email'=>'E-mail','telefoon'=>'Telefoon/GSM','leeftijd'=>'Leeftijd','gemeente'=>'Gemeente','status'=>'Status','agenda'=>'Agenda','datum'=>'Datum'];
        echo '<section class="cmap-card cmap-compact cmap-bookings-admin">';
        echo '<form method="get" class="cmap-bookings-filter" action="'.esc_url(admin_url('admin.php')).'"><input type="hidden" name="page" value="'.esc_attr(self::SLUG).'"><input type="hidden" name="tab" value="bookings"><div class="cmap-bookings-topline"><div class="cmap-bookings-cards">'.$this->calendar_filter_cards($picked,false,true).'</div><div class="cmap-bookings-actions"><button class="cmap-btn cmap-btn-small cmap-apply-top">Toepassen</button></div></div></form>';
        echo '<div class="cmap-bookings-head"><h2>Afspraken</h2><form method="get" action="'.esc_url(admin_url('admin.php')).'" class="cmap-export-form"><input type="hidden" name="page" value="'.esc_attr(self::SLUG).'"><input type="hidden" name="tab" value="bookings"><input type="hidden" name="cmap_export" value="bookings">'.wp_nonce_field('cmap_export_bookings','_wpnonce',true,false);
        foreach($picked as $id) echo '<input type="hidden" name="cals[]" value="'.(int)$id.'">';
        echo '<div class="cmap-export-checks">'; foreach($export_fields as $k=>$l){ echo '<label><input type="checkbox" name="export_fields[]" value="'.esc_attr($k).'" checked><span>'.esc_html($l).'</span></label>'; } echo '</div><button class="cmap-btn cmap-btn-small">CSV export</button></form></div>';
        echo $this->bookings_table(0,$picked).'</section>';
    }
    public function status_label($status){
        $labels=['pending'=>'Afspraak','confirmed'=>'Ingeschreven','cancelled'=>'Geannuleerd','cancelled_cm'=>'Geannuleerd (CM)','attended'=>'Ingeschreven','no_show'=>'Niet ingeschreven'];
        return $labels[$status] ?? $status;
    }
    public function status_options($selected){
        if($selected==='attended') $selected='confirmed';
        $opts=['pending'=>'Afspraak','cancelled'=>'Geannuleerd','cancelled_cm'=>'Geannuleerd (CM)','confirmed'=>'Ingeschreven','no_show'=>'Niet ingeschreven'];
        $out=''; foreach($opts as $k=>$v){ $out.='<option value="'.esc_attr($k).'" '.selected($selected,$k,false).'>'.esc_html($v).'</option>'; } return $out;
    }
    public function is_cancelled_status($status){
        return in_array((string)$status,['cancelled','cancelled_cm'],true);
    }
    public function model_meta_first($user_id,$keys){
        foreach($keys as $k){ $v=get_user_meta((int)$user_id,$k,true); if($v!=='' && $v!==null) return $v; }
        return '';
    }
    public function model_photo_id($user_id){
        if(!$user_id) return 0;
        $keys=['cm_hoofdfoto','hoofdfoto','_thumbnail_id','profile_photo','profile_image','model_photo','foto','avatar'];
        foreach($keys as $k){ $v=get_user_meta((int)$user_id,$k,true); if(is_numeric($v) && (int)$v>0) return (int)$v; }
        return 0;
    }
    public function booking_value($r,$fields,$key,$fallback=''){
        if(isset($fields[$key]) && $fields[$key] !== '') return $fields[$key];
        if($fallback !== '') return $fallback;
        if(!empty($r->user_id)){
            $map=[
                'voornaam'=>['first_name','voornaam','cm_voornaam'],
                'familienaam'=>['last_name','familienaam','cm_familienaam'],
                'telefoon'=>['cm_telefoon','telefoon','phone','gsm','cm_gsm'],
                'gsm'=>['cm_gsm','gsm','telefoon','cm_telefoon'],
                'straat'=>['cm_straat','straat','address_street'],
                'nr'=>['cm_nr','nr','huisnummer'],
                'postcode'=>['cm_postcode','postcode'],
                'gemeente'=>['cm_gemeente','gemeente','city'],
                'adres'=>['cm_adres','adres','address'],
                'geboortedatum'=>['cm_geboortedatum','geboortedatum','birthdate','birth_date','date_of_birth'],
                'bericht'=>['cm_bericht','bericht','opmerking','opmerkingen'],
                'hoe_terecht'=>['cm_hoe_terecht','hoe_terecht','bron','source'],
            ];
            if(isset($map[$key])) return $this->model_meta_first($r->user_id,$map[$key]);
        }
        return '';
    }
    public function age_from_birthdate($birth){
        $birth=trim((string)$birth); if(!$birth) return '';
        $ts=strtotime($birth); if(!$ts) return $birth;
        $age=(int)date('Y')-(int)date('Y',$ts);
        if(date('md') < date('md',$ts)) $age--;
        return $age>=0 ? $age.' jaar' : '';
    }
    public function booking_referral_value($fields){
        $keys=['hoe_terecht','hoe_bij_ons','terecht_gekomen','bron','source','referral'];
        foreach($keys as $k){ if(!empty($fields[$k])) return is_array($fields[$k]) ? implode(', ',array_filter($fields[$k])) : $fields[$k]; }
        $labels=['google'=>'Google','facebook'=>'Facebook','instagram'=>'Instagram','tiktok'=>'TikTok','tik_tok'=>'TikTok','andere'=>'Andere','internet'=>'Internet','kennis'=>'Kennis'];
        $picked=[];
        foreach($labels as $k=>$label){ if(!empty($fields[$k]) && $fields[$k] !== '0') $picked[]=$label; }
        return implode(', ',$picked);
    }
    public function booking_detail_markup($r,$as_modal=false){
        $fields=json_decode((string)$r->fields,true); if(!is_array($fields)) $fields=[];
        $photo_id=(int)$r->file_id; if(!$photo_id && !empty($r->user_id)) $photo_id=$this->model_photo_id((int)$r->user_id);
        $img=$photo_id?wp_get_attachment_image($photo_id,'large',false,['class'=>'cmap-detail-photo']):'';
        $email=$r->email ?: $this->booking_value($r,$fields,'email');
        $phone=$r->phone ?: ($this->booking_value($r,$fields,'telefoon') ?: $this->booking_value($r,$fields,'gsm'));
        $first=$r->firstname ?: $this->booking_value($r,$fields,'voornaam');
        $last=$r->lastname ?: $this->booking_value($r,$fields,'familienaam');
        $name=$r->name ?: trim($first.' '.$last);
        $birth=$this->booking_value($r,$fields,'geboortedatum');
        $age=$this->age_from_birthdate($birth ?: ($fields['leeftijd']??''));
        $street=$this->booking_value($r,$fields,'straat');
        $nr=$this->booking_value($r,$fields,'nr');
        $postcode=$this->booking_value($r,$fields,'postcode');
        $city=$this->booking_value($r,$fields,'gemeente');
        $remarks=$this->booking_value($r,$fields,'bericht') ?: ($fields['opmerking']??($fields['opmerkingen']??''));
        $ref=$this->booking_referral_value($fields);
        $card=function($label,$val,$type='text',$class=''){
            $val=(string)$val;
            $html=$type==='email' && is_email($val) ? '<a href="mailto:'.esc_attr($val).'">'.self::h($val).'</a>' : self::h($val);
            return '<div class="'.esc_attr(trim('cmap-detail-card '.$class)).'"><strong>'.self::h($label).'</strong><span>'.$html.'</span></div>';
        };
        $cards=[];
        $cards[]=$card('Naam',$name ?: '','text','cmap-detail-name-card');
        $cards[]=$card('Leeftijd',$age,'text','cmap-detail-age-card');
        $cards[]=$card('Straat',$street,'text','cmap-detail-street-card');
        $cards[]=$card('Nr.',$nr,'text','cmap-detail-nr-card');
        $cards[]=$card('Postcode',$postcode,'text','cmap-detail-postcode-card');
        $cards[]=$card('Gemeente',$city,'text','cmap-detail-city-card');
        $cards[]=$card('E-mail',$email,'email','cmap-detail-email-card');
        $cards[]=$card('Telefoon',$phone,'text','cmap-detail-phone-card');
        $cards[]=$card('Hoe bij ons terecht gekomen',$ref,'text','cmap-detail-wide');
        $cards[]=$card('Opmerkingen',$remarks,'text','cmap-detail-wide cmap-detail-remarks-card');
        $out='<div class="cmap-booking-detail'.($as_modal?' is-modal':'').'">';
        $out.='<div class="cmap-detail-photo-col">'.($img?'<div class="cmap-detail-photo-wrap">'.$img.'</div>':'<div class="cmap-no-photo">Geen foto toegevoegd</div>').'</div>';
        $out.='<div class="cmap-detail-main"><div class="cmap-detail-grid">'.implode('',$cards).'</div></div></div>';
        return $out;
    }
    public function booking_modal_markup($r){
        $date=date('Y-m-d',strtotime($r->start_at)); $start=date('H:i',strtotime($r->start_at)); $end=date('H:i',strtotime($r->end_at)); $form_id='cmap-edit-form-'.(int)$r->id;
        $out='<div class="cmap-edit-modal" id="cmap-booking-modal-'.(int)$r->id.'" aria-hidden="true"><div class="cmap-edit-backdrop" data-cmap-close></div><div class="cmap-edit-dialog"><button type="button" class="cmap-edit-close" data-cmap-close>×</button><h2>Bewerk reserveringsdetails <span>'.self::h($r->calendar_title).'</span></h2>';
        $out.='<form id="'.$form_id.'" method="post" class="cmap-form cmap-edit-form">'.wp_nonce_field('cmap_admin','_wpnonce',true,false).'<input type="hidden" name="cmap_action" value="update_booking"><input type="hidden" name="booking_id" value="'.(int)$r->id.'">';
        $out.='<div class="cmap-edit-controls"><label>Status<select name="status">'.$this->status_options($r->status).'</select></label><label>Dag<input type="date" name="booking_date" value="'.esc_attr($date).'" required></label><label>Van<input type="time" name="start_time" value="'.esc_attr($start).'" required></label><label>Tot<input type="time" name="end_time" value="'.esc_attr($end).'" required></label></div>';
        $out.='<h3>Afspraakgegevens</h3>'.$this->booking_detail_markup($r,true).'</form>';
        $out.='<div class="cmap-modal-actions"><form method="post" class="cmap-delete-bottom" onsubmit="return confirm(\'Deze afspraak volledig verwijderen?\')">'.wp_nonce_field('cmap_admin','_wpnonce',true,false).'<input type="hidden" name="cmap_action" value="delete_booking"><input type="hidden" name="booking_id" value="'.(int)$r->id.'"><button class="cmap-btn cmap-danger">Afspraak verwijderen</button></form><button class="cmap-btn" form="'.$form_id.'">Opslaan</button></div>';
        $out.='</div></div>'; return $out;
    }
    public function bookings_table($calendar_id=0,$picked=[]){
        global $wpdb; $t=self::tables(); $where='WHERE b.start_at >= %s'; $args=[date('Y-m-d H:i:s',strtotime('-90 days'))]; if($calendar_id){ $where.=' AND b.calendar_id=%d'; $args[]=$calendar_id; }
        if($picked){ $in=implode(',',array_fill(0,count($picked),'%d')); $where.=" AND b.calendar_id IN ($in)"; $args=array_merge($args,$picked); }
        $rows=$wpdb->get_results($wpdb->prepare("SELECT b.*,c.title calendar_title,c.color calendar_color FROM {$t['book']} b JOIN {$t['cal']} c ON c.id=b.calendar_id {$where} ORDER BY CASE WHEN b.start_at >= NOW() THEN 0 ELSE 1 END, b.start_at ASC LIMIT 500",$args));
        $out='<div class="cmap-tablewrap"><table class="cmap-table cmap-bookings"><tr><th>Datum</th><th>Agenda</th><th>Naam</th><th>E-mail</th><th>Telefoon/GSM</th><th>Status</th><th>Actie</th></tr>';
        foreach($rows as $r){ $mail=$r->email?'<a href="mailto:'.esc_attr($r->email).'">'.self::h($r->email).'</a>':''; $out.='<tr class="cmap-popup-row" data-cmap-open="cmap-booking-modal-'.(int)$r->id.'"><td>'.self::h(date_i18n('d-m-Y H:i',strtotime($r->start_at))).'</td><td><span class="cmap-dot" style="background:'.esc_attr($r->calendar_color).'"></span>'.self::h($r->calendar_title).'</td><td>'.self::h($r->name).'</td><td>'.$mail.'</td><td>'.self::h($r->phone).'</td><td><span class="cmap-status cmap-status-'.esc_attr($r->status).'">'.self::h($this->status_label($r->status)).'</span></td><td><button type="button" class="cmap-btn cmap-btn-small" data-cmap-open="cmap-booking-modal-'.(int)$r->id.'">Bewerk</button></td></tr>'; }
        $out.='</table></div>'; foreach($rows as $r) $out.=$this->booking_modal_markup($r); return $out;
    }

    public function render_admin_calendar_view(){ echo '<section class="cmap-card cmap-compact cmap-calendar-card">'.$this->calendar_view(true).'</section>'; }
    public function calendar_view($admin=false){
        global $wpdb; $t=self::tables(); $cals=self::get_calendars(true); $mode=isset($_GET['view'])?sanitize_key($_GET['view']):'week'; if(!in_array($mode,['month','week','day','list'],true)) $mode='week'; $base=isset($_GET['date'])?sanitize_text_field($_GET['date']):current_time('Y-m-d'); if(!self::valid_date($base)) $base=current_time('Y-m-d');
        $picked=array_map('intval',(array)($_GET['cals']??[])); if(!$picked) foreach($cals as $c) $picked[]=(int)$c->id;
        $today=current_time('Y-m-d');
        $allowed_status=['pending','confirmed','attended','cancelled','cancelled_cm','no_show'];
        $statusPicked=array_values(array_intersect(array_map('sanitize_key',(array)($_GET['statuses']??[])),$allowed_status));
        if($mode==='list' && !$statusPicked) $statusPicked=['pending','confirmed','attended'];
        if($mode==='month'){ $start=date('Y-m-01',strtotime($base)); $end=date('Y-m-t',strtotime($base)); $prev=date('Y-m-d',strtotime($start.' -1 month')); $next=date('Y-m-d',strtotime($start.' +1 month')); }
        elseif($mode==='week'){ $start=date('Y-m-d',strtotime('monday this week',strtotime($base))); $end=date('Y-m-d',strtotime('sunday this week',strtotime($base))); $prev=date('Y-m-d',strtotime($start.' -7 days')); $next=date('Y-m-d',strtotime($start.' +7 days')); }
        elseif($mode==='day'){ $start=$end=$base; $prev=date('Y-m-d',strtotime($base.' -1 day')); $next=date('Y-m-d',strtotime($base.' +1 day')); }
        else {
            $list_from=sanitize_text_field($_GET['list_from']??''); $list_to=sanitize_text_field($_GET['list_to']??'');
            if(!empty($_GET['today_only'])){ $start=$end=$today; }
            elseif(self::valid_date($list_from) && self::valid_date($list_to)){ $start=$list_from; $end=$list_to; if(strtotime($end)<strtotime($start)) $end=$start; }
            else { $start=date('Y-m-d',strtotime('monday this week',strtotime($base))); $end=date('Y-m-d',strtotime('sunday this week',strtotime($base))); }
            $prev=date('Y-m-d',strtotime($start.' -7 days')); $next=date('Y-m-d',strtotime($start.' +7 days'));
        }
        $args=[$start.' 00:00:00',$end.' 23:59:59']; $where="b.start_at BETWEEN %s AND %s"; if($picked){ $in=implode(',',array_fill(0,count($picked),'%d')); $where.=" AND b.calendar_id IN ($in)"; $args=array_merge($args,$picked); }
        if($mode==='list' && $statusPicked){ $in=implode(',',array_fill(0,count($statusPicked),'%s')); $where.=" AND b.status IN ($in)"; $args=array_merge($args,$statusPicked); }
        $rows=$wpdb->get_results($wpdb->prepare("SELECT b.*,c.title calendar_title,c.color calendar_color,c.id calid FROM {$t['book']} b JOIN {$t['cal']} c ON c.id=b.calendar_id WHERE {$where} ORDER BY b.start_at ASC",$args));
        $makeUrl=function($date,$view=null) use ($picked,$mode){ $args=['page'=>self::SLUG,'tab'=>'calendar','date'=>$date,'view'=>$view?:$mode]; foreach($picked as $id){ $args['cals'][]=$id; } return esc_url(add_query_arg($args,admin_url('admin.php'))); };
        $todayArgs=['page'=>self::SLUG,'tab'=>'calendar','date'=>$today,'view'=>$mode]; foreach($picked as $id){ $todayArgs['cals'][]=$id; }
        if($mode==='list'){ $todayArgs['today_only']=1; $todayArgs['list_from']=$today; $todayArgs['list_to']=$today; foreach($statusPicked as $st){ $todayArgs['statuses'][]=$st; } }
        $todayUrl=esc_url(add_query_arg($todayArgs,admin_url('admin.php')));
        $out='<div class="cmap-fc"><form method="get" class="cmap-fc-form"><input type="hidden" name="page" value="'.esc_attr(self::SLUG).'"><input type="hidden" name="tab" value="calendar"><input type="hidden" name="view" value="'.esc_attr($mode).'">';
        $out.='<div class="cmap-fc-top">'.$this->calendar_filter_cards($picked,false,false).'</div>';
        $title = $mode==='day' ? ucfirst(date_i18n('l d F Y',strtotime($start))) : (date_i18n('d M',strtotime($start)).($start!==$end?' – '.date_i18n('d M Y',strtotime($end)):''));
        $out.='<div class="cmap-fc-toolbar"><div class="cmap-nav"><a class="cmap-navbtn" href="'.$makeUrl($prev).'">‹</a><a class="cmap-navbtn" href="'.$makeUrl($next).'">›</a><input type="date" name="date" value="'.esc_attr($base).'"><a class="cmap-today" href="'.$todayUrl.'">Vandaag</a></div><h2>'.self::h($title).'</h2><div class="cmap-toolbar-right"><button class="cmap-btn cmap-btn-small cmap-apply-top">Toepassen</button><div class="cmap-view-tabs"><a class="'.($mode==='month'?'is-active':'').'" href="'.$makeUrl($base,'month').'">Maand</a><a class="'.($mode==='week'?'is-active':'').'" href="'.$makeUrl($base,'week').'">Week</a><a class="'.($mode==='day'?'is-active':'').'" href="'.$makeUrl($base,'day').'">Dag</a><a class="'.($mode==='list'?'is-active':'').'" href="'.$makeUrl($base,'list').'">Lijst</a></div></div></div>';
        if($mode==='list'){
            $labels=['pending'=>'Actieve afspraken','confirmed'=>'Ingeschreven','attended'=>'Aanwezig','cancelled'=>'Geannuleerd','cancelled_cm'=>'Geannuleerd (CM)','no_show'=>'Niet ingeschreven'];
            $out.='<div class="cmap-list-controls"><label>Van<input type="date" name="list_from" value="'.esc_attr($start).'"></label><label>Tot<input type="date" name="list_to" value="'.esc_attr($end).'"></label><div class="cmap-list-statuses">';
            foreach($labels as $k=>$l){ $out.='<label><input type="checkbox" name="statuses[]" value="'.esc_attr($k).'" '.checked(in_array($k,$statusPicked,true),true,false).'><span>'.esc_html($l).'</span></label>'; }
            $out.='</div></div>';
        }
        $out.='</form>';
        if($mode==='month') $out.=$this->calendar_month_grid($rows,$start,$end);
        elseif($mode==='day' || $mode==='week') $out.=$this->calendar_time_grid($rows,$start,$end,$mode);
        else { $out.=$this->calendar_mail_panel($start,$end,$picked,$statusPicked).$this->calendar_list_markup($rows); }
        foreach($rows as $r) $out.=$this->booking_modal_markup($r);
        return $out.'</div>';
    }
    public function booking_mail_value($r,$field){
        $extra=json_decode((string)($r->fields??''),true);
        if(!is_array($extra)) $extra=[];
        $field=sanitize_key($field);
        if($field==='afspraak') return trim(date_i18n('d-m-Y H:i',strtotime($r->start_at)).' - '.$r->calendar_title);
        if($field==='naam') return (string)($r->name??'');
        if($field==='voornaam') return (string)($r->firstname ?: ($extra['voornaam']??''));
        if($field==='email') return (string)($r->email ?: ($extra['email']??''));
        if($field==='telefoon') return (string)($r->phone ?: ($extra['telefoon']??$extra['gsm']??''));
        if($field==='leeftijd') return (string)($extra['leeftijd']??$extra['age']??'');
        return (string)($extra[$field]??'');
    }
    public function calendar_mail_panel($start,$end,$picked,$statusPicked){
        $fields=['afspraak'=>'Afspraak','naam'=>'Naam','voornaam'=>'Voornaam','email'=>'E-mail','telefoon'=>'Telefoon/GSM','leeftijd'=>'Leeftijd'];
        $out='<form method="post" class="cmap-list-mail-panel cmap-form">'.wp_nonce_field('cmap_admin','_wpnonce',true,false).'<input type="hidden" name="cmap_action" value="mail_calendar_list"><input type="hidden" name="list_from" value="'.esc_attr($start).'"><input type="hidden" name="list_to" value="'.esc_attr($end).'">';
        foreach((array)$picked as $id){ $out.='<input type="hidden" name="cals[]" value="'.(int)$id.'">'; }
        foreach((array)$statusPicked as $st){ $out.='<input type="hidden" name="statuses[]" value="'.esc_attr($st).'">'; }
        $out.='<div class="cmap-list-mail-main"><label>Mail lijst naar<input type="email" name="mail_to" placeholder="e-mailadres"></label><div class="cmap-list-mail-fields">';
        foreach($fields as $k=>$l){ $checked=in_array($k,['afspraak','naam','voornaam','email','telefoon','leeftijd'],true); $out.='<label><input type="checkbox" name="mail_fields[]" value="'.esc_attr($k).'" '.checked($checked,true,false).'><span>'.esc_html($l).'</span></label>'; }
        $out.='</div><button class="cmap-btn cmap-btn-small">Mail geselecteerde lijst</button></div></form>';
        return $out;
    }
    public function calendar_event_button($e){
        $status=$this->status_label($e->status); $time=date_i18n('H:i',strtotime($e->start_at)).' - '.date_i18n('H:i',strtotime($e->end_at));
        $is_cancelled=$this->is_cancelled_status($e->status);
        $out='<div class="cmap-cal-event-wrap"><button type="button" class="cmap-cal-event cmap-status-'.esc_attr($e->status).' '.($is_cancelled?'is-cancelled':'').'" style="background:'.esc_attr($e->calendar_color).'" data-cmap-open="cmap-booking-modal-'.(int)$e->id.'"><strong>'.self::h($time).'</strong><span>'.self::h($e->calendar_title).'</span><em>'.self::h($e->name).'</em><small>Status: '.self::h($status).'</small></button>';
        $out.='<div class="cmap-hover-card"><div><span class="cmap-hover-dot" style="background:'.esc_attr($e->calendar_color).'"></span><strong>'.self::h($e->calendar_title).'</strong></div><h4>'.self::h($e->name ?: 'Afspraak').($is_cancelled?' <b>'.self::h($status).'</b>':'').'</h4><p>'.self::h($time).'</p><div class="cmap-hover-actions"><button type="button" class="cmap-green" data-cmap-open="cmap-booking-modal-'.(int)$e->id.'">✎</button><form method="post" onsubmit="return confirm(\'Deze afspraak volledig verwijderen?\')">'.wp_nonce_field('cmap_admin','_wpnonce',true,false).'<input type="hidden" name="cmap_action" value="delete_booking"><input type="hidden" name="booking_id" value="'.(int)$e->id.'"><button class="cmap-red" aria-label="Verwijderen"><span class="dashicons dashicons-trash"></span></button></form></div></div></div>';
        return $out;
    }
    public function calendar_list_markup($rows){
        $out='<div class="cmap-calendar-list">';
        if(!$rows) return $out.'<div class="cmap-empty">Nog geen afspraken.</div></div>';
        $cur='';
        foreach($rows as $r){
            $d=date('Y-m-d',strtotime($r->start_at));
            if($d!==$cur){ $cur=$d; $out.='<h3>'.self::h(date_i18n('l d F Y',strtotime($d))).'</h3>'; }
            $cancelled=$this->is_cancelled_status($r->status);
            $out.='<div class="cmap-event cmap-status-'.esc_attr($r->status).' '.($cancelled?'is-cancelled':'').'" style="border-left-color:'.esc_attr($r->calendar_color).'" data-cmap-open="cmap-booking-modal-'.(int)$r->id.'"><strong>'.self::h(date_i18n('H:i',strtotime($r->start_at)).' - '.date_i18n('H:i',strtotime($r->end_at))).'</strong><span>'.self::h($r->calendar_title).'</span><em>'.self::h($r->name).'</em><span class="cmap-status cmap-status-'.esc_attr($r->status).'">'.self::h($this->status_label($r->status)).'</span></div>';
        }
        return $out.'</div>';
    }
    public function calendar_month_grid($rows,$start,$end){ $events=[]; foreach($rows as $r){ $d=date('Y-m-d',strtotime($r->start_at)); $events[$d][]=$r; } $first=strtotime($start); $days=(int)date('t',$first); $out='<div class="cmap-month-calendar"><div class="cmap-month-head"><span>ma</span><span>di</span><span>wo</span><span>do</span><span>vr</span><span>za</span><span>zo</span></div><div class="cmap-month-days">'; for($i=1;$i<(int)date('N',$first);$i++) $out.='<div class="muted"></div>'; for($d=1;$d<=$days;$d++){ $date=date('Y-m-',strtotime($start)).sprintf('%02d',$d); $out.='<div><b>'.$d.'</b>'; foreach($events[$date]??[] as $e){ $out.=$this->calendar_event_button($e); } $out.='</div>'; } return $out.'</div></div>'; }
    public function calendar_time_grid($rows,$start,$end,$mode){
        $days=[]; for($ts=strtotime($start);$ts<=strtotime($end);$ts=strtotime('+1 day',$ts)) $days[]=date('Y-m-d',$ts);
        $events=[]; foreach($rows as $r){ $events[date('Y-m-d',strtotime($r->start_at))][]=$r; }
        $today=current_time('Y-m-d'); $nowH=(int)current_time('G'); $nowM=(int)current_time('i');
        $out='<div class="cmap-time-calendar cmap-time-'.$mode.'"><div class="cmap-time-head"><span></span>';
        foreach($days as $d){ $isToday=($d===$today); $out.='<strong class="'.($isToday?'is-today':'').'">'.self::h(date_i18n('l d/m',strtotime($d))).'</strong>'; }
        $out.='</div>';
        for($h=8;$h<=20;$h++){
            $out.='<div class="cmap-time-row"><span>'.sprintf('%02d:00',$h).'</span>';
            foreach($days as $d){
                $classes=($d===$today?'is-today':'');
                $out.='<div class="'.$classes.'">';
                if($d===$today && $h===$nowH){ $out.='<i class="cmap-now-line" style="top:'.esc_attr(max(0,min(100,($nowM/60)*100))).'%"></i>'; }
                foreach($events[$d]??[] as $e){ if((int)date('G',strtotime($e->start_at))===$h){ $out.=$this->calendar_event_button($e); }}
                $out.='</div>';
            }
            $out.='</div>';
        }
        return $out.'</div>';
    }
    public function render_admin_templates(){
        global $wpdb; $t=self::tables(); echo '<section class="cmap-card"><h2>Mail/SMS template maken</h2><form method="post" class="cmap-form">'.wp_nonce_field('cmap_admin','_wpnonce',true,false).'<input type="hidden" name="cmap_action" value="save_template"><div class="cmap-row"><label>Naam<input name="name" required></label><label>Kanaal<select name="channel"><option value="email">E-mail</option><option value="sms">SMS</option></select></label><label>Onderwerp<input name="subject"></label></div><label>Tekst<textarea name="body" rows="8" placeholder="Variabelen: {name}, {date}, {time}, {calendar_title}, {email}, {phone}"></textarea></label><label><input type="checkbox" name="active" checked> Actief</label><button class="cmap-btn">Template opslaan</button></form></section>';
        $rows=$wpdb->get_results("SELECT * FROM {$t['templates']} ORDER BY channel,name"); echo '<section class="cmap-card"><h2>Bestaande templates</h2><div class="cmap-tablewrap"><table class="cmap-table"><tr><th>Naam</th><th>Kanaal</th><th>Onderwerp</th><th>Actief</th></tr>'; foreach($rows as $r){ echo '<tr><td>'.self::h($r->name).'</td><td>'.self::h($r->channel).'</td><td>'.self::h($r->subject).'</td><td>'.($r->active?'ja':'nee').'</td></tr>'; } echo '</table></div></section>';
    }
    public function render_admin_rules(){
        global $wpdb; $t=self::tables(); $templates=$wpdb->get_results("SELECT * FROM {$t['templates']} WHERE active=1 ORDER BY channel,name");
        $presets=['0'=>'Direct','60'=>'1 uur','240'=>'4 uur','480'=>'8 uur','720'=>'12 uur','1440'=>'1 dag','2880'=>'2 dagen','4320'=>'3 dagen','10080'=>'7 dagen'];
        echo '<section class="cmap-card cmap-compact"><h2>Automatische verzending</h2><form method="post" class="cmap-form cmap-inline-form">'.wp_nonce_field('cmap_admin','_wpnonce',true,false).'<input type="hidden" name="cmap_action" value="save_rule"><label>Agenda'.$this->calendar_select(0).'</label><label>Template<select name="template_id">'; foreach($templates as $tpl){ echo '<option value="'.(int)$tpl->id.'">'.self::h($tpl->channel.' - '.$tpl->name).'</option>'; } echo '</select></label><label>Wanneer<select name="trigger_type"><option value="confirmation">Direct bij boeking</option><option value="before">Voor afspraak</option><option value="after">Na afspraak</option></select></label><label>Tijd<select name="offset_preset">'; foreach($presets as $min=>$label){ echo '<option value="'.esc_attr($min).'">'.esc_html($label).'</option>'; } echo '<option value="custom">Eigen minuten</option></select></label><label>Eigen<input type="number" name="offset_minutes" value="1440"></label><label class="cmap-check"><input type="checkbox" name="active" checked> Actief</label><button class="cmap-btn">Opslaan</button></form></section>';
        $rows=$wpdb->get_results("SELECT r.*,c.title calendar_title,t.name template_name,t.channel FROM {$t['rules']} r JOIN {$t['cal']} c ON c.id=r.calendar_id JOIN {$t['templates']} t ON t.id=r.template_id ORDER BY c.title,r.trigger_type"); echo '<section class="cmap-card cmap-compact"><h2>Regels</h2><div class="cmap-tablewrap"><table class="cmap-table"><tr><th>Agenda</th><th>Template</th><th>Moment</th><th>Tijd</th><th></th></tr>'; foreach($rows as $r){ $txt=isset($presets[(string)$r->offset_minutes])?$presets[(string)$r->offset_minutes]:(int)$r->offset_minutes.' min'; echo '<tr><td>'.self::h($r->calendar_title).'</td><td>'.self::h($r->channel.' - '.$r->template_name).'</td><td>'.self::h($r->trigger_type).'</td><td>'.self::h($txt).'</td><td><form method="post">'.wp_nonce_field('cmap_admin','_wpnonce',true,false).'<input type="hidden" name="cmap_action" value="delete_rule"><input type="hidden" name="rule_id" value="'.(int)$r->id.'"><button class="cmap-btn cmap-btn-small cmap-danger">Verwijder</button></form></td></tr>'; } echo '</table></div></section>';
    }


    public function app_user_id(){
        $uid=get_current_user_id();
        return $uid ? (int)$uid : 0;
    }
    public function app_time_label($time){ return substr((string)$time,0,5); }
    public function app_date_label($date){ $ts=strtotime((string)$date); return $ts ? date_i18n('d-m-Y',$ts) : (string)$date; }
    public function app_current_booking($calendar_id,$uid){
        if(!$uid) return null;
        global $wpdb; $t=self::tables(); $email=''; $u=get_userdata($uid); if($u) $email=(string)$u->user_email;
        $where=$email ? $wpdb->prepare('(b.user_id=%d OR b.email=%s)',$uid,$email) : $wpdb->prepare('b.user_id=%d',$uid);
        return $wpdb->get_row("SELECT b.*,s.slot_date,s.start_time,s.end_time FROM {$t['book']} b INNER JOIN {$t['slots']} s ON s.id=b.slot_id WHERE s.calendar_id=".(int)$calendar_id." AND s.slot_date >= '".esc_sql(current_time('Y-m-d'))."' AND b.status NOT IN ('cancelled','cancelled_cm','geannuleerd') AND $where ORDER BY s.slot_date ASC,s.start_time ASC LIMIT 1");
    }
    public function app_days_payload($slug,$uid=0){
        global $wpdb; $cal=self::get_calendar($slug); if(!$cal) return ['appointment'=>null,'days'=>[],'message'=>'Agenda niet gevonden.'];
        $t=self::tables(); $today=current_time('Y-m-d'); $appt=$this->app_current_booking((int)$cal->id,$uid); $mine_slot=$appt ? (int)$appt->slot_id : 0;
        $rows=$wpdb->get_results($wpdb->prepare("SELECT * FROM {$t['slots']} WHERE calendar_id=%d AND slot_date >= %s AND status='open' ORDER BY slot_date ASC,start_time ASC LIMIT 800",(int)$cal->id,$today));
        $days=[];
        foreach((array)$rows as $s){
            $sid=(int)$s->id; $cap=max(1,(int)$s->capacity); $booked=(int)$wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$t['book']} WHERE slot_id=%d AND status NOT IN ('cancelled','cancelled_cm','geannuleerd')",$sid));
            $mine=$sid===$mine_slot; $taken=($booked >= $cap && !$mine); $date=(string)$s->slot_date;
            if(!isset($days[$date])) $days[$date]=['date'=>$date,'date_label'=>$this->app_date_label($date),'slots'=>[]];
            $start=$this->app_time_label($s->start_time); $end=$this->app_time_label($s->end_time);
            $days[$date]['slots'][]=['id'=>$sid,'slot_id'=>$sid,'time'=>($slug==='opleiding' ? trim($start.' - '.$end) : $start),'start'=>$start,'end'=>$end,'taken'=>$taken,'mine'=>$mine,'available'=>(!$taken || $mine)];
        }
        ksort($days);
        if($slug==='portfolio'){
            foreach($days as $date=>$day){ $free=0; $filtered=[]; foreach($day['slots'] as $slot){ if(!empty($slot['mine'])){ $filtered[]=$slot; continue; } if(!empty($slot['taken'])){ $filtered[]=$slot; continue; } if($free<3){ $filtered[]=$slot; $free++; } } $days[$date]['slots']=$filtered; }
        }
        $appointment=null;
        if($appt){ $appointment=['id'=>(int)$appt->id,'slot_id'=>(int)$appt->slot_id,'date'=>(string)$appt->slot_date,'date_label'=>$this->app_date_label($appt->slot_date),'time'=>$slug==='opleiding' ? $this->app_time_label($appt->start_time).' - '.$this->app_time_label($appt->end_time) : $this->app_time_label($appt->start_time),'start'=>$this->app_time_label($appt->start_time),'end'=>$this->app_time_label($appt->end_time),'datetime_label'=>$this->app_date_label($appt->slot_date).($slug==='opleiding' ? ' van '.$this->app_time_label($appt->start_time).' tot '.$this->app_time_label($appt->end_time) : ' om '.$this->app_time_label($appt->start_time))]; }
        return ['appointment'=>$appointment,'days'=>array_values($days),'source'=>'agenda_pro','calendar_id'=>(int)$cal->id,'message'=>(empty($days)&&!$appointment?'Geen beschikbare momenten gevonden.':'')];
    }
    public function rest_app_appointment_me($req,$slug){
        $uid=$this->app_user_id(); if(!$uid) return new WP_Error('cmap_login','Log opnieuw in om afspraken te bekijken.',['status'=>401]);
        return rest_ensure_response($this->app_days_payload($slug,$uid));
    }
    public function rest_app_appointment_book($req,$slug){
        $uid=$this->app_user_id(); if(!$uid) return new WP_Error('cmap_login','Log opnieuw in om afspraken te boeken.',['status'=>401]);
        global $wpdb; $cal=self::get_calendar($slug); if(!$cal) return new WP_Error('cmap_agenda_missing','Agenda niet gevonden.',['status'=>404]);
        $t=self::tables(); $slot_id=(int)$req->get_param('slot_id'); $date=sanitize_text_field((string)$req->get_param('date')); $time=substr(sanitize_text_field((string)($req->get_param('start') ?: $req->get_param('time'))),0,5);
        if(!$slot_id && $date && $time) $slot_id=(int)$wpdb->get_var($wpdb->prepare("SELECT id FROM {$t['slots']} WHERE calendar_id=%d AND slot_date=%s AND LEFT(start_time,5)=%s AND status='open' ORDER BY start_time ASC LIMIT 1",(int)$cal->id,$date,$time));
        if(!$slot_id && $date && $slug==='opleiding') $slot_id=(int)$wpdb->get_var($wpdb->prepare("SELECT id FROM {$t['slots']} WHERE calendar_id=%d AND slot_date=%s AND status='open' ORDER BY start_time ASC LIMIT 1",(int)$cal->id,$date));
        if(!$slot_id) return new WP_Error('cmap_slot_missing','Dit tijdslot is niet beschikbaar.',['status'=>400]);
        $slot=$wpdb->get_row($wpdb->prepare("SELECT * FROM {$t['slots']} WHERE id=%d AND calendar_id=%d AND status='open' LIMIT 1",$slot_id,(int)$cal->id)); if(!$slot) return new WP_Error('cmap_slot_missing','Dit tijdslot is niet beschikbaar.',['status'=>400]);
        $booked=(int)$wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$t['book']} WHERE slot_id=%d AND user_id<>%d AND status NOT IN ('cancelled','cancelled_cm','geannuleerd')",$slot_id,$uid)); if($booked >= max(1,(int)$slot->capacity)) return new WP_Error('cmap_slot_taken','Dit tijdslot is al bezet.',['status'=>409]);
        $existing=$this->app_current_booking((int)$cal->id,$uid); $u=get_userdata($uid); $now=current_time('mysql');
        $data=['calendar_id'=>(int)$cal->id,'slot_id'=>$slot_id,'user_id'=>$uid,'start_at'=>$slot->slot_date.' '.$slot->start_time,'end_at'=>$slot->slot_date.' '.$slot->end_time,'status'=>'confirmed','name'=>$u?($u->display_name?:$u->user_login):'','email'=>$u?$u->user_email:'','source'=>'app','updated_at'=>$now];
        if($existing){ $wpdb->update($t['book'],$data,['id'=>(int)$existing->id]); $msg='Afspraak gewijzigd.'; }
        else { $data['created_at']=$now; $wpdb->insert($t['book'],$data); $msg='Afspraak opgeslagen.'; }
        return rest_ensure_response(['success'=>true,'message'=>$msg,'data'=>$this->app_days_payload($slug,$uid)]);
    }
    public function rest_app_appointment_cancel($req,$slug){
        $uid=$this->app_user_id(); if(!$uid) return new WP_Error('cmap_login','Log opnieuw in.',['status'=>401]);
        global $wpdb; $cal=self::get_calendar($slug); if(!$cal) return new WP_Error('cmap_agenda_missing','Agenda niet gevonden.',['status'=>404]);
        $t=self::tables(); $now=current_time('mysql'); $booking_id=(int)$req->get_param('booking_id'); if(!$booking_id) $booking_id=(int)$req->get_param('id'); $slot_id=(int)$req->get_param('slot_id');
        $u=get_userdata($uid); $email=$u ? (string)$u->user_email : '';
        $user_where=$email ? $wpdb->prepare('(b.user_id=%d OR b.email=%s)',$uid,$email) : $wpdb->prepare('b.user_id=%d',$uid);
        $extra='';
        if($booking_id>0) $extra .= $wpdb->prepare(' AND b.id=%d',$booking_id);
        elseif($slot_id>0) $extra .= $wpdb->prepare(' AND b.slot_id=%d',$slot_id);
        $sql="UPDATE {$t['book']} b LEFT JOIN {$t['slots']} s ON s.id=b.slot_id SET b.status='cancelled', b.updated_at=%s WHERE b.calendar_id=%d AND {$user_where}{$extra} AND b.status NOT IN ('cancelled','cancelled_cm','geannuleerd')";
        $wpdb->query($wpdb->prepare($sql,$now,(int)$cal->id));
        if((int)$wpdb->rows_affected < 1){
            $sql2="DELETE b FROM {$t['book']} b LEFT JOIN {$t['slots']} s ON s.id=b.slot_id WHERE b.calendar_id=%d AND {$user_where}{$extra}";
            $wpdb->query($wpdb->prepare($sql2,(int)$cal->id));
        }
        return rest_ensure_response(['success'=>true,'message'=>'Afspraak verwijderd.','data'=>$this->app_days_payload($slug,$uid)]);
    }
    public function render_casting_style_booking($slug){
        $cal=self::get_calendar($slug); if(!$cal || !$cal->active || !$cal->public_booking) return '<div class="cmap-alert">Agenda niet beschikbaar.</div>';
        if((int)$cal->use_model_data && !is_user_logged_in()) return '<div class="cmap-alert">Maak eerst een modellenaccount aan en log in om deze afspraak te boeken.</div>';
        $msg='';
        if($_SERVER['REQUEST_METHOD']==='POST' && isset($_POST['cmap_cancel_calendar']) && sanitize_text_field($_POST['cmap_cancel_calendar'])===$cal->slug){
            global $wpdb; $t=self::tables(); $uid=get_current_user_id();
            if($uid){
                $booking_id=(int)($_POST['booking_id']??0); $u=get_userdata($uid); $email=$u ? (string)$u->user_email : '';
                $user_where=$email ? $wpdb->prepare('(b.user_id=%d OR b.email=%s)',$uid,$email) : $wpdb->prepare('b.user_id=%d',$uid);
                $extra=$booking_id>0 ? $wpdb->prepare(' AND b.id=%d',$booking_id) : '';
                $wpdb->query($wpdb->prepare("UPDATE {$t['book']} b LEFT JOIN {$t['slots']} s ON s.id=b.slot_id SET b.status='cancelled', b.updated_at=%s WHERE b.calendar_id=%d AND {$user_where}{$extra} AND b.status NOT IN ('cancelled','cancelled_cm','geannuleerd')",current_time('mysql'),(int)$cal->id));
                if((int)$wpdb->rows_affected < 1){ $wpdb->query($wpdb->prepare("DELETE b FROM {$t['book']} b LEFT JOIN {$t['slots']} s ON s.id=b.slot_id WHERE b.calendar_id=%d AND {$user_where}{$extra}",(int)$cal->id)); }
                $msg='<div class="cmap-ok cmap-booking-success"><strong>Afspraak verwijderd.</strong></div>';
            }
        } elseif($_SERVER['REQUEST_METHOD']==='POST' && isset($_POST['cmap_book_calendar']) && sanitize_text_field($_POST['cmap_book_calendar'])===$cal->slug){
            $res=$this->handle_booking_request($_POST,false); $msg=is_wp_error($res)?'<div class="cmap-alert">'.esc_html($res->get_error_message()).'</div>':'<div class="cmap-ok cmap-booking-success"><strong>Afspraak opgeslagen.</strong></div>';
        }
        $payload=$this->app_days_payload($slug,get_current_user_id()); $days=$payload['days']; $current=$payload['appointment']??null;
        $out='<div class="cmap-wrap cmap-front cmap-casting-layout"><style>
        .cmap-casting-layout{font-size:12px}.cmap-casting-layout .cmap-cast-box{border:1px solid #d2dae5;border-radius:8px;background:#f3f6fa;padding:10px;max-width:100%;box-sizing:border-box}.cmap-casting-layout .cmap-cast-title{font-size:16px;line-height:1.15;font-weight:900;margin:0 0 9px;color:#080315}.cmap-casting-layout .cmap-cast-grid{display:flex;flex-wrap:nowrap;margin:0 -4px;width:calc(100% + 8px)}.cmap-casting-layout .cmap-cast-day{padding:0 4px 7px;box-sizing:border-box;flex:0 0 auto}.cmap-casting-layout .cmap-cast-day.is-hidden{display:none!important}.cmap-casting-layout .cmap-cast-head{background:#0a1022;color:#fff;text-align:center;font-weight:900;font-size:11px;line-height:1;padding:7px 6px;border-radius:6px 6px 0 0;letter-spacing:.01em}.cmap-casting-layout .cmap-cast-slots{background:#e9eef4;border:1px solid #cfd8e4;border-top:0;border-radius:0 0 6px 6px;padding:6px}.cmap-casting-layout .cmap-cast-slot{display:flex;align-items:center;gap:6px;background:#fff;border:1px solid #cfd8e4;border-radius:6px;padding:6px 7px;margin:0 0 5px;font-weight:900;font-size:11px;min-height:28px;box-sizing:border-box;color:#080315}.cmap-casting-layout .cmap-cast-slot:last-child{margin-bottom:0}.cmap-casting-layout .cmap-cast-slot input{width:12px;height:12px;margin:0;flex:0 0 auto}.cmap-casting-layout .cmap-cast-slot.is-taken{background:#c92218;border-color:#c92218;color:#fff}.cmap-casting-layout .cmap-cast-slot.is-taken input{visibility:hidden}.cmap-casting-layout .cmap-actions{display:flex;gap:8px;align-items:center;justify-content:space-between;margin-top:8px}.cmap-casting-layout .cmap-actions-left,.cmap-casting-layout .cmap-actions-right{display:flex;gap:7px}.cmap-casting-layout .cmap-btn{margin:0;border-radius:6px;padding:7px 10px;font-size:11px;line-height:1.1;min-height:28px}.cmap-casting-layout .cmap-btn-light{background:#fff!important;color:#080315!important;border:1px solid #d7dbe2!important}.cmap-casting-layout .cmap-btn-danger{background:#991b1b!important;color:#fff!important;border-color:#991b1b!important}.cmap-casting-layout .cmap-current{border:1px solid #d7dbe2;border-radius:6px;background:#fff;padding:7px 8px;margin:0 0 9px;font-size:11px;font-weight:800;color:#080315}.cmap-casting-layout .cmap-nav[disabled]{opacity:.45;cursor:not-allowed}@media(max-width:700px){.cmap-casting-layout .cmap-cast-box{padding:8px}.cmap-casting-layout .cmap-cast-title{font-size:15px}.cmap-casting-layout .cmap-cast-grid{display:block;margin:0;width:100%}.cmap-casting-layout .cmap-cast-day{width:100%!important;padding:0 0 7px}.cmap-casting-layout .cmap-actions{flex-direction:column;align-items:stretch}.cmap-casting-layout .cmap-actions-left,.cmap-casting-layout .cmap-actions-right{width:100%;justify-content:space-between}.cmap-casting-layout .cmap-btn{flex:1}}
        </style><div class="cmap-cast-box"><h2 class="cmap-cast-title">'.($slug==='opleiding'?'Online afspraak opleiding':'Online afspraak portfolio').'</h2>'.$msg;
        if($current){ $out.='<div class="cmap-current">Uw huidige afspraak: '.esc_html($current['datetime_label']??'').'</div>'; }
        if(!$days) return $out.'<div class="cmap-alert">Geen beschikbare momenten gevonden.</div></div></div>';
        $out.='<form method="post" class="cmap-cast-form"><input type="hidden" name="cmap_book_calendar" value="'.esc_attr($cal->slug).'"><div class="cmap-cast-grid">'; $count=max(1,min(4,count($days))); $width=100/$count;
        foreach($days as $i=>$day){ $hidden=$i>=4?' is-hidden':''; $out.='<div class="cmap-cast-day'.$hidden.'" data-cmap-day-index="'.(int)$i.'" style="width:'.$width.'%"><div class="cmap-cast-head">'.esc_html($day['date_label']).'</div><div class="cmap-cast-slots">'; foreach((array)$day['slots'] as $slot){ $taken=!empty($slot['taken']) && empty($slot['mine']); $checked=!empty($slot['mine'])?' checked':''; $out.='<label class="cmap-cast-slot '.($taken?'is-taken':'').'"><input type="radio" name="slot_id" value="'.(int)$slot['slot_id'].'" '.($taken?'disabled':'required').$checked.'><span>'.esc_html($slot['time']).($taken?' bezet':'').(!empty($slot['mine'])?' uw afspraak':'').'</span></label>'; } $out.='</div></div>'; }
        $out.='</div><div class="cmap-actions"><div class="cmap-actions-left"><button type="button" class="cmap-btn cmap-btn-light cmap-nav cmap-prev">Back</button><button type="button" class="cmap-btn cmap-nav cmap-next">Next</button></div><div class="cmap-actions-right"><button class="cmap-btn cmap-btn-wide">'.($current?'Wijziging opslaan':'Afspraak opslaan').'</button></form>';
        if($current){ $out.='<form method="post" class="cmap-cancel-form"><input type="hidden" name="cmap_cancel_calendar" value="'.esc_attr($cal->slug).'"><input type="hidden" name="booking_id" value="'.(int)($current['id']??0).'"><button class="cmap-btn cmap-btn-danger">Afspraak verwijderen</button></form>'; }
        $out.='</div></div><script>(function(){var root=document.currentScript.closest(".cmap-casting-layout");if(!root)return;var days=[].slice.call(root.querySelectorAll("[data-cmap-day-index]"));var prev=root.querySelector(".cmap-prev"),next=root.querySelector(".cmap-next");var page=0;function show(){var per=4,total=Math.ceil(days.length/per)||1;if(root.querySelector(".cmap-actions-left"))root.querySelector(".cmap-actions-left").style.display=days.length>4?"flex":"none";days.forEach(function(d,i){d.classList.toggle("is-hidden",!(i>=page*per&&i<page*per+per));});if(prev)prev.disabled=page<=0;if(next)next.disabled=page>=total-1;} if(prev)prev.onclick=function(){if(page>0){page--;show();}}; if(next)next.onclick=function(){if((page+1)*4<days.length){page++;show();}};show();})();</script></div></div>';
        return $out;
    }

    public function shortcode_booking($atts){ $a=shortcode_atts(['calendar'=>'portfolio'], $atts); return $this->render_booking($a['calendar']); }
    public function shortcode_portfolio_booking(){ return $this->render_casting_style_booking('portfolio'); }
    public function shortcode_opleiding_booking(){ return $this->render_casting_style_booking('opleiding'); }
    public function shortcode_casting_booking(){ return $this->render_booking('casting'); }
    public function shortcode_gratis_booking(){ return $this->render_booking('gratis-fotoshoot'); }
    public function shortcode_intake_booking(){ return $this->render_booking('intake-gesprek'); }
    public function shortcode_portfolio_admin(){ return $this->front_admin('portfolio'); }
    public function shortcode_opleiding_admin(){ return $this->front_admin('opleiding'); }
    public function shortcode_portfolio_bookings(){ return $this->front_bookings('portfolio'); }
    public function shortcode_opleiding_bookings(){ return $this->front_bookings('opleiding'); }
    public function shortcode_slots_admin($atts){ $a=shortcode_atts(['calendar'=>'portfolio'],$atts); return $this->front_admin($a['calendar']); }
    public function shortcode_bookings_admin($atts){ $a=shortcode_atts(['calendar'=>''],$atts); return $this->front_bookings($a['calendar']); }
    public function shortcode_calendar(){ return '<div class="cmap-wrap">'.$this->calendar_view(false).'</div>'; }
    public function shortcode_admin(){ if(!self::admin_user()) return '<div class="cmap-alert">Geen toegang.</div>'; ob_start(); $this->render_admin_dashboard(); return '<div class="cmap-wrap">'.ob_get_clean().'</div>'; }
    public function shortcode_list(){ return '<div class="cmap-wrap cmap-shortcodes">'.$this->shortcode_list_markup().'</div>'; }

    public function render_booking($slug){
        $cal=self::get_calendar($slug); if(!$cal || !$cal->active || !$cal->public_booking) return '<div class="cmap-alert">Agenda niet beschikbaar.</div>';
        if((int)$cal->use_model_data && !is_user_logged_in()) return '<div class="cmap-alert">Maak eerst een modellenaccount aan en log in om deze afspraak te boeken.</div>';
        $msg='';
        if($_SERVER['REQUEST_METHOD']==='POST' && isset($_POST['cmap_book_calendar']) && sanitize_text_field($_POST['cmap_book_calendar'])===$cal->slug){
            $res=$this->handle_booking_request($_POST,false);
            $msg=is_wp_error($res)?'<div class="cmap-alert">'.esc_html($res->get_error_message()).'</div>':'<div class="cmap-ok cmap-booking-success"><strong>Afspraak opgeslagen.</strong><span>Je ontvangt nog een e-mail ter bevestiging. Heb je een account, dan ontvang je ook een pushbericht. Voor andere afspraken kan ook een sms volgen.</span></div>';
        }
        $slots=self::get_slots($cal->id,null,date('Y-m-d',strtotime('+180 days')),true);
        $by=[]; foreach($slots as $s){ $by[$s->slot_date][]=$s; }
        $out='<div class="cmap-wrap cmap-front cmap-front-v23"><h2>'.self::h($cal->title).'</h2>'.$msg;
        if(!$slots) return $out.'<div class="cmap-alert">Geen beschikbare momenten gevonden.</div></div>';
        $out.='<form method="post" enctype="multipart/form-data" class="cmap-book-form cmap-book-form-v23 '.((int)$cal->use_model_data?'cmap-auto-model-booking':'').'" data-use-model="'.((int)$cal->use_model_data?'1':'0').'" data-calendar-slug="'.esc_attr($cal->slug).'"><input type="hidden" name="cmap_book_calendar" value="'.esc_attr($cal->slug).'">';
        // v3.4.8: top navigation removed; only bottom Back/Next remains.
        $out.='<div class="cmap-date-grid cmap-date-grid-v23" data-page="0" data-per-page="3">';
        $i=0;
        foreach($by as $date=>$daySlots){
            $out.='<div class="cmap-day" data-day-index="'.$i.'"><div class="cmap-day-head">'.esc_html(date_i18n('D d/m',strtotime($date))).'</div>';
            foreach($daySlots as $s){
                $full=((int)$s->booked >= (int)$s->capacity);
                $out.='<label class="cmap-slot '.($full?'is-full':'').'" tabindex="0"><input type="radio" name="slot_id" value="'.(int)$s->id.'" '.($full?'disabled':'required').'><span>'.esc_html(substr($s->start_time,0,5)).'</span><small>'.($full?'volzet':'vrij').'</small></label>';
            }
            $out.='</div>'; $i++;
        }
        $out.='</div><div class="cmap-day-footer-nav cmap-day-footer-nav-v23"><div class="cmap-day-footer-line"></div><div class="cmap-day-footer-actions"><button type="button" class="cmap-nav-btn cmap-prev" aria-label="Vorige dagen"><span class="cmap-nav-label">Back</span><span class="cmap-nav-arrow">‹</span></button><button type="button" class="cmap-nav-btn cmap-next" aria-label="Volgende dagen"><span class="cmap-nav-label">Next</span><span class="cmap-nav-arrow">›</span></button></div></div>';
        $details=(int)$cal->use_model_data ? '<div class="cmap-auto-model-note">Je gegevens worden automatisch uit je modelprofiel gebruikt.</div>' : '<h3>Gegevens</h3>'.$this->render_fields($cal->id,$cal);
        $out.='<div class="cmap-book-details">'.$details.'<button class="cmap-btn cmap-btn-wide">Afspraak bevestigen</button><button type="button" class="cmap-book-back">Back</button></div></form></div>';
        return $out;
    }

    public function model_prefill(){
        $u=wp_get_current_user(); if(!$u || !$u->ID) return [];
        $first=get_user_meta($u->ID,'first_name',true); $last=get_user_meta($u->ID,'last_name',true);
        return [
            'naam'=>trim($first.' '.$last) ?: $u->display_name,
            'voornaam'=>$first,
            'familienaam'=>$last,
            'email'=>$u->user_email,
            'telefoon'=>get_user_meta($u->ID,'cm_telefoon',true) ?: (get_user_meta($u->ID,'telefoon',true) ?: get_user_meta($u->ID,'phone',true)),
            'gsm'=>get_user_meta($u->ID,'cm_gsm',true) ?: get_user_meta($u->ID,'gsm',true),
            'straat'=>get_user_meta($u->ID,'cm_straat',true) ?: get_user_meta($u->ID,'straat',true),
            'nr'=>get_user_meta($u->ID,'cm_nr',true) ?: get_user_meta($u->ID,'nr',true),
            'postcode'=>get_user_meta($u->ID,'cm_postcode',true) ?: get_user_meta($u->ID,'postcode',true),
            'gemeente'=>get_user_meta($u->ID,'cm_gemeente',true) ?: get_user_meta($u->ID,'gemeente',true),
            'geboortedatum'=>get_user_meta($u->ID,'cm_geboortedatum',true) ?: get_user_meta($u->ID,'geboortedatum',true),
        ];
    }
    public function render_fields($calendar_id,$calendar=null){
        $prefill = ($calendar && (int)$calendar->use_model_data) ? $this->model_prefill() : [];
        $out='<div class="cmap-form-grid">'; foreach(self::get_fields($calendar_id,true) as $f){ $name='cmap_field_'.$f->field_key; $req=$f->required?'required':''; $val=$prefill[$f->field_key]??''; $ph=$f->title_position==='inside'?$f->label:$f->placeholder; $label=$f->title_position==='above'?'<span>'.self::h($f->label).($f->required?' *':'').'</span>':''; $out.='<label class="cmap-field cmap-w'.esc_attr($f->width).'">'.$label;
            if($f->type==='textarea') $out.='<textarea name="'.esc_attr($name).'" placeholder="'.esc_attr($ph).'" '.$req.'>'.esc_textarea($val).'</textarea>';
            elseif($f->type==='select'){ $out.='<select name="'.esc_attr($name).'" '.$req.'><option value="">'.esc_html($ph?:'Kies').'</option>'; foreach(array_filter(array_map('trim',explode("\n",(string)$f->options))) as $opt){ $out.='<option '.selected($val,$opt,false).'>'.esc_html($opt).'</option>'; } $out.='</select>'; }
            elseif($f->type==='checkbox') $out.='<span class="cmap-inline"><input type="checkbox" name="'.esc_attr($name).'" value="1" '.checked($val,'1',false).'> '.self::h($f->label).'</span>';
            elseif($f->type==='file') $out.='<input type="file" name="'.esc_attr($name).'" accept="image/*,application/pdf" '.$req.'>';
            else $out.='<input type="'.esc_attr($f->type).'" name="'.esc_attr($name).'" placeholder="'.esc_attr($ph).'" value="'.esc_attr($val).'" '.$req.'>';
            $out.='</label>'; }
        return $out.'</div>';
    }

    public function handle_booking_request($data,$rest=false){
        global $wpdb; $t=self::tables(); $slot_id=(int)($data['slot_id']??0);
        $slot=$wpdb->get_row($wpdb->prepare("SELECT s.*,c.title calendar_title,c.slug calendar_slug,c.capacity default_capacity FROM {$t['slots']} s JOIN {$t['cal']} c ON c.id=s.calendar_id WHERE s.id=%d",$slot_id)); if(!$slot) return new WP_Error('slot_missing','Moment niet gevonden.');
        if(self::is_closed((int)$slot->calendar_id,$slot->slot_date)) return new WP_Error('closed','Deze dag is niet beschikbaar.');
        $current_user_id=get_current_user_id();
        $existing_for_user=null;
        if($current_user_id){ $existing_for_user=$wpdb->get_row($wpdb->prepare("SELECT b.* FROM {$t['book']} b JOIN {$t['slots']} s ON s.id=b.slot_id WHERE b.user_id=%d AND s.calendar_id=%d AND b.status NOT IN ('cancelled','cancelled_cm','geannuleerd') ORDER BY b.id DESC LIMIT 1",$current_user_id,(int)$slot->calendar_id)); }
        $booked_other=(int)$wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$t['book']} WHERE slot_id=%d AND status NOT IN ('cancelled','cancelled_cm','geannuleerd') AND (%d=0 OR user_id<>%d)",$slot_id,$current_user_id,$current_user_id));
        if($booked_other >= (int)$slot->capacity) return new WP_Error('slot_full','Dit moment is niet meer beschikbaar.');
        $fields=[]; $nameParts=[]; $email=''; $phone=''; $file_id=0;
        $cal_for_prefill=self::get_calendar((int)$slot->calendar_id); $model_prefill=($cal_for_prefill && (int)$cal_for_prefill->use_model_data && is_user_logged_in()) ? $this->model_prefill() : [];
        if($cal_for_prefill && (int)$cal_for_prefill->use_model_data && is_user_logged_in()) $file_id=$this->model_photo_id(get_current_user_id());
        foreach(self::get_fields($slot->calendar_id,true) as $f){ $key=$f->field_key; $postkey='cmap_field_'.$key; $val=''; if($f->type==='file' && !empty($_FILES[$postkey]['name'])){ require_once ABSPATH.'wp-admin/includes/file.php'; require_once ABSPATH.'wp-admin/includes/media.php'; require_once ABSPATH.'wp-admin/includes/image.php'; $up=media_handle_upload($postkey,0); if(!is_wp_error($up)){ $file_id=(int)$up; $val=(string)$file_id; } } else { $val=isset($data[$postkey])?sanitize_text_field($data[$postkey]):(isset($data[$key])?sanitize_text_field($data[$key]):''); if($val==='' && isset($model_prefill[$key])) $val=$model_prefill[$key]; } if($f->required && $val==='' && empty($model_prefill)) return new WP_Error('required','Verplicht veld ontbreekt: '.$f->label); $fields[$key]=$val; if(in_array($key,['voornaam','firstname'],true)) $nameParts[]=$val; if(in_array($key,['familienaam','lastname'],true)) $nameParts[]=$val; if($key==='naam') $nameParts[]=$val; if($key==='email') $email=$val; if(in_array($key,['telefoon','phone'],true)) $phone=$val; }
        $name=trim(implode(' ',array_filter($nameParts))); if($name==='' && is_user_logged_in()){ $u=wp_get_current_user(); $name=$u->display_name; if($email==='') $email=$u->user_email; } $now=current_time('mysql');
        $booking_data=['calendar_id'=>$slot->calendar_id,'slot_id'=>$slot_id,'user_id'=>get_current_user_id()?:null,'start_at'=>$slot->slot_date.' '.$slot->start_time,'end_at'=>$slot->slot_date.' '.$slot->end_time,'status'=>'confirmed','name'=>$name,'firstname'=>$fields['voornaam']??'','lastname'=>$fields['familienaam']??'','email'=>$email,'phone'=>$phone,'file_id'=>$file_id?:null,'fields'=>wp_json_encode($fields),'source'=>$rest?'app':'frontend','updated_at'=>$now];
        if(!empty($existing_for_user)){ $wpdb->update($t['book'],$booking_data,['id'=>(int)$existing_for_user->id]); $booking_id=(int)$existing_for_user->id; }
        else { $booking_data['created_at']=$now; $wpdb->insert($t['book'],$booking_data); $booking_id=(int)$wpdb->insert_id; }
        $this->send_triggered_notifications($booking_id,'confirmation'); return $rest?rest_ensure_response(['success'=>true,'booking_id'=>$booking_id]):['success'=>true,'booking_id'=>$booking_id];
    }

    public function send_triggered_notifications($booking_id,$trigger){
        global $wpdb; $t=self::tables(); $b=$wpdb->get_row($wpdb->prepare("SELECT b.*,c.title calendar_title FROM {$t['book']} b JOIN {$t['cal']} c ON c.id=b.calendar_id WHERE b.id=%d",$booking_id)); if(!$b) return;
        $rules=$wpdb->get_results($wpdb->prepare("SELECT r.*,tpl.channel,tpl.subject,tpl.body,tpl.name template_name FROM {$t['rules']} r JOIN {$t['templates']} tpl ON tpl.id=r.template_id WHERE r.calendar_id=%d AND r.trigger_type=%s AND r.active=1 AND tpl.active=1",$b->calendar_id,$trigger));
        foreach($rules as $r) $this->send_notification($b,$r);
    }
    public function send_notification($b,$rule){
        global $wpdb; $t=self::tables(); $vars=['{name}'=>$b->name,'{date}'=>date_i18n('d-m-Y',strtotime($b->start_at)),'{time}'=>date_i18n('H:i',strtotime($b->start_at)),'{calendar_title}'=>$b->calendar_title,'{email}'=>$b->email,'{phone}'=>$b->phone]; $result='';
        if($rule->channel==='email' && $b->email){ $result=wp_mail($b->email,strtr((string)$rule->subject,$vars),strtr((string)$rule->body,$vars),['Content-Type: text/html; charset=UTF-8'])?'sent':'failed'; }
        elseif($rule->channel==='sms' && $b->phone){ $message=strtr((string)$rule->body,$vars); $result=apply_filters('cmap_send_sms','not_configured',$b->phone,$message,$b,$rule); }
        $wpdb->insert($t['logs'], ['booking_id'=>$b->id,'rule_id'=>$rule->id,'template_id'=>$rule->template_id,'channel'=>$rule->channel,'trigger_type'=>$rule->trigger_type,'sent_at'=>current_time('mysql'),'result'=>is_string($result)?$result:'sent']);
    }
    public function run_scheduled_notifications(){
        global $wpdb; $t=self::tables(); $now=current_time('timestamp');
        $rules=$wpdb->get_results("SELECT r.*,tpl.channel,tpl.subject,tpl.body,tpl.name template_name FROM {$t['rules']} r JOIN {$t['templates']} tpl ON tpl.id=r.template_id WHERE r.active=1 AND tpl.active=1 AND r.trigger_type IN ('before','after')");
        foreach($rules as $r){ $targetSql=$r->trigger_type==='before' ? "TIMESTAMPDIFF(MINUTE,%s,b.start_at) BETWEEN %d AND %d" : "TIMESTAMPDIFF(MINUTE,b.end_at,%s) BETWEEN %d AND %d"; $min=(int)$r->offset_minutes; $bookings=$wpdb->get_results($wpdb->prepare("SELECT b.*,c.title calendar_title FROM {$t['book']} b JOIN {$t['cal']} c ON c.id=b.calendar_id WHERE b.calendar_id=%d AND b.status IN ('pending','confirmed') AND {$targetSql} AND NOT EXISTS (SELECT 1 FROM {$t['logs']} l WHERE l.booking_id=b.id AND l.rule_id=%d)",$r->calendar_id,current_time('mysql'),$min,$min+59,$r->id)); foreach($bookings as $b) $this->send_notification($b,$r); }
    }

    public function get_user_bookings($user_id){ global $wpdb; $t=self::tables(); return $wpdb->get_results($wpdb->prepare("SELECT b.*,c.title calendar_title FROM {$t['book']} b JOIN {$t['cal']} c ON c.id=b.calendar_id WHERE b.user_id=%d ORDER BY b.start_at DESC",$user_id)); }
    public function shortcode_my_bookings(){ if(!is_user_logged_in()) return '<div class="cmap-alert">Log in om je afspraken te bekijken.</div>'; $rows=$this->get_user_bookings(get_current_user_id()); $out='<div class="cmap-wrap"><h2>Mijn afspraken</h2><div class="cmap-tablewrap"><table class="cmap-table"><tr><th>Datum</th><th>Agenda</th><th>Status</th></tr>'; foreach($rows as $r){ $out.='<tr><td>'.self::h(date_i18n('d-m-Y H:i',strtotime($r->start_at))).'</td><td>'.self::h($r->calendar_title).'</td><td>'.self::h($r->status).'</td></tr>'; } return $out.'</table></div></div>'; }
    public function front_admin($slug){ if(!self::admin_user()) return '<div class="cmap-alert">Geen toegang.</div>'; $cal=self::get_calendar($slug); return '<div class="cmap-wrap"><h2>'.self::h($cal?$cal->title:$slug).' momenten</h2>'.$this->slots_front($cal?$cal->id:0).'</div>'; }
    public function slots_front($calendar_id){ $slots=self::get_slots($calendar_id,null,date('Y-m-d',strtotime('+180 days')),false); $out='<div class="cmap-tablewrap"><table class="cmap-table"><tr><th>Datum</th><th>Uur</th><th>Capaciteit</th><th>Bezet</th></tr>'; foreach($slots as $s){ $out.='<tr><td>'.self::h(date_i18n('d-m-Y',strtotime($s->slot_date))).'</td><td>'.self::h(substr($s->start_time,0,5).' - '.substr($s->end_time,0,5)).'</td><td>'.(int)$s->capacity.'</td><td>'.(int)$s->booked.'</td></tr>'; } return $out.'</table></div>'; }
    public function front_bookings($slug=''){ if(!self::admin_user()) return '<div class="cmap-alert">Geen toegang.</div>'; $cal=$slug?self::get_calendar($slug):null; return '<div class="cmap-wrap"><h2>Afspraken '.self::h($cal?$cal->title:'').'</h2>'.$this->bookings_table($cal?(int)$cal->id:0).'</div>'; }
    public function shortcode_list_markup(){ return '<section class="cmap-card"><h2>Shortcodes Class Models Agenda Pro</h2><div class="cmap-tablewrap"><table class="cmap-table"><tr><th>Shortcode</th><th>Gebruik</th></tr><tr><td><code>[cm_agenda_booking calendar="casting"]</code></td><td>Boekingsformulier voor elke agenda.</td></tr><tr><td><code>[casting_afspraak]</code></td><td>Casting afspraak maken.</td></tr><tr><td><code>[gratis_fotoshoot_afspraak]</code></td><td>Gratis fotoshoot afspraak maken.</td></tr><tr><td><code>[intake_gesprek_afspraak]</code></td><td>Intake afspraak maken.</td></tr><tr><td><code>[portfolio_agenda_afspraak]</code></td><td>Portfolio afspraak, compatibel.</td></tr><tr><td><code>[opleiding_inschrijven]</code></td><td>Opleiding afspraak, compatibel.</td></tr><tr><td><code>[cm_agenda_calendar]</code></td><td>Kalenderoverzicht.</td></tr><tr><td><code>[cm_agenda_slots_admin calendar="portfolio"]</code></td><td>Momentenlijst per agenda voor admin.</td></tr><tr><td><code>[cm_agenda_bookings_admin calendar="casting"]</code></td><td>Afsprakenlijst per agenda voor admin.</td></tr><tr><td><code>[cm_agenda_shortcode_lijst]</code></td><td>Deze lijst.</td></tr></table></div></section>'; }
}
endif;

register_activation_hook(__FILE__, ['CM_Agenda_Pro_V3','activate']);
register_deactivation_hook(__FILE__, ['CM_Agenda_Pro_V3','deactivate']);
CM_Agenda_Pro_V3::instance();
