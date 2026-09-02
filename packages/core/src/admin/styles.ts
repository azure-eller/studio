/** Self-contained styles; the host site's Tailwind never sees this package. Prefix: sa- */
const TOKENS = '--sa-bg:#fafafa;--sa-fg:#111;--sa-muted:#6b7280;--sa-line:#e5e7eb;--sa-soft:#f3f4f6;--sa-accent:#111;--sa-danger:#b91c1c;--sa-ok:#15803d;--sa-warn:#b45309;--sa-r:8px'

export const ADMIN_CSS = `
.sa{${TOKENS};font:14px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:var(--sa-fg);background:var(--sa-bg);min-height:100vh;display:grid;grid-template-columns:230px 1fr}
.sa *{box-sizing:border-box}
.sa a{color:inherit}
.sa h1,.sa h2,.sa h3{font-weight:600;letter-spacing:-.01em}

/* shell */
.sa-side{border-right:1px solid var(--sa-line);background:#fff;padding:20px 14px;display:flex;flex-direction:column;gap:2px;position:sticky;top:0;height:100vh}
.sa-side h1{font-size:15px;margin:0 0 14px;padding:0 10px}
.sa-side a,.sa-side .sa-navbtn{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;border-radius:6px;text-decoration:none;color:var(--sa-fg);background:none;border:0;font:inherit;width:100%;text-align:left;cursor:pointer}
.sa-side a.on,.sa-side a:hover{background:var(--sa-soft)}
.sa-side .sa-foot{margin-top:auto;font-size:12px;color:var(--sa-muted);padding:8px 10px;display:flex;flex-direction:column;gap:6px}
.sa-side .sa-foot a{padding:0;display:inline}
.sa-side .sa-foot .site{color:var(--sa-fg);font-weight:500}
.sa-badge{min-width:20px;height:20px;padding:0 6px;border-radius:10px;background:var(--sa-accent);color:#fff;font-size:11px;font-weight:600;display:inline-flex;align-items:center;justify-content:center}
.sa-top{display:none}
.sa-side .sa-navclose{display:none}
.sa-main{padding:28px 32px;max-width:1120px;width:100%}
.sa-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px;flex-wrap:wrap}
.sa-head h2{margin:0;font-size:20px}
.sa-head .sub{color:var(--sa-muted);font-weight:400;font-size:14px;margin-left:8px}
.sa-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}

/* controls */
.sa-btn{appearance:none;border:1px solid var(--sa-line);background:#fff;color:var(--sa-fg);padding:7px 12px;border-radius:6px;cursor:pointer;font:inherit;text-decoration:none;display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
.sa-btn:hover{background:var(--sa-soft)}
.sa-btn.pri{background:var(--sa-accent);color:#fff;border-color:var(--sa-accent)}
.sa-btn.pri:hover{opacity:.9}
.sa-btn.danger{color:var(--sa-danger);border-color:#fecaca}
.sa-btn.danger:hover{background:#fef2f2}
.sa-btn.quiet{border-color:transparent;background:transparent;color:var(--sa-muted)}
.sa-btn.quiet:hover{color:var(--sa-fg);background:var(--sa-soft)}
.sa-btn:disabled{opacity:.5;cursor:default}
.sa-btn.sm{padding:3px 8px;font-size:12px}
.sa-input,.sa-textarea,.sa-select{width:100%;padding:8px 10px;border:1px solid var(--sa-line);border-radius:6px;font:inherit;background:#fff;color:var(--sa-fg)}
.sa-input:focus,.sa-textarea:focus,.sa-select:focus{outline:2px solid #c7d2fe;outline-offset:0;border-color:#a5b4fc}
.sa-textarea{min-height:110px;resize:vertical}
.sa-pill{display:inline-block;padding:1px 8px;border-radius:999px;font-size:12px;font-weight:500;background:var(--sa-soft);color:var(--sa-muted);white-space:nowrap}
.sa-pill.published,.sa-pill.paid{background:#dcfce7;color:var(--sa-ok)}
.sa-pill.scheduled,.sa-pill.pending{background:#fef3c7;color:var(--sa-warn)}
.sa-pill.refunded{background:#fee2e2;color:var(--sa-danger)}

/* tables */
.sa-table{width:100%;border-collapse:collapse;background:#fff;border:1px solid var(--sa-line);border-radius:var(--sa-r);overflow:hidden}
.sa-table th,.sa-table td{text-align:left;padding:10px 12px;border-bottom:1px solid var(--sa-line);vertical-align:top}
.sa-table th{font-weight:600;font-size:12px;color:var(--sa-muted);text-transform:uppercase;letter-spacing:.03em;cursor:pointer;user-select:none;white-space:nowrap}
.sa-table tr:last-child td{border-bottom:0}
.sa-table tr.row:hover td{background:#f9fafb;cursor:pointer}
.sa-table tr.unread td{font-weight:600}
.sa-table td.muted{color:var(--sa-muted);white-space:nowrap}
.sa-table td.main{max-width:520px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sa-scroll{overflow-x:auto;border-radius:var(--sa-r)}
.sa-pager{display:flex;gap:8px;align-items:center;justify-content:flex-end;margin-top:12px;color:var(--sa-muted)}
.sa-empty{padding:40px;text-align:center;color:var(--sa-muted);background:#fff;border:1px dashed var(--sa-line);border-radius:var(--sa-r)}
.sa-empty .sa-btn{margin-top:12px}

/* home */
.sa-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px}
.sa-card{background:#fff;border:1px solid var(--sa-line);border-radius:var(--sa-r);padding:16px 18px;display:flex;flex-direction:column;gap:10px;min-width:0}
.sa-card header{display:flex;align-items:center;justify-content:space-between;gap:8px}
.sa-card header h3{margin:0;font-size:15px}
.sa-card ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}
.sa-card li{display:flex;align-items:center;gap:10px;padding:8px 0;border-top:1px solid var(--sa-line);cursor:pointer;min-width:0}
.sa-card li:hover{color:var(--sa-accent)}
.sa-card li .t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sa-card li.unread .t{font-weight:600}
.sa-card li .d{color:var(--sa-muted);font-size:12px;white-space:nowrap}
.sa-card .thumbs{display:grid;grid-template-columns:repeat(6,1fr);gap:6px}
.sa-card .thumbs img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:4px;background:var(--sa-soft)}
.sa-card .none{color:var(--sa-muted);padding:6px 0}

/* forms */
.sa-field{margin-bottom:18px}
.sa-field label{display:block;font-weight:600;margin-bottom:6px}
.sa-field .help{color:var(--sa-muted);font-size:12px;margin-top:4px}
.sa-field .err{color:var(--sa-danger);font-size:12px;margin-top:4px}
.sa-form{background:#fff;border:1px solid var(--sa-line);border-radius:var(--sa-r);padding:24px;max-width:780px}
.sa-form .sa-actions{margin-top:8px}
.sa-form .sa-adv{margin:4px 0 18px;color:var(--sa-muted)}
.sa-form .sa-adv summary{cursor:pointer;font-size:13px;user-select:none}
.sa-form .sa-adv[open] summary{margin-bottom:12px}
.sa-publish{border-top:1px solid var(--sa-line);margin-top:8px;padding-top:16px;display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.sa-publish .state{color:var(--sa-muted);margin-left:auto;font-size:13px}
.sa-publish .when{flex-basis:100%;max-width:320px}
.sa-msg{padding:10px 12px;border-radius:6px;margin-bottom:16px;background:var(--sa-soft)}
.sa-msg.err{background:#fef2f2;color:var(--sa-danger)}
.sa-msg.ok{background:#f0fdf4;color:var(--sa-ok)}

/* message view */
.sa-message{background:#fff;border:1px solid var(--sa-line);border-radius:var(--sa-r);max-width:780px}
.sa-message .from{padding:16px 24px;border-bottom:1px solid var(--sa-line);display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
.sa-message .from .who{font-weight:600}
.sa-message .from .who a{font-weight:400;color:var(--sa-muted);text-decoration:none;margin-left:6px}
.sa-message .from .meta{color:var(--sa-muted);font-size:13px}
.sa-message dl{margin:0;padding:8px 24px 20px;display:grid;grid-template-columns:140px 1fr;gap:10px 16px}
.sa-message dt{color:var(--sa-muted);font-size:12px;text-transform:uppercase;letter-spacing:.03em;padding-top:2px}
.sa-message dd{margin:0;white-space:pre-wrap;overflow-wrap:anywhere}
.sa-message dd.body{font-size:15px;line-height:1.6}

/* rich text */
.sa-toolbar{display:flex;flex-wrap:wrap;gap:2px;border:1px solid var(--sa-line);border-bottom:0;border-radius:6px 6px 0 0;padding:6px;background:#f9fafb;align-items:center}
.sa-toolbar button{border:1px solid transparent;background:transparent;padding:4px 8px;border-radius:4px;cursor:pointer;font:inherit;font-size:13px;color:var(--sa-fg)}
.sa-toolbar button.on,.sa-toolbar button:hover{background:#fff;border-color:var(--sa-line)}
.sa-toolbar button.b{font-weight:700}
.sa-toolbar button.i{font-style:italic}
.sa-toolbar .sep{width:1px;height:18px;background:var(--sa-line);margin:0 4px}
.sa-linkbar{display:flex;gap:6px;padding:6px;border:1px solid var(--sa-line);border-bottom:0;background:#fff;align-items:center}
.sa-linkbar .sa-input{flex:1}
.sa-editor{border:1px solid var(--sa-line);border-radius:0 0 6px 6px;background:#fff;padding:12px 14px;min-height:240px;position:relative}
.sa-editor .tiptap{min-height:220px}
.sa-editor .tiptap:focus{outline:none}
.sa-editor .tiptap p{margin:0 0 .75em}
.sa-editor .tiptap h2{font-size:1.4em;margin:.8em 0 .4em}
.sa-editor .tiptap h3{font-size:1.15em;margin:.8em 0 .4em}
.sa-editor .tiptap img{max-width:100%;height:auto;display:block;border-radius:4px}
.sa-editor .tiptap a{color:#1d4ed8}
.sa-editor .tiptap blockquote{border-left:3px solid var(--sa-line);margin:0;padding-left:12px;color:var(--sa-muted)}
.sa-editor .count{position:absolute;right:10px;bottom:6px;font-size:11px;color:var(--sa-muted)}

/* photos */
.sa-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px}
.sa-thumb{border:1px solid var(--sa-line);border-radius:6px;background:#fff;overflow:hidden;cursor:pointer;text-align:left;padding:0;font:inherit;color:inherit}
.sa-thumb.on{outline:2px solid var(--sa-accent)}
.sa-thumb img{width:100%;aspect-ratio:1;object-fit:cover;display:block;background:var(--sa-soft)}
.sa-thumb .cap{padding:6px 8px;font-size:11px;color:var(--sa-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sa-drop{border-radius:var(--sa-r);transition:box-shadow .1s}
.sa-drop.over{box-shadow:0 0 0 3px #c7d2fe}
.sa-tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px}
.sa-tile{background:#fff;border:1px solid var(--sa-line);border-radius:var(--sa-r);overflow:hidden;display:flex;flex-direction:column}
.sa-tile.warn{border-color:#fcd34d}
.sa-tile .pic{display:block;width:100%;aspect-ratio:4/3;object-fit:cover;background:var(--sa-soft);cursor:pointer;border:0;padding:0}
.sa-tile .pic.doc{display:flex;align-items:center;justify-content:center;font-size:32px}
.sa-tile .body{padding:8px 10px 10px;display:flex;flex-direction:column;gap:6px}
.sa-tile .name{font-size:12px;color:var(--sa-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;justify-content:space-between;gap:6px}
.sa-tile .alt{width:100%;border:1px solid transparent;background:var(--sa-soft);border-radius:6px;padding:6px 8px;font:inherit;font-size:13px;color:var(--sa-fg)}
.sa-tile .alt:focus{outline:none;border-color:#a5b4fc;background:#fff}
.sa-tile.warn .alt::placeholder{color:var(--sa-warn)}
.sa-tile .saved{font-size:11px;color:var(--sa-ok);height:14px}
.sa-upload-note{margin-bottom:14px;padding:10px 12px;border-radius:6px;background:#fffbeb;color:var(--sa-warn);border:1px solid #fde68a}

/* modal + picker */
.sa-modal{position:fixed;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;z-index:50;padding:16px}
.sa-modal .box{background:#fff;border-radius:10px;width:min(900px,100%);max-height:86vh;overflow:auto;padding:20px}
.sa-modal .sa-head{margin-bottom:12px}
.sa-picker-up{display:flex;gap:8px;align-items:center;margin-bottom:14px;flex-wrap:wrap}
.sa-picker-up .sa-input{max-width:360px}

/* misc */
.sa-image-field{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
.sa-image-field img{width:96px;height:96px;object-fit:cover;border-radius:6px;border:1px solid var(--sa-line);background:var(--sa-soft)}
.sa-toasts{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);display:flex;flex-direction:column;gap:8px;z-index:60;pointer-events:none}
.sa-toast{pointer-events:auto;background:#111;color:#fff;padding:10px 14px;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.18);display:flex;gap:14px;align-items:center;font-size:14px;max-width:min(560px,92vw)}
.sa-toast.err{background:var(--sa-danger)}
.sa-toast a,.sa-toast button{color:#fff;font:inherit;background:none;border:0;padding:0;cursor:pointer;text-decoration:underline;white-space:nowrap}

/* login */
.sa-login{${TOKENS};min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--sa-bg);color:var(--sa-fg);font:14px/1.5 system-ui,sans-serif;padding:16px}
.sa-login h1,.sa-login p{color:inherit;font-family:inherit}
.sa-login form{background:#fff;border:1px solid var(--sa-line);border-radius:10px;padding:28px;width:360px;max-width:100%}
.sa-login h1{margin:0 0 6px;font-size:18px}
.sa-login p{color:var(--sa-muted);margin:0 0 16px}

@media (max-width:760px){
  .sa{grid-template-columns:1fr}
  .sa-side{display:none}
  .sa-side.open{display:flex;position:fixed;inset:0;z-index:40;height:auto}
  .sa-side.open .sa-navclose{display:inline-flex;position:absolute;top:14px;right:14px;width:auto}
  .sa-top{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#fff;border-bottom:1px solid var(--sa-line);position:sticky;top:0;z-index:30}
  .sa-top strong{font-size:15px}
  .sa-main{padding:16px}
  .sa-form{padding:16px}
  .sa-message dl{grid-template-columns:1fr;gap:2px 0}
  .sa-message dt{margin-top:10px}
  .sa-card .thumbs{grid-template-columns:repeat(4,1fr)}
  .sa-table td.main{max-width:220px}
}
`
