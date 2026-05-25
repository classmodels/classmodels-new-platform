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
    try {
      accessSync(root, fsConstants.W_OK);
      mediaRootWritable = true;
    } catch {
      mediaRootWritable = false;
    }
    let nodeUser: string | null = null;
    try {
      nodeUser = userInfo().username;
    } catch {
      nodeUser = null;
    }
    return {
      status: mediaRootWritable ? 'ok' : 'error',
      mediaRoot: root,
      mediaRootWritable,
      nodeUser,
      fileCount,
      home: process.env.HOME ?? null,
      cwd: process.cwd(),
      envMediaRoot: process.env.MEDIA_ROOT?.trim() || null,
    };
  }
}
