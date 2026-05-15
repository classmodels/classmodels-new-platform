import { Controller, Get } from '@nestjs/common';
import { readdirSync } from 'fs';
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
    return {
      mediaRoot: root,
      fileCount,
      home: process.env.HOME ?? null,
      cwd: process.cwd(),
    };
  }
}
