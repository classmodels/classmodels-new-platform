"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AGENDA_BOOKING_STATUS_OPTS = void 0;
exports.agendaBookingStatusLabel = agendaBookingStatusLabel;
/** Nederlandse statusbenamingen (admin + planning). */
exports.AGENDA_BOOKING_STATUS_OPTS = [
    { v: 'pending', label: 'Afspraak' },
    { v: 'confirmed', label: 'Ingeschreven' },
    { v: 'acknowledged', label: 'Komst bevestigd' },
    { v: 'attended', label: 'Langs geweest' },
    { v: 'cancelled', label: 'Geannuleerd' },
    { v: 'cancelled_cm', label: 'Geannuleerd (CM)' },
    { v: 'no_show', label: 'Niet ingeschreven' },
];
function agendaBookingStatusLabel(status) {
    const row = exports.AGENDA_BOOKING_STATUS_OPTS.find((o) => o.v === status);
    return row?.label ?? status;
}
