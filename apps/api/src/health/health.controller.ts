import { Controller, Get } from '@nestjs/common';
import { accessSync, constants as fsConstants, readdirSync } from 'fs';
import { userInfo } from 'os';
import {
  inventoryHostingMediaPaths,
  resolveMediaRoot,
  resolveWritableMediaRoot,
} from '../config/resolve-media-root';

function combellHostRouterStatus() {
  const raw = process.env.COMBELL_HOST_ROUTER ?? '';
  const v = raw.trim().toLowerCase();
  const off = !v || v === '0' || v === 'false' || v === 'off' || v === 'no';
  const on = v === '1' || v === 'true' || v === 'yes' || v === 'on';
  const home = String(process.env.HOME ?? '').replace(/\/+$/, '');
  const inContainer = home === '/app' || home.endsWith('/app');
  const invalidButContainerFallback =
    !off && !on && process.env.NODE_ENV === 'production' && inContainer;
  return {
    env: raw || null,
    valid: on,
    invalidValue: !off && !on,
    dualProxyExpected: on || invalidButContainerFallback,
    hint:
      on ?
        null
      : invalidButContainerFallback ?
        'Zet COMBELL_HOST_ROUTER=1 in Combell (nu ongeldige waarde, bv. ".").'
      : 'Zet COMBELL_HOST_ROUTER=1 — anders draait alleen Next, geen Nest-uploads.',
  };
}

@Controller('health')
export class HealthController {
  @Get()
  ok() {
    return { status: 'ok', service: 'classmodels-api', ts: new Date().toISOString() };
  }

  /** Diagnose Node.js + mediapaden op Combell (geen secrets). Open: /__cm_api/health/media */
  @Get('media')
  media() {
    const root = resolveMediaRoot();
    const writableRoot = resolveWritableMediaRoot();
    let fileCount = 0;
    try {
      fileCount = readdirSync(root).length;
    } catch {
      fileCount = -1;
    }
    let mediaRootWritable: boolean | null = null;
    let mediaRootWriteCheck: string | null = null;
    try {
      accessSync(writableRoot, fsConstants.W_OK);
      mediaRootWritable = true;
    } catch (e) {
      mediaRootWritable = false;
      const code = e && typeof e === 'object' && 'code' in e ? (e as NodeJS.ErrnoException).code : undefined;
      mediaRootWriteCheck = code ?? (e instanceof Error ? e.message : String(e));
    }
    let nodeUser: string | null = null;
    try {
      nodeUser = userInfo().username;
    } catch {
      nodeUser = null;
    }

    const paths = inventoryHostingMediaPaths(2)
      .filter((p) => p.exists)
      .slice(0, 12)
      .map((p) => ({
        dir: p.dir,
        writable: p.writable,
        imageFiles: p.imageFiles,
      }));

    const rootsMatch = root.replace(/\/+$/, '') === writableRoot.replace(/\/+$/, '');

    return {
      status: mediaRootWritable ? 'ok' : 'error',
      combellHostRouter: combellHostRouterStatus(),
      mediaRoot: root,
      writableMediaRoot: writableRoot,
      rootsMatch,
      mediaRootWritable,
      mediaRootWriteCheck,
      nodeUser,
      fileCount,
      home: process.env.HOME ?? null,
      cwd: process.cwd(),
      envMediaRoot: process.env.MEDIA_ROOT?.trim() || null,
      envDataUploads: process.env.CM_COMBELL_DATA_UPLOADS?.trim() || null,
      hostingPathsSample: paths,
      note:
        'File Manager map data/uploads is niet altijd dezelfde als mediaRoot hierboven. ' +
        'Node leest/schrijft onder mediaRoot/writableMediaRoot.',
    };
  }
}
