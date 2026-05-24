declare module 'heic-convert' {
  type HeicConvertInput = {
    buffer: Buffer | ArrayBuffer;
    format: 'JPEG' | 'PNG';
    quality?: number;
  };

  function convert(input: HeicConvertInput): Promise<ArrayBuffer>;

  export default convert;
}
