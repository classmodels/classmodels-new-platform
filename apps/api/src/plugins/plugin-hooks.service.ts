import { Injectable } from '@nestjs/common';

type HookFn = (ctx?: Record<string, unknown>) => unknown;

@Injectable()
export class PluginHooksService {
  private readonly hooks = new Map<string, HookFn[]>();

  clear() {
    this.hooks.clear();
  }

  register(name: string, fn: HookFn) {
    const list = this.hooks.get(name) ?? [];
    list.push(fn);
    this.hooks.set(name, list);
  }

  async run(name: string, ctx?: Record<string, unknown>): Promise<unknown[]> {
    const list = this.hooks.get(name) ?? [];
    const out: unknown[] = [];
    for (const fn of list) {
      try {
        out.push(await fn(ctx));
      } catch (e) {
        console.error(`Plugin hook "${name}" error`, e);
      }
    }
    return out;
  }

  async runConcatStrings(name: string, ctx?: Record<string, unknown>): Promise<string> {
    const parts = await this.run(name, ctx);
    return parts
      .filter((v) => typeof v === 'string' && v.trim())
      .map((v) => String(v))
      .join('\n');
  }
}
