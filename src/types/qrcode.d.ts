declare module "qrcode" {
  interface QRCodeToStringOptions {
    type?: "svg" | "utf8" | "terminal";
    width?: number;
    margin?: number;
    errorCorrectionLevel?: "L" | "M" | "Q" | "H";
    color?: {
      dark?: string;
      light?: string;
    };
  }

  interface QRCodeModule {
    toString(
      text: string,
      options?: QRCodeToStringOptions
    ): Promise<string>;
  }

  const QRCode: QRCodeModule;
  export default QRCode;
}
