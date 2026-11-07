declare module 'pdfmake' {
  export interface PdfmakeOutput {
    getBuffer(): Promise<Buffer>
  }
  export interface PdfmakeInstance {
    setFonts(fonts: Record<string, Record<string, string>>): void
    setLocalAccessPolicy(cb: (path: string) => boolean): void
    setUrlAccessPolicy(cb: (url: string) => boolean): void
    createPdf(docDefinition: Record<string, unknown>): PdfmakeOutput
  }
  const instance: PdfmakeInstance
  export default instance
}
