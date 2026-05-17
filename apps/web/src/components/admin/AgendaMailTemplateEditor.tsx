'use client';

import {
  applyAgendaMailPlaceholders,
  buildAgendaMailPreviewDemoVars,
  buildAgendaMailPreviewDemoVarsPlain,
  coerceOutgoingEmailHtml,
} from '@cm/shared';
import dynamic from 'next/dynamic';
import { useCallback, useMemo, useRef, useState } from 'react';
import type { Editor as TinyMceEditor } from 'tinymce';

const TinyEditor = dynamic(() => import('@tinymce/tinymce-react').then((m) => m.Editor), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[260px] items-center justify-center rounded border border-dashed border-line bg-panel text-xs text-muted">
      Editor laden…
    </div>
  ),
});

const TINYMCE_SRC = 'https://cdn.jsdelivr.net/npm/tinymce@7.6.1/tinymce.min.js';

type HtmlEditorProps = {
  value: string;
  onChange: (next: string) => void;
};

export function AgendaMailHtmlEditor({ value, onChange }: HtmlEditorProps) {
  const [mode, setMode] = useState<'visual' | 'html'>('visual');
  const editorRef = useRef<TinyMceEditor | null>(null);

  const goHtml = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.getContent());
    }
    setMode('html');
  }, [onChange]);

  const goVisual = useCallback(() => {
    setMode('visual');
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1 border-b border-line pb-2">
        <button
          type="button"
          onClick={goVisual}
          className={`rounded px-3 py-1 text-xs font-medium ${
            mode === 'visual' ? 'bg-zinc-900 text-white' : 'border border-line bg-white text-ink'
          }`}
        >
          Visueel
        </button>
        <button
          type="button"
          onClick={goHtml}
          className={`rounded px-3 py-1 text-xs font-medium ${
            mode === 'html' ? 'bg-zinc-900 text-white' : 'border border-line bg-white text-ink'
          }`}
        >
          Tekst (HTML)
        </button>
      </div>
      {mode === 'visual' ? (
        <div className="overflow-hidden rounded border border-line bg-white">
          <TinyEditor
            licenseKey="gpl"
            tinymceScriptSrc={TINYMCE_SRC}
            value={value}
            onInit={(_e, ed) => {
              editorRef.current = ed;
            }}
            onEditorChange={(html) => onChange(html)}
            init={{
              height: 460,
              menubar: true,
              branding: false,
              promotion: false,
              relative_urls: false,
              remove_script_host: false,
              convert_urls: false,
              valid_elements: '*[*]',
              extended_valid_elements: '*[*]',
              verify_html: false,
              entity_encoding: 'raw',
              plugins: [
                'advlist',
                'autolink',
                'lists',
                'link',
                'charmap',
                'preview',
                'searchreplace',
                'visualblocks',
                'code',
                'fullscreen',
                'insertdatetime',
                'table',
                'help',
                'wordcount',
                'image',
              ],
              toolbar:
                'undo redo | blocks | bold italic underline strikethrough | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | forecolor backcolor | link table image | removeformat code fullscreen',
              content_style:
                'body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; font-size: 14px; line-height: 1.5; }',
            }}
          />
        </div>
      ) : (
        <textarea
          className="min-h-[460px] w-full rounded border border-line bg-zinc-50 px-3 py-2 font-mono text-xs leading-relaxed text-ink"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
        />
      )}
    </div>
  );
}

type PreviewProps = {
  channel: string;
  body: string;
  subject: string;
};

export function AgendaMailTemplatePreview({ channel, body, subject }: PreviewProps) {
  const isSms = channel === 'sms';

  const { subjectLine, bodyContent } = useMemo(() => {
    if (isSms) {
      const vars = buildAgendaMailPreviewDemoVarsPlain();
      return {
        subjectLine: applyAgendaMailPlaceholders(subject || '', vars),
        bodyContent: applyAgendaMailPlaceholders(body, vars),
      };
    }
    const vars = buildAgendaMailPreviewDemoVars();
    return {
      subjectLine: applyAgendaMailPlaceholders(subject || '', vars),
      bodyContent: coerceOutgoingEmailHtml(applyAgendaMailPlaceholders(body, vars)),
    };
  }, [body, subject, isSms]);

  return (
    <div className="rounded-lg border border-line bg-zinc-50 p-3">
      <p className="text-xs font-semibold text-ink">Voorbeeld met demogegevens</p>
      <p className="mt-1 border-b border-line pb-2 text-sm font-medium text-zinc-800">
        Onderwerp: <span className="font-normal text-zinc-700">{subjectLine || '(leeg)'}</span>
      </p>
      {isSms ? (
        <pre className="mt-2 max-h-[min(70vh,520px)] overflow-auto whitespace-pre-wrap rounded border border-zinc-200 bg-white p-3 text-xs text-zinc-800">
          {bodyContent}
        </pre>
      ) : (
        <iframe
          title="E-mailvoorbeeld"
          className="mt-2 h-[min(70vh,560px)] w-full rounded border border-zinc-200 bg-white"
          sandbox="allow-same-origin"
          srcDoc={bodyContent}
        />
      )}
    </div>
  );
}
