import { Controller, Get } from '@nestjs/common';
import { accessSync, constants as fsConstants, readdirSync } from 'fs';
import { userInfo } from 'os';
import { resolveMediaRoot } from '../config/resolve-media-root';

@Controller('health')
export class HealthController {
  @Get()
  ok() {
    return { status: 'ok', service: 'classmodels-api', ts: new Date().toISOString() };
  }

  /** Diagnose mediapad op Combell (geen secrets). */
  @Get('media')
  media() {
    const root = resolveMediaRoot();
    let fileCount = 0;
    try {
      fileCount = readdirSync(root).length;
    } catch {
      fileCount = -1;
    }
    let mediaRootWritable: boolean | null = null;
    let mediaRootWriteCheck: string | null = null;
    try {
      accessSync(root, fsConstants.W_OK);
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
    return {
      mediaRoot: root,
      mediaRootWritable,
      mediaRootWriteCheck,
      nodeUser,
      fileCount,
      home: process.env.HOME ?? null,
      cwd: process.cwd(),
    };
  }
}
