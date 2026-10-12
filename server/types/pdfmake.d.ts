declare module 'pdfmake' {
  export interface PdfmakeOutput {
    getBuffer(): Promise<Buffer>
  }
  export interface PdfmakeInstance {
    setFonts(fonts: Record<string, Record<string, string>>): void
    setLocalAccessPolicy(cb: () => boolean): void
    setUrlAccessPolicy(cb: () => boolean): void
    createPdf(docDefinition: Record<string, unknown>): PdfmakeOutput
  }
  const instance: PdfmakeInstance
  export default instance
}
