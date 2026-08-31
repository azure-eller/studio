/** Self-contained styles; the host site's Tailwind never sees this package. Prefix: sa- */
export const ADMIN_CSS = `
.sa{--sa-bg:#fafafa;--sa-fg:#111;--sa-muted:#6b7280;--sa-line:#e5e7eb;--sa-accent:#111;--sa-danger:#b91c1c;--sa-ok:#15803d;font:14px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:var(--sa-fg);background:var(--sa-bg);min-height:100vh;display:grid;grid-template-columns:220px 1fr}
.sa *{box-sizing:border-box}
.sa a{color:inherit}
.sa-side{border-right:1px solid var(--sa-line);background:#fff;padding:20px 16px;display:flex;flex-direction:column;gap:4px}
.sa-side h1{font-size:15px;margin:0 0 12px;padding:0 8px}
.sa-side a{display:block;padding:7px 8px;border-radius:6px;text-decoration:none;color:var(--sa-fg)}
.sa-side a.on,.sa-side a:hover{background:#f3f4f6}
.sa-side .sa-user{margin-top:auto;font-size:12px;color:var(--sa-muted);padding:8px}
.sa-main{padding:28px 32px;max-width:1100px}
.sa-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px}
.sa-head h2{margin:0;font-size:20px}
.sa-btn{appearance:none;border:1px solid var(--sa-line);background:#fff;color:var(--sa-fg);padding:7px 12px;border-radius:6px;cursor:pointer;font:inherit}
.sa-btn:hover{background:#f3f4f6}
.sa-btn.pri{background:var(--sa-accent);color:#fff;border-color:var(--sa-accent)}
.sa-btn.pri:hover{opacity:.9}
.sa-btn.danger{color:var(--sa-danger);border-color:#fecaca}
.sa-btn:disabled{opacity:.5;cursor:default}
.sa-btn.sm{padding:3px 8px;font-size:12px}
.sa-table{width:100%;border-collapse:collapse;background:#fff;border:1px solid var(--sa-line);border-radius:8px;overflow:hidden}
.sa-table th,.sa-table td{text-align:left;padding:10px 12px;border-bottom:1px solid var(--sa-line);vertical-align:top}
.sa-table th{font-weight:600;font-size:12px;color:var(--sa-muted);text-transform:uppercase;letter-spacing:.03em;cursor:pointer;user-select:none}
.sa-table tr:last-child td{border-bottom:0}
.sa-table tr.row:hover td{background:#f9fafb;cursor:pointer}
.sa-input,.sa-textarea,.sa-select{width:100%;padding:8px 10px;border:1px solid var(--sa-line);border-radius:6px;font:inherit;background:#fff;color:var(--sa-fg)}
.sa-textarea{min-height:110px;resize:vertical}
.sa-field{margin-bottom:18px}
.sa-field label{display:block;font-weight:600;margin-bottom:6px}
.sa-field .help{color:var(--sa-muted);font-size:12px;margin-top:4px}
.sa-field .err{color:var(--sa-danger);font-size:12px;margin-top:4px}
.sa-form{background:#fff;border:1px solid var(--sa-line);border-radius:8px;padding:24px;max-width:760px}
.sa-actions{display:flex;gap:8px;align-items:center;margin-top:8px}
.sa-msg{padding:10px 12px;border-radius:6px;margin-bottom:16px;background:#f3f4f6}
.sa-msg.err{background:#fef2f2;color:var(--sa-danger)}
.sa-msg.ok{background:#f0fdf4;color:var(--sa-ok)}
.sa-toolbar{display:flex;flex-wrap:wrap;gap:4px;border:1px solid var(--sa-line);border-bottom:0;border-radius:6px 6px 0 0;padding:6px;background:#f9fafb}
.sa-toolbar button{border:1px solid transparent;background:transparent;padding:4px 8px;border-radius:4px;cursor:pointer;font:inherit;font-size:13px}
.sa-toolbar button.on,.sa-toolbar button:hover{background:#fff;border-color:var(--sa-line)}
.sa-editor{border:1px solid var(--sa-line);border-radius:0 0 6px 6px;background:#fff;padding:12px 14px;min-height:240px}
.sa-editor .tiptap:focus{outline:none}
.sa-editor .tiptap p{margin:0 0 .75em}
.sa-editor .tiptap h2{font-size:1.4em;margin:.8em 0 .4em}
.sa-editor .tiptap h3{font-size:1.15em;margin:.8em 0 .4em}
.sa-editor .tiptap img{max-width:100%;height:auto;display:block;border-radius:4px}
.sa-editor .tiptap blockquote{border-left:3px solid var(--sa-line);margin:0;padding-left:12px;color:var(--sa-muted)}
.sa-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px}
.sa-thumb{border:1px solid var(--sa-line);border-radius:6px;background:#fff;overflow:hidden;cursor:pointer;text-align:left;padding:0;font:inherit}
.sa-thumb.on{outline:2px solid var(--sa-accent)}
.sa-thumb img{width:100%;aspect-ratio:1;object-fit:cover;display:block;background:#f3f4f6}
.sa-thumb .cap{padding:6px 8px;font-size:11px;color:var(--sa-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sa-modal{position:fixed;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;z-index:50}
.sa-modal .box{background:#fff;border-radius:10px;width:min(900px,92vw);max-height:86vh;overflow:auto;padding:20px}
.sa-login{--sa-bg:#fafafa;--sa-fg:#111;--sa-muted:#6b7280;--sa-line:#e5e7eb;--sa-accent:#111;--sa-danger:#b91c1c;--sa-ok:#15803d;min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--sa-bg);color:var(--sa-fg);font:14px/1.5 system-ui,sans-serif}
.sa-login h1,.sa-login p{color:inherit;font-family:inherit}
.sa-login form{background:#fff;border:1px solid var(--sa-line);border-radius:10px;padding:28px;width:360px}
.sa-login h1{margin:0 0 6px;font-size:18px}
.sa-login p{color:var(--sa-muted);margin:0 0 16px}
.sa-pager{display:flex;gap:8px;align-items:center;justify-content:flex-end;margin-top:12px;color:var(--sa-muted)}
.sa-image-field{display:flex;gap:12px;align-items:center}
.sa-image-field img{width:96px;height:96px;object-fit:cover;border-radius:6px;border:1px solid var(--sa-line);background:#f3f4f6}
.sa-empty{padding:40px;text-align:center;color:var(--sa-muted);background:#fff;border:1px dashed var(--sa-line);border-radius:8px}
@media (max-width:760px){.sa{grid-template-columns:1fr}.sa-side{flex-direction:row;flex-wrap:wrap;border-right:0;border-bottom:1px solid var(--sa-line)}.sa-side h1{width:100%}.sa-side .sa-user{margin-top:0}.sa-main{padding:16px}}
`
