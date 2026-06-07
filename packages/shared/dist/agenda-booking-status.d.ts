/** Nederlandse statusbenamingen (admin + planning). */
export declare const AGENDA_BOOKING_STATUS_OPTS: readonly [{
    readonly v: "pending";
    readonly label: "Afspraak";
}, {
    readonly v: "confirmed";
    readonly label: "Ingeschreven";
}, {
    readonly v: "acknowledged";
    readonly label: "Komst bevestigd";
}, {
    readonly v: "attended";
    readonly label: "Langs geweest";
}, {
    readonly v: "cancelled";
    readonly label: "Geannuleerd";
}, {
    readonly v: "cancelled_cm";
    readonly label: "Geannuleerd (CM)";
}, {
    readonly v: "no_show";
    readonly label: "Niet ingeschreven";
}];
export type AgendaBookingStatusValue = (typeof AGENDA_BOOKING_STATUS_OPTS)[number]['v'];
export declare function agendaBookingStatusLabel(status: string): string;
