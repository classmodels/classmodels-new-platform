"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PORTALS = void 0;
exports.isPortal = isPortal;
exports.PORTALS = ['guest', 'model', 'client'];
function isPortal(v) {
    return exports.PORTALS.includes(v);
}
