declare module 'qrcode' {
  const QRCode: {
    toDataURL(text: string, opts?: object): Promise<string>;
  };
  export default QRCode;
}

declare module 'nodemailer' {
  export function createTransport(opts: object): {
    sendMail(mail: object): Promise<unknown>;
  };
}
