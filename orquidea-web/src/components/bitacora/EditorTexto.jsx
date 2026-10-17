/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ORQUÍDEA ERP — Sistema de Gestión Funeraria               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cliente         : Funeraria San José de Abrego                        ║
 * ║  Desarrollado por: Ing. Jhoan M. Romero Rivera                         ║
 * ║  LinkedIn        : https://linkedin.com/in/jmromeror87                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Módulo          : UI — editor de texto enriquecido (tipo Word)         ║
 * ║  Archivo         : components/bitacora/EditorTexto.jsx                  ║
 * ║  Versión         : v1.0.0                                               ║
 * ║  Fecha           : 2026-10-17                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  © 2026 Funeraria San José de Abrego. Todos los derechos reservados.  ║
 * ║  Software propietario. Prohibida su reproducción, distribución o       ║
 * ║  comercialización sin autorización escrita del titular.                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Procesador de texto (TipTap): estilos de párrafo, negrilla, cursiva,
 * subrayado, tachado, color, resaltado, viñetas, numeración, lista de tareas,
 * alineación, cita, línea, enlace, tablas e imágenes (botón, pegar o
 * arrastrar). Las imágenes se suben a la API (/bitacora/imagen).
 *
 *   <EditorTexto valor={html} onChange={html => …} placeholder="…" />
 */
import { useRef, useState } from 'react'
import { useEditor, useEditorState, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import Image from '@tiptap/extension-image'
import Highlight from '@tiptap/extension-highlight'
import { TextStyle, Color } from '@tiptap/extension-text-style'
import { TableKit } from '@tiptap/extension-table'
import { TaskList, TaskItem } from '@tiptap/extension-list'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Undo2, Redo2, Bold, Italic, Underline, Strikethrough, Highlighter, Baseline, List, ListOrdered, ListChecks,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Quote, Minus, Link2, ImagePlus, Table, RemoveFormatting,
  Loader2, Rows3, Columns3, Trash2,
} from 'lucide-react'
import api from '../../services/api.js'
import { toast } from '../../store/toast.store.js'
import { archivoUrl } from '../../utils/archivoUrl.js'
import { CSS_PROSA } from './prosa.js'

const CSS = `
.ed { border:1.5px solid #d1d5db; border-radius:12px; background:#fff; overflow:hidden; transition:border-color .15s, box-shadow .15s; }
.ed:focus-within { border-color:#10b981; box-shadow:0 0 0 3px rgba(16,185,129,.12); }
.ed-bar { display:flex; flex-wrap:wrap; align-items:center; gap:2px; padding:6px 8px; background:#f8fafc; border-bottom:1px solid #e5e7eb; position:sticky; top:0; z-index:2; }
.ed-sep { width:1px; height:22px; background:#e2e8f0; margin:0 5px; }
.ed-b { width:30px; height:30px; display:flex; align-items:center; justify-content:center; border:none; background:transparent; border-radius:7px; color:#334155; cursor:pointer; position:relative; }
.ed-b:hover:not(:disabled) { background:#e2e8f0; }
.ed-b.on { background:#d1fae5; color:#047857; }
.ed-b:disabled { opacity:.35; cursor:not-allowed; }
.ed-sel { height:30px; border:1px solid #e2e8f0; border-radius:7px; background:#fff; font-size:12.5px; font-weight:600; color:#334155; padding:0 6px; font-family:inherit; cursor:pointer; }
.ed-col { position:absolute; left:6px; right:6px; bottom:4px; height:3px; border-radius:2px; }
.ed-pop { position:absolute; top:34px; left:0; z-index:5; background:#fff; border:1px solid #e2e8f0; border-radius:10px; box-shadow:0 10px 30px rgba(15,23,42,.15); padding:8px; display:grid; grid-template-columns:repeat(6, 22px); gap:5px; }
.ed-pop button { width:22px; height:22px; border-radius:6px; border:1px solid rgba(0,0,0,.08); cursor:pointer; }
.ed-pop .ed-quitar { grid-column:1 / -1; width:auto; height:auto; padding:4px; font-size:11px; font-weight:700; color:#475569; background:#f1f5f9; font-family:inherit; }
.ed-cuerpo { max-height:520px; overflow-y:auto; }
.ed-cuerpo .tiptap { min-height:180px; padding:14px 16px; outline:none; }
.ed-cuerpo .tiptap p.is-editor-empty:first-child::before { content:attr(data-placeholder); color:#9ca3af; float:left; height:0; pointer-events:none; }
.ed-cuerpo .tiptap img.ProseMirror-selectednode { outline:3px solid #10b981; }
.ed-cuerpo .tiptap .selectedCell::after { content:''; position:absolute; inset:0; background:rgba(16,185,129,.12); pointer-events:none; }
.ed-cuerpo .tiptap td, .ed-cuerpo .tiptap th { position:relative; }
.ed-pie { display:flex; justify-content:space-between; gap:8px; padding:5px 10px; font-size:11px; color:#94a3b8; border-top:1px solid #f1f5f9; background:#fcfcfd; }
`

const COLORES = ['#111827', '#475569', '#b91c1c', '#c2410c', '#b45309', '#047857', '#0369a1', '#1d4ed8', '#6d28d9', '#be185d', '#0f766e', '#4d7c0f']
const RESALTES = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fecaca', '#fed7aa', '#e9d5ff']

async function subirImagen(file) {
  if (!/^image\//.test(file.type)) { toast.error('Solo se pueden insertar imágenes (JPG, PNG, WEBP o GIF)'); return null }
  if (file.size > 8 * 1024 * 1024) { toast.error('La imagen supera 8 MB'); return null }
  const fd = new FormData(); fd.append('file', file)
  try {
    const r = await api.post('/bitacora/imagen', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    return archivoUrl(r.data.url)
  } catch (e) {
    toast.error(e.response?.data?.error || 'No se pudo subir la imagen'); return null
  }
}

function Paleta({ colores, onElegir, onQuitar, textoQuitar }) {
  return (
    <div className="ed-pop" onMouseDown={e => e.preventDefault()}>
      {colores.map(c => <button key={c} type="button" style={{ background:c }} title={c} onClick={() => onElegir(c)}/>)}
      <button type="button" className="ed-quitar" onClick={onQuitar}>{textoQuitar}</button>
    </div>
  )
}

export default function EditorTexto({ valor = '', onChange, placeholder = 'Escriba aquí…', autoFocus = false }) {
  const archivo = useRef(null)
  const [subiendo, setSubiendo] = useState(0)
  const [pop, setPop] = useState(null)   // 'color' | 'resalte'

  const insertarArchivos = async (ed, files, pos) => {
    const imgs = [...files].filter(f => /^image\//.test(f.type))
    if (!imgs.length) return false
    setSubiendo(n => n + imgs.length)
    for (const f of imgs) {
      const src = await subirImagen(f)
      setSubiendo(n => n - 1)
      if (!src) continue
      // Imagen + párrafo nuevo debajo: el cursor queda listo para seguir
      // escribiendo (si la imagen quedara seleccionada, lo siguiente que se
      // escriba o inserte la reemplazaría).
      const nodos = [{ type: 'image', attrs: { src, alt: f.name } }, { type: 'paragraph' }]
      const ch = ed.chain().focus()
      ;(pos != null ? ch.insertContentAt(pos, nodos) : ch.insertContent(nodos)).run()
    }
    return true
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: { openOnClick: false, autolink: true, defaultProtocol: 'https' } }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Image.configure({ inline: false, allowBase64: false }),
      Highlight.configure({ multicolor: true }),
      TextStyle, Color,
      TableKit.configure({ table: { resizable: true } }),
      TaskList, TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder }),
    ],
    content: valor,
    autofocus: autoFocus ? 'end' : false,
    onUpdate: ({ editor }) => onChange?.(editor.isEmpty ? '' : editor.getHTML()),
    editorProps: {
      handlePaste: (view, event) => {
        const files = event.clipboardData?.files
        if (files?.length && [...files].some(f => /^image\//.test(f.type))) { insertarArchivos(editorRef.current, files); return true }
        return false
      },
      handleDrop: (view, event, slice, moved) => {
        const files = event.dataTransfer?.files
        if (moved || !files?.length || ![...files].some(f => /^image\//.test(f.type))) return false
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos
        insertarArchivos(editorRef.current, files, pos); return true
      },
    },
  })
  const editorRef = useRef(null); editorRef.current = editor

  const st = useEditorState({
    editor,
    selector: ({ editor: e }) => e ? ({
      bold: e.isActive('bold'), italic: e.isActive('italic'), underline: e.isActive('underline'), strike: e.isActive('strike'),
      bullet: e.isActive('bulletList'), ordered: e.isActive('orderedList'), task: e.isActive('taskList'),
      quote: e.isActive('blockquote'), link: e.isActive('link'), table: e.isActive('table'), highlight: e.isActive('highlight'),
      left: e.isActive({ textAlign: 'left' }), center: e.isActive({ textAlign: 'center' }), right: e.isActive({ textAlign: 'right' }), justify: e.isActive({ textAlign: 'justify' }),
      nivel: [1, 2, 3].find(l => e.isActive('heading', { level: l })) || 0,
      color: e.getAttributes('textStyle').color || null, resalte: e.getAttributes('highlight').color || null,
      deshacer: e.can().undo(), rehacer: e.can().redo(),
      palabras: e.getText().trim() ? e.getText().trim().split(/\s+/).length : 0,
    }) : {},
  })

  if (!editor) return null
  const c = () => editor.chain().focus()
  const B = ({ on, title, onClick, children, disabled }) => (
    <button type="button" className={`ed-b${on ? ' on' : ''}`} title={title} disabled={disabled}
      onMouseDown={e => e.preventDefault()} onClick={onClick}>{children}</button>
  )

  const ponerEnlace = () => {
    const prev = editor.getAttributes('link').href || ''
    const url = window.prompt('Dirección del enlace (deje vacío para quitarlo):', prev)
    if (url === null) return
    if (!url.trim()) { c().extendMarkRange('link').unsetLink().run(); return }
    c().extendMarkRange('link').setLink({ href: /^(https?:|mailto:|tel:)/.test(url) ? url : `https://${url}` }).run()
  }

  return (
    <>
      <style>{CSS + CSS_PROSA}</style>
      <div className="ed">
        <div className="ed-bar">
          <B title="Deshacer (Ctrl+Z)" disabled={!st.deshacer} onClick={() => c().undo().run()}><Undo2 size={15}/></B>
          <B title="Rehacer (Ctrl+Y)" disabled={!st.rehacer} onClick={() => c().redo().run()}><Redo2 size={15}/></B>
          <span className="ed-sep"/>
          <select className="ed-sel" value={st.nivel} title="Estilo de párrafo"
            onChange={e => { const l = +e.target.value; l ? c().setHeading({ level: l }).run() : c().setParagraph().run() }}>
            <option value={0}>Texto normal</option>
            <option value={1}>Título 1</option>
            <option value={2}>Título 2</option>
            <option value={3}>Título 3</option>
          </select>
          <span className="ed-sep"/>
          <B on={st.bold} title="Negrilla (Ctrl+B)" onClick={() => c().toggleBold().run()}><Bold size={15}/></B>
          <B on={st.italic} title="Cursiva (Ctrl+I)" onClick={() => c().toggleItalic().run()}><Italic size={15}/></B>
          <B on={st.underline} title="Subrayado (Ctrl+U)" onClick={() => c().toggleUnderline().run()}><Underline size={15}/></B>
          <B on={st.strike} title="Tachado" onClick={() => c().toggleStrike().run()}><Strikethrough size={15}/></B>
          <span style={{ position:'relative' }}>
            <B title="Color de letra" onClick={() => setPop(p => p === 'color' ? null : 'color')}>
              <Baseline size={15}/><span className="ed-col" style={{ background: st.color || '#111827' }}/>
            </B>
            {pop === 'color' && <Paleta colores={COLORES} textoQuitar="Color automático"
              onElegir={col => { c().setColor(col).run(); setPop(null) }} onQuitar={() => { c().unsetColor().run(); setPop(null) }}/>}
          </span>
          <span style={{ position:'relative' }}>
            <B on={st.highlight} title="Resaltar" onClick={() => setPop(p => p === 'resalte' ? null : 'resalte')}>
              <Highlighter size={15}/><span className="ed-col" style={{ background: st.resalte || '#fef08a' }}/>
            </B>
            {pop === 'resalte' && <Paleta colores={RESALTES} textoQuitar="Sin resaltado"
              onElegir={col => { c().setHighlight({ color: col }).run(); setPop(null) }} onQuitar={() => { c().unsetHighlight().run(); setPop(null) }}/>}
          </span>
          <span className="ed-sep"/>
          <B on={st.bullet} title="Viñetas" onClick={() => c().toggleBulletList().run()}><List size={15}/></B>
          <B on={st.ordered} title="Numeración" onClick={() => c().toggleOrderedList().run()}><ListOrdered size={15}/></B>
          <B on={st.task} title="Lista de tareas (casillas)" onClick={() => c().toggleTaskList().run()}><ListChecks size={15}/></B>
          <span className="ed-sep"/>
          <B on={st.left} title="Alinear a la izquierda" onClick={() => c().setTextAlign('left').run()}><AlignLeft size={15}/></B>
          <B on={st.center} title="Centrar" onClick={() => c().setTextAlign('center').run()}><AlignCenter size={15}/></B>
          <B on={st.right} title="Alinear a la derecha" onClick={() => c().setTextAlign('right').run()}><AlignRight size={15}/></B>
          <B on={st.justify} title="Justificar" onClick={() => c().setTextAlign('justify').run()}><AlignJustify size={15}/></B>
          <span className="ed-sep"/>
          <B on={st.quote} title="Cita / recuadro" onClick={() => c().toggleBlockquote().run()}><Quote size={15}/></B>
          <B title="Línea divisoria" onClick={() => c().setHorizontalRule().run()}><Minus size={15}/></B>
          <B on={st.link} title="Enlace" onClick={ponerEnlace}><Link2 size={15}/></B>
          <B title="Insertar imagen (también puede pegarla o arrastrarla)" onClick={() => archivo.current?.click()}>
            {subiendo ? <Loader2 size={15} className="pl-spin"/> : <ImagePlus size={15}/>}
          </B>
          <B on={st.table} title="Insertar tabla 3 × 3" onClick={() => c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><Table size={15}/></B>
          {st.table && <>
            <B title="Agregar fila debajo" onClick={() => c().addRowAfter().run()}><Rows3 size={15}/></B>
            <B title="Agregar columna a la derecha" onClick={() => c().addColumnAfter().run()}><Columns3 size={15}/></B>
            <B title="Eliminar tabla" onClick={() => c().deleteTable().run()}><Trash2 size={15}/></B>
          </>}
          <span className="ed-sep"/>
          <B title="Quitar formato" onClick={() => c().unsetAllMarks().clearNodes().run()}><RemoveFormatting size={15}/></B>
          <input ref={archivo} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden
            onChange={e => { insertarArchivos(editor, e.target.files); e.target.value = '' }}/>
        </div>
        <div className="ed-cuerpo bt-prosa" onClick={() => pop && setPop(null)}>
          <EditorContent editor={editor}/>
        </div>
        <div className="ed-pie">
          <span>{subiendo ? `Subiendo ${subiendo} imagen(es)…` : 'Puede pegar o arrastrar imágenes directamente en el texto'}</span>
          <span>{st.palabras} palabra{st.palabras === 1 ? '' : 's'}</span>
        </div>
      </div>
    </>
  )
}
