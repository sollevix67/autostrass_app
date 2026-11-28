import { useEffect, useRef, useState } from 'react'
import type { PDFDocumentLoadingTask, PDFDocumentProxy, PDFPageProxy, RenderTask } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'
import { Icon } from './Icon'
import './PdfReader.css'

export function PdfReader({ file }: { file: Blob }) {
  const [result, setResult] = useState<{ file: Blob; document: PDFDocumentProxy | null } | null>(null)

  useEffect(() => {
    let active = true
    let task: PDFDocumentLoadingTask | undefined

    async function open() {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
      if (!active) return
      const data = await file.arrayBuffer()
      if (!active) return
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
      task = pdfjs.getDocument({ data })
      const document = await task.promise
      if (active) setResult({ file, document })
    }

    void open().catch(() => { if (active) setResult({ file, document: null }) })
    return () => {
      active = false
      if (task) void task.destroy()
    }
  }, [file])

  if (result?.file !== file) return <p className="form-hint" role="status">Ouverture du PDF…</p>
  if (!result.document) return <p className="error-banner" role="alert">Impossible de lire ce PDF.</p>
  return <PdfPages key={result.document.loadingTask.docId} pdf={result.document} />
}

function PdfPages({ pdf }: { pdf: PDFDocumentProxy }) {
  const viewport = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [page, setPage] = useState(1)
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)))
    observer.observe(viewport.current!)
    return () => observer.disconnect()
  }, [])

  useEffect(() => { viewport.current?.scrollTo(0, 0) }, [page])

  return <div className="pdf-reader">
    <div className="pdf-reader-controls">
      <div className="pdf-reader-navigation">
        <button type="button" className="secondary-button pdf-reader-previous" aria-label="Page précédente" title="Page précédente"
          disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}><Icon name="chevron-right" /></button>
        <span role="status" aria-atomic="true">Page {page} sur {pdf.numPages}</span>
        <button type="button" className="secondary-button" aria-label="Page suivante" title="Page suivante"
          disabled={page === pdf.numPages} onClick={() => setPage((current) => Math.min(pdf.numPages, current + 1))}><Icon name="chevron-right" /></button>
      </div>
      <label className="pdf-reader-zoom">Zoom
        <select className="form-select" aria-label="Zoom du PDF" value={zoom} onChange={(event) => setZoom(Number(event.target.value))}>
          <option value={1}>Largeur de page</option>
          <option value={1.5}>150 %</option>
          <option value={2}>200 %</option>
          <option value={3}>300 %</option>
        </select>
      </label>
    </div>
    <div ref={viewport} className="pdf-reader-viewport" role="region" aria-label={`Contenu de la page ${page}`} tabIndex={0}>
      {width > 0 && <PdfPage key={`${page}-${width}-${zoom}`} pdf={pdf} number={page} width={width * zoom} />}
    </div>
  </div>
}

function PdfPage({ pdf, number, width }: { pdf: PDFDocumentProxy; number: number; width: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [text, setText] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    let page: PDFPageProxy | undefined
    let renderTask: RenderTask | undefined

    async function draw() {
      page = await pdf.getPage(number)
      if (!active) return
      const canvas = canvasRef.current!
      const viewport = page.getViewport({ scale: width / page.getViewport({ scale: 1 }).width })
      // Borner le bitmap préserve la mémoire des terminaux mobiles au zoom maximal.
      const density = Math.min(window.devicePixelRatio || 1, Math.sqrt(8_000_000 / (viewport.width * viewport.height)))
      canvas.width = Math.max(1, Math.round(viewport.width * density))
      canvas.height = Math.max(1, Math.round(viewport.height * density))
      canvas.style.width = `${width}px`
      renderTask = page.render({ canvas, viewport, transform: [density, 0, 0, density, 0, 0] })
      const [content] = await Promise.all([page.getTextContent(), renderTask.promise])
      if (active) setText(content.items.map((item) => 'str' in item ? item.str : '').join(' ').trim())
    }

    void draw().catch(() => { if (active) setFailed(true) })
    return () => {
      active = false
      renderTask?.cancel()
      page?.cleanup()
    }
  }, [pdf, number, width])

  return <>
    {failed ? <p className="error-banner" role="alert">Impossible d’afficher cette page du PDF.</p>
      : text === null && <p className="form-hint" role="status">Affichage de la page…</p>}
    <canvas ref={canvasRef} hidden={text === null} aria-hidden="true" />
    {text !== null && <p className="sr-only pdf-reader-text">{text || 'Cette page ne contient pas de texte.'}</p>}
  </>
}
