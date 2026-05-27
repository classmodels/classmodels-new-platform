import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

@Catch()
export class HttpAllExceptionsFilter implements ExceptionFilter {
  private readonly log = new Logger(HttpAllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<{ status: (n: number) => { json: (b: unknown) => void } }>();
    const req = ctx.getRequest<{ url?: string; method?: string }>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      return res.status(status).json(typeof body === 'object' && body !== null ? body : { message: body });
    }

    const err = exception as { code?: string; message?: string };
    const code = err?.code;
    const rawMsg = exception instanceof Error ? exception.message : String(exception ?? '');

    if (code === 'LIMIT_FILE_SIZE') {
      return res.status(HttpStatus.PAYLOAD_TOO_LARGE).json({
        message: 'Bestand te groot voor de serverlimiet (MEDIA_ZIP_UPLOAD_MAX_BYTES).',
      });
    }
    if (code === 'ENOSPC' || /no space left/i.test(rawMsg)) {
      const isZipPath = String(req.url ?? '').includes('/media/upload-zip');
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: isZipPath
          ? 'Schijf vol tijdens ZIP-upload. Zorg dat MEDIA_BACKEND=r2 actief is (nieuwste deploy) — dan gaat de ZIP rechtstreeks naar R2. ' +
            'Anders: upload via Combell File Manager naar www/cm-media/uploads/inbox/ en gebruik “ZIP uit inbox registreren”. ' +
            'Of zet CM_COMBELL_DATA_UPLOADS=/data/sites/web/class-modelsbe/www/cm-media/uploads en herstart.'
          : 'Schijf vol op MEDIA_ROOT. Node schrijft mogelijk naar /app/shared (vol) terwijl je hosting nog ruimte heeft. ' +
            'Zet CM_COMBELL_DATA_UPLOADS=/data/sites/web/class-modelsbe/www/cm-media/uploads en herstart.',
      });
    }

    this.log.error(
      `${req.method ?? '?'} ${req.url ?? '?'}: ${rawMsg}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    const isZipPath = String(req.url ?? '').includes('/media/upload-zip');
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: isZipPath
        ? 'ZIP-upload mislukt op de server. Probeer opnieuw; grote ZIP’s worden in delen geüpload. Controleer schijfruimte en serverlogs.'
        : 'Er ging iets mis op de server. Probeer later opnieuw.',
    });
  }
}
