import { Injectable, OnModuleInit } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createContext, runInNewContext } from 'vm';
import { PrismaService } from '../prisma/prisma.service';
import { PluginHooksService } from './plugin-hooks.service';
import { resolvePluginsDir } from './resolve-plugins-dir';

type Manifest = {
  slug?: string;
  name?: string;
  version?: string;
  main?: string;
  hooks?: string[];
};

@Injectable()
export class PluginRuntimeService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private hooks: PluginHooksService,
  ) {}

  async onModuleInit() {
    await this.reload();
  }

  async reload() {
    this.hooks.clear();
    const enabled = await this.prisma.pluginSnippet.findMany({ where: { enabled: true } });
    const root = resolvePluginsDir();
    for (const row of enabled) {
      try {
        this.loadBundle(root, row.bundlePath, row.manifest as Manifest);
      } catch (e) {
        console.error(`Plugin load failed: ${row.slug}`, e);
      }
    }
  }

  private loadBundle(root: string, bundlePath: string, manifest: Manifest) {
    const mainFile = manifest.main?.trim() || 'index.js';
    const filePath = join(root, bundlePath, mainFile);
    const code = readFileSync(filePath, 'utf8');
    const api = {
      on: (hook: string, fn: (ctx?: Record<string, unknown>) => unknown) => {
        this.hooks.register(hook, fn as (ctx?: Record<string, unknown>) => unknown);
      },
      log: (...args: unknown[]) => console.log('[plugin]', ...args),
    };
    const sandbox = {
      module: { exports: {} as unknown },
      exports: {} as unknown,
      console: { log: api.log, warn: api.log, error: api.log },
      api,
    };
    createContext(sandbox);
    runInNewContext(
      code,
      sandbox,
      { filename: filePath, timeout: 3000, displayErrors: true },
    );
    const exp = sandbox.module.exports;
    if (typeof exp === 'function') {
      (exp as (a: typeof api) => void)(api);
    }
  }

  siteHeadHtml() {
    return this.hooks.runConcatStrings('site.head');
  }
}
