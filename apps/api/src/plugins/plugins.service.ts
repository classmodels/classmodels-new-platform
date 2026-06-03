import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { randomUUID } from 'crypto';
import * as unzipper from 'unzipper';
import { PrismaService } from '../prisma/prisma.service';
import { PluginRuntimeService } from './plugin-runtime.service';
import { resolvePluginsDir } from './resolve-plugins-dir';

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,48}$/;
const MANIFEST_NAMES = ['cm-plugin.json', 'manifest.json'];

export type PluginManifest = {
  slug: string;
  name: string;
  version: string;
  description?: string;
  main?: string;
  hooks?: string[];
};

@Injectable()
export class PluginsService {
  constructor(
    private prisma: PrismaService,
    private runtime: PluginRuntimeService,
  ) {}

  list() {
    return this.prisma.pluginSnippet.findMany({ orderBy: { slug: 'asc' } });
  }

  async upload(file: Express.Multer.File) {
    if (!file?.buffer?.length) throw new BadRequestException('Geen bestand');
    const name = (file.originalname || '').toLowerCase();
    const root = resolvePluginsDir();

    if (name.endsWith('.zip')) {
      return this.uploadZip(file.buffer, root);
    }
    if (name.endsWith('.js')) {
      return this.uploadJs(file.buffer, root, name);
    }
    throw new BadRequestException('Upload een .zip (manifest + code) of een .js met manifest-comment');
  }

  private parseManifest(raw: string): PluginManifest {
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new BadRequestException('manifest.json ongeldig');
    }
    if (!data || typeof data !== 'object') throw new BadRequestException('manifest ontbreekt');
    const m = data as Record<string, unknown>;
    const slug = String(m.slug ?? '').trim();
    const version = String(m.version ?? '1.0.0').trim();
    const label = String(m.name ?? m.slug ?? '').trim();
    if (!SLUG_RE.test(slug)) {
      throw new BadRequestException('slug moet kleine letters, cijfers en koppeltekens zijn');
    }
    if (!label) throw new BadRequestException('name in manifest is verplicht');
    return {
      slug,
      name: label,
      version,
      description: m.description != null ? String(m.description) : undefined,
      main: m.main != null ? String(m.main) : 'index.js',
      hooks: Array.isArray(m.hooks) ? m.hooks.map(String) : [],
    };
  }

  private async uploadZip(buffer: Buffer, root: string) {
    const tmpDir = join(root, `_tmp_${randomUUID()}`);
    mkdirSync(tmpDir, { recursive: true });
    try {
      const directory = await unzipper.Open.buffer(buffer);
      await directory.extract({ path: tmpDir });

      let manifestPath: string | null = null;
      for (const n of MANIFEST_NAMES) {
        const hit = directory.files.find((f) => f.path === n || f.path.endsWith(`/${n}`));
        if (hit) {
          manifestPath = join(tmpDir, hit.path);
          break;
        }
      }
      if (!manifestPath) throw new BadRequestException('ZIP moet cm-plugin.json of manifest.json bevatten');

      const manifest = this.parseManifest(readFileSync(manifestPath, 'utf8'));
      const sourceDir = dirname(manifestPath);
      const bundleDir = join(root, manifest.slug);
      if (existsSync(bundleDir)) rmSync(bundleDir, { recursive: true, force: true });
      cpSync(sourceDir, bundleDir, { recursive: true });

      const mainFile = manifest.main ?? 'index.js';
      if (!existsSync(join(bundleDir, mainFile))) {
        throw new BadRequestException(`Hoofdbestand "${mainFile}" ontbreekt in ZIP`);
      }

      writeFileSync(join(bundleDir, 'cm-plugin.json'), JSON.stringify(manifest, null, 2));
      return this.upsertRecord(manifest, manifest.slug, false);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  private async uploadJs(buffer: Buffer, root: string, originalName: string) {
    const code = buffer.toString('utf8');
    const match = code.match(/\/\*\s*cm-plugin:\s*(\{[\s\S]*?\})\s*\*\//);
    if (!match) {
      throw new BadRequestException(
        'JS-bestand moet bovenaan een blok /* cm-plugin: { "slug": "...", "name": "...", "version": "1.0.0" } */ bevatten',
      );
    }
    const manifest = this.parseManifest(match[1]);
    const bundleDir = join(root, manifest.slug);
    mkdirSync(bundleDir, { recursive: true });
    const main = manifest.main ?? 'index.js';
    writeFileSync(join(bundleDir, main), code);
    writeFileSync(join(bundleDir, 'cm-plugin.json'), JSON.stringify(manifest, null, 2));
    return this.upsertRecord(manifest, manifest.slug, false);
  }

  private async upsertRecord(manifest: PluginManifest, bundleRel: string, enabled: boolean) {
    const row = await this.prisma.pluginSnippet.upsert({
      where: { slug: manifest.slug },
      create: {
        slug: manifest.slug,
        version: manifest.version,
        enabled,
        manifest: manifest as object,
        bundlePath: bundleRel,
      },
      update: {
        version: manifest.version,
        manifest: manifest as object,
        bundlePath: bundleRel,
      },
    });
    return row;
  }

  async setEnabled(id: string, enabled: boolean) {
    const row = await this.prisma.pluginSnippet.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Snippet niet gevonden');
    const updated = await this.prisma.pluginSnippet.update({
      where: { id },
      data: { enabled },
    });
    await this.runtime.reload();
    return updated;
  }

  async remove(id: string) {
    const row = await this.prisma.pluginSnippet.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Snippet niet gevonden');
    const root = resolvePluginsDir();
    const dir = join(root, row.bundlePath);
    if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
    await this.prisma.pluginSnippet.delete({ where: { id } });
    await this.runtime.reload();
    return { ok: true };
  }
}
