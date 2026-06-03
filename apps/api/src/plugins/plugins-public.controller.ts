import { Controller, Get } from '@nestjs/common';
import { PluginRuntimeService } from './plugin-runtime.service';

@Controller('public/plugins')
export class PluginsPublicController {
  constructor(private runtime: PluginRuntimeService) {}

  /** HTML/JS voor &lt;head&gt; van de publieke site (actieve plugins). */
  @Get('site-head')
  async siteHead() {
    const html = await this.runtime.siteHeadHtml();
    return { html };
  }
}
