import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'cm_permissions';

/** Vereist dat de gebruiker **alle** genoemde permissies heeft (of `*`). */
export const Permissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
