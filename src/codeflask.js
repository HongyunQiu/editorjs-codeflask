
 /**
  * EditorJsCodeFlask Block for the Editor.js.
  *
  * @author Calum Knott (calum@calumk.com)
  * @license The MIT License (MIT)
  */
 
 /**
  * @typedef {object} EditorJsCodeFlaskConfig
  * @property {string} placeholder - placeholder for the empty EditorJsCodeFlask
  * @property {boolean} preserveBlank - Whether or not to keep blank EditorJsCodeFlasks when saving editor data
  */
 
 /**
  * @typedef {Object} EditorJsCodeFlaskData
  * @description Tool's input and output data format
  * @property {String} text — EditorJsCodeFlask's content. Can include HTML tags: <a><b><i>
  */

  import style from './codeflask.css'
  import icon from './codeflask.svg';

  import Prism from 'prismjs';
  import MarkdownIt from 'markdown-it';
  import { IconClipboard } from '@codexteam/icons';

  // import "prismjs-components-importer/esm"; // ALL - Massivly Increases Bundle size!

  import "prismjs-components-importer/esm/prism-iecst"; // Structured Text
  import "prismjs-components-importer/esm/prism-markdown"; 
  import "prismjs-components-importer/esm/prism-json"; 
  import "prismjs-components-importer/esm/prism-python";
  import "prismjs-components-importer/esm/prism-bash";
 

  import CodeFlask from 'codeflask';

  const ICON_CHECK = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 6L9 17l-5-5"/></svg>';
  const MARKDOWN_VIEW_LANGUAGE = 'markdown-view';

  const escapeHtml = (value) => {
    return String(value === undefined || value === null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const markdownRenderer = new MarkdownIt({
    html: false,
    linkify: true,
    breaks: true,
    highlight: (str, lang) => {
      const normalizedLang = typeof lang === 'string' ? lang.trim().toLowerCase() : '';

      if (normalizedLang && Prism.languages && Prism.languages[normalizedLang]) {
        try {
          const highlighted = Prism.highlight(str, Prism.languages[normalizedLang], normalizedLang);
          return `<pre class="editorjs-codeFlask_MarkdownCode language-${normalizedLang}"><code class="language-${normalizedLang}">${highlighted}</code></pre>`;
        } catch (_) {}
      }

      return `<pre class="editorjs-codeFlask_MarkdownCode"><code>${escapeHtml(str)}</code></pre>`;
    }
  });





  // console.log(Prism.languages)


 
 class EditorJsCodeFlask {
   /**
    * Default placeholder for EditorJsCodeFlask Tool
    *
    * @return {string}
    * @constructor
    */
   static get DEFAULT_PLACEHOLDER() {
     return '// Hello';
   }

   static get enableLineBreaks() {
    return true;
  }
 
   /**
    * Render plugin`s main Element and fill it with saved data
    *
    * @param {object} params - constructor params
    * @param {EditorJsCodeFlaskData} params.data - previously saved data
    * @param {EditorJsCodeFlaskConfig} params.config - user config for Tool
    * @param {object} params.api - editor.js api
    * @param {boolean} readOnly - read only mode flag
    */
   constructor({data, config, api, readOnly}) {
    //  console.log(data)
     this.api = api;
     this.readOnly = readOnly;

     // Language chooser UI (仅编辑模式使用)
     this._langBtn = null;
     this._copyBtn = null;
     this._topRightControlsEl = null;
     this._copyHighlightTimer = null;
     this._langChooserEl = null;
     this._langChooserSearchEl = null;
     this._langChooserListEl = null;
     this._removeLangChooserListeners = null;
     this._availableLanguages = null;
     this._editorHostEl = null;
     this._markdownPreviewEl = null;
     this._resizeEditorHeightDebounced = this._debounce((length) => this._updateEditorHeight(length));
 
     this._CSS = {
       block: this.api.styles.block,
       wrapper: 'ce-EditorJsCodeFlask',
       settingsButton: this.api.styles.settingsButton,
       settingsButtonActive: this.api.styles.settingsButtonActive,
     };
 
     if (!this.readOnly) {
       this.onKeyUp = this.onKeyUp.bind(this);
     }
 
     /**
      * Placeholder for EditorJsCodeFlask if it is first Block
      * @type {string}
      */
     this._placeholder = config.placeholder ? config.placeholder : EditorJsCodeFlask.DEFAULT_PLACEHOLDER;

     this._preserveBlank = config.preserveBlank !== undefined ? config.preserveBlank : false;

     this._element; // used to hold the wrapper div, as a point of reference

 

     // let x = (x === undefined) ? your_default_value : x;
     this.data = {}
     this.data.code = (data.code === undefined) ? '' : data.code;
     this.data.language = (data.language === undefined) ? 'plain' : data.language;
     this.data.showlinenumbers = (data.showlinenumbers === undefined) ? true : data.showlinenumbers;
     this.data.editorInstance = {}

    //  console.log(this.data)

   }
 
   /**
    * Check if text content is empty and set empty string to inner html.
    * We need this because some browsers (e.g. Safari) insert <br> into empty contenteditanle elements
    *
    * @param {KeyboardEvent} e - key up event
    */
   onKeyUp(e) {
     if (e.code !== 'Backspace' && e.code !== 'Delete') {
       return;
     }
 
     const {textContent} = this._element;
 
     if (textContent === '') {
       this._element.innerHTML = '';
     }
   }

 
   /**
    * Return Tool's view
    *
    * @returns {HTMLDivElement}
    */
   render() {

    this._element = document.createElement('div');
    this._element.classList.add('editorjs-codeFlask_Wrapper')
    let editorElem = document.createElement('div');
    editorElem.classList.add('editorjs-codeFlask_Editor')
    this._editorHostEl = editorElem;
    this._element.appendChild(editorElem)

    let markdownPreviewElem = document.createElement('div');
    markdownPreviewElem.classList.add('editorjs-codeFlask_MarkdownPreview');
    this._markdownPreviewEl = markdownPreviewElem;
    this._element.appendChild(markdownPreviewElem)

   // 编辑模式：右上角显示语言选择 + COPY
   // 只读模式：右上角只显示 COPY（仍可复制）
   if (!this.readOnly) {
     this._element.appendChild(this._buildLangChooser());
     this._installLangChooserCloseHandlers();
   }
   this._element.appendChild(this._buildTopRightControls({ showLang: !this.readOnly }));

    this.data.editorInstance = new CodeFlask(editorElem, { 
      language: this._isMarkdownViewMode() ? 'markdown' : this.data.language, 
      lineNumbers : this.data.showlinenumbers,
      readonly : this.readOnly,
      // 由宿主（QNotes）CSS 变量控制主题；避免 CodeFlask 注入默认浅色 token 主题
      defaultTheme: false
    });

    this.data.editorInstance.onUpdate((code) => {
      this.data.code = code;
      this._refreshMarkdownPreview();

      let _length = code.split('\n').length
      this._resizeEditorHeightDebounced(_length)

    });

    try {
      if (Prism.languages && Prism.languages[this.data.language]) {
        this.data.editorInstance.addLanguage(this.data.language, Prism.languages[this.data.language]);
      }
    } catch (_) {}
    this.data.editorInstance.updateCode(this.data.code);
    this._applyDisplayMode();

    return this._element
   }

  _updateEditorHeight(length){

    // 语言按钮为覆盖层，不应占用额外高度
    let _height;
    if (this._isMarkdownViewMode() && this._markdownPreviewEl) {
      _height = this._markdownPreviewEl.scrollHeight + 12;
    } else {
      _height = (length * 21) + 10
    }
    if (_height < 60){ _height = 60 }

    this._element.style.height = _height + 'px';
  }


  _debounce(func, timeout = 500){
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
  }

   renderSettings() {
    const settingsContainer = document.createElement('div');
    // 需求：Language 不在工具 settings 里展示
    return settingsContainer;
  }

  _toggleLineNumbers = (thing) => {
    this.data.showlinenumbers = !this.data.showlinenumbers

    // replace this with a native method for codeflask, if it gets implemented.
    // for now, we will completely destroy the codeflask instance, and rebuild it - lazy but effective


  }

  _updateLanguage = (lang) => {
    this.data.language = lang

    if (this._langBtn) {
      this._langBtn.textContent = this.data.language;
      this._langBtn.title = `Language: ${this.data.language}`;
    }

    // codeflask 的语法高亮依赖 Prism 的 grammar；切换时补充注册
    try {
      if (Prism.languages && Prism.languages[this.data.language]) {
        this.data.editorInstance.addLanguage(this.data.language, Prism.languages[this.data.language]);
      }
    } catch (_) {}

    if (!this._isMarkdownViewMode()) {
      this.data.editorInstance.updateLanguage(this.data.language)
    }

    this._applyDisplayMode();
  }

  _getAvailableLanguages = () => {
    if (this._availableLanguages) return this._availableLanguages;

    const ignore = new Set(["extend", "insertBefore", "DFS"]);
    const raw = Object.keys(Prism.languages || {})
      .filter((k) => !ignore.has(k))
      // Prism.languages 里会混入少量非 grammar 值，这里尽量过滤掉
      .filter((k) => {
        const v = Prism.languages[k];
        if (!v) return false;
        if (typeof v === "object") return true;
        // 少数情况下 grammar 可能被导出成 function（兼容处理）
        if (typeof v === "function") return true;
        return false;
      });

    raw.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    raw.unshift(MARKDOWN_VIEW_LANGUAGE);
    this._availableLanguages = raw;
    return this._availableLanguages;
  }

  _isMarkdownViewMode = () => {
    return this.data.language === MARKDOWN_VIEW_LANGUAGE;
  }

  _looksLikeMarkdown = (code) => {
    const text = String(code === undefined || code === null ? '' : code);

    if (!text.trim()) return true;

    const markers = [
      /^\s{0,3}#{1,6}\s+/m,
      /^\s*([-*+])\s+/m,
      /^\s*\d+\.\s+/m,
      /^\s*>\s+/m,
      /```[\s\S]*```/m,
      /`[^`\n]+`/,
      /\[[^\]]+\]\([^)]+\)/,
      /!\[[^\]]*\]\([^)]+\)/,
      /^\s*\|.+\|\s*$/m,
      /^\s*([-*_]\s*){3,}$/m
    ];

    return markers.some((pattern) => pattern.test(text));
  }

  _refreshMarkdownPreview = () => {
    if (!this._markdownPreviewEl) return;

    const code = (this.data && this.data.editorInstance && typeof this.data.editorInstance.getCode === 'function')
      ? this.data.editorInstance.getCode()
      : this.data.code;

    if (!code || !String(code).trim()) {
      this._markdownPreviewEl.innerHTML = '<div class="editorjs-codeFlask_MarkdownEmpty">Markdown preview is empty.</div>';
      return;
    }

    if (!this._looksLikeMarkdown(code)) {
      this._markdownPreviewEl.innerHTML = `
        <div class="editorjs-codeFlask_MarkdownNotice">
          Current content does not look like Markdown. Showing plain text fallback instead.
        </div>
        <pre class="editorjs-codeFlask_MarkdownFallback"><code>${escapeHtml(code)}</code></pre>
      `;
      return;
    }

    this._markdownPreviewEl.innerHTML = markdownRenderer.render(code);
  }

  _applyDisplayMode = () => {
    this._refreshMarkdownPreview();

    const isMarkdownView = this._isMarkdownViewMode();
    if (this._element) {
      this._element.classList.toggle('editorjs-codeFlask_Wrapper--markdown-view', isMarkdownView);
    }
    if (this._editorHostEl) {
      this._editorHostEl.style.display = isMarkdownView ? 'none' : '';
    }
    if (this._markdownPreviewEl) {
      this._markdownPreviewEl.style.display = isMarkdownView ? 'block' : 'none';
    }

    const lineCount = String(this.data.code || '').split('\n').length;
    this._updateEditorHeight(lineCount);
  }

  _buildLangButton = () => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.classList.add('editorjs-codeFlask_LangBtn');
    btn.textContent = this.data.language;
    btn.title = `Language: ${this.data.language}`;

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this._toggleLangChooser();
    });

    this._langBtn = btn;
    return btn;
  }

  _buildCopyButton = () => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.classList.add('editorjs-codeFlask_CopyBtn');
    btn.innerHTML = IconClipboard;
    btn.title = '复制代码';
    btn.setAttribute('aria-label', '复制代码');

    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await this._copyToClipboard(btn);
    });

    this._copyBtn = btn;
    return btn;
  }

  _buildTopRightControls = ({ showLang = true } = {}) => {
    const wrap = document.createElement('div');
    wrap.classList.add('editorjs-codeFlask_TopRightControls');
    if (showLang) wrap.appendChild(this._buildLangButton());
    wrap.appendChild(this._buildCopyButton());
    this._topRightControlsEl = wrap;
    return wrap;
  }

  _copyToClipboard = async (btnEl) => {
    const code = (this.data && this.data.editorInstance && typeof this.data.editorInstance.getCode === 'function')
      ? this.data.editorInstance.getCode()
      : (this.data && this.data.code ? this.data.code : '');

    const ok = await this._writeClipboardText(code);
    this._flashCopyResult(btnEl, ok);
  }

  _writeClipboardText = async (text) => {
    const t = (text === undefined || text === null) ? '' : String(text);

    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(t);
        return true;
      }
    } catch (_) {}

    // fallback: execCommand('copy')
    try {
      const ta = document.createElement('textarea');
      ta.value = t;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      ta.style.left = '-1000px';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      const ok = document.execCommand && document.execCommand('copy');
      document.body.removeChild(ta);
      return !!ok;
    } catch (_) {
      return false;
    }
  }

  _flashCopyResult = (btnEl, ok) => {
    if (!btnEl) return;
    const original = btnEl.innerHTML;
    btnEl.innerHTML = ok ? ICON_CHECK : IconClipboard;
    btnEl.setAttribute('data-copy-state', ok ? 'copied' : 'failed');

    if (ok) {
      this._flashCopyHighlight();
    }

    window.clearTimeout(btnEl.__qnotesCopyTimer);
    btnEl.__qnotesCopyTimer = window.setTimeout(() => {
      btnEl.innerHTML = original || IconClipboard;
      btnEl.removeAttribute('data-copy-state');
    }, 1200);
  }

  _flashCopyHighlight = () => {
    if (!this._element) return;

    if (this._copyHighlightTimer) {
      try { window.clearTimeout(this._copyHighlightTimer); } catch (_) {}
      this._copyHighlightTimer = null;
    }

    const cls = 'editorjs-codeFlask_Wrapper--copy-highlight';
    this._element.classList.remove(cls);

    window.requestAnimationFrame(() => {
      this._element.classList.add(cls);
      this._copyHighlightTimer = window.setTimeout(() => {
        if (this._element) this._element.classList.remove(cls);
        this._copyHighlightTimer = null;
      }, 1500);
    });
  }

  _buildLangChooser = () => {
    const chooser = document.createElement('div');
    chooser.classList.add('editorjs-codeFlask_Chooser');

    const searchWrap = document.createElement('div');
    searchWrap.classList.add('editorjs-codeFlask_ChooserSearchWrap');
    const search = document.createElement('input');
    search.type = 'text';
    search.classList.add('editorjs-codeFlask_ChooserSearch');
    search.placeholder = '搜索语言...';
    search.addEventListener('input', () => this._renderLangChooserList());
    searchWrap.appendChild(search);

    const list = document.createElement('div');
    list.classList.add('editorjs-codeFlask_ChooserList');
    chooser.appendChild(searchWrap);
    chooser.appendChild(list);

    this._langChooserEl = chooser;
    this._langChooserSearchEl = search;
    this._langChooserListEl = list;

    // 初次渲染
    this._renderLangChooserList();

    return chooser;
  }

  _renderLangChooserList = () => {
    if (!this._langChooserListEl) return;
    const q = (this._langChooserSearchEl && this._langChooserSearchEl.value ? this._langChooserSearchEl.value : '').trim().toLowerCase();
    const langs = this._getAvailableLanguages();
    const selected = this.data.language;

    this._langChooserListEl.innerHTML = '';

    const makeItem = (lang) => {
      const item = document.createElement('div');
      item.classList.add('editorjs-codeFlask_ChooserItem');
      item.textContent = lang;
      if (lang === selected) item.classList.add('is-selected');
      item.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this._updateLanguage(lang);
        this._closeLangChooser();
      });
      return item;
    };

    let count = 0;
    for (let i = 0; i < langs.length; i++) {
      const lang = langs[i];
      if (q && !lang.toLowerCase().includes(q)) continue;
      this._langChooserListEl.appendChild(makeItem(lang));
      count++;
    }

    if (count === 0) {
      const empty = document.createElement('div');
      empty.classList.add('editorjs-codeFlask_ChooserEmpty');
      empty.textContent = '无匹配语言';
      this._langChooserListEl.appendChild(empty);
    }
  }

  _toggleLangChooser = () => {
    if (!this._langChooserEl || !this._langBtn) return;
    const isOpen = this._langChooserEl.classList.contains('is-open');
    if (isOpen) {
      this._closeLangChooser();
      return;
    }

    // 定位到按钮下方
    try {
      const btnRect = this._langBtn.getBoundingClientRect();
      const wrapRect = this._element.getBoundingClientRect();
      const top = Math.max(0, Math.round(btnRect.bottom - wrapRect.top + 6));
      this._langChooserEl.style.top = `${top}px`;
    } catch (_) {
      this._langChooserEl.style.top = '';
    }

    this._langChooserEl.classList.add('is-open');
    if (this._langChooserSearchEl) {
      this._langChooserSearchEl.value = '';
      this._renderLangChooserList();
      // 聚焦以便立刻输入搜索
      try { this._langChooserSearchEl.focus(); } catch (_) {}
    }
  }

  _closeLangChooser = () => {
    if (!this._langChooserEl) return;
    this._langChooserEl.classList.remove('is-open');
  }

  _installLangChooserCloseHandlers = () => {
    if (this._removeLangChooserListeners) {
      this._removeLangChooserListeners();
      this._removeLangChooserListeners = null;
    }

    const onDocPointerDown = (e) => {
      if (!this._langChooserEl || !this._langBtn) return;
      if (!this._langChooserEl.classList.contains('is-open')) return;

      const t = e.target;
      if (!t) return;

      // 点击弹层内/按钮上：不关闭
      if (this._langChooserEl.contains(t)) return;
      if (this._langBtn.contains(t)) return;

      // 点击块内/块外其他区域：关闭
      this._closeLangChooser();
    };

    document.addEventListener('pointerdown', onDocPointerDown);
    this._removeLangChooserListeners = () => {
      document.removeEventListener('pointerdown', onDocPointerDown);
    };
  }
 

 
   /**
    * Extract Tool's data from the view
    * @param {HTMLDivElement} toolsContent - EditorJsCodeFlask tools rendered view
    * @returns {EditorJsCodeFlaskData} - saved data
    * @public
    */
   save(toolsContent) {
    let resp = {
      code : this.data.editorInstance.getCode(),
      language : this.data.language,
      showlinenumbers : this.data.showlinenumbers
    };
    
    return resp
   }
 
   /**
    * Paste configuration for Editor.js
    * 参考 editorjs-codemirror：允许从 <pre> 代码块粘贴生成本工具
    *
    * @returns {{tags: string[]}}
    */
   static get pasteConfig() {
     return {
       tags: ['PRE', 'pre']
     };
   }
 
   /**
    * On paste callback that is fired from Editor.js
    * 行为参考 editorjs-codemirror：从粘贴的 <pre> 元素取纯文本内容
    *
    * @param {Object} event - PasteEvent from Editor.js
    */
   onPaste(event) {
     const content = event.detail && event.detail.data;
 
     if (!content) {
       return;
     }
 
     const text = content.textContent || '';
 
     this.data.code = text;
 
     // 如果已经渲染过实例，则同步更新编辑器里的代码
     if (this.data.editorInstance && typeof this.data.editorInstance.updateCode === 'function') {
      this.data.editorInstance.updateCode(this.data.code);
    }
    this._refreshMarkdownPreview();
  }
 
   /**
    * Returns true to notify the core that read-only mode is supported
    *
    * @return {boolean}
    */
   static get isReadOnlySupported() {
     return true;
   }

 
   /**
    * Icon and title for displaying at the Toolbox
    *
    * @return {{icon: string, title: string}}
    */
   static get toolbox() {
     return {
       icon: icon,
       title: 'CodeFlask'
     };
   }

   destroy() {
    if (this._copyBtn && this._copyBtn.__qnotesCopyTimer) {
      try { window.clearTimeout(this._copyBtn.__qnotesCopyTimer); } catch (_) {}
      this._copyBtn.__qnotesCopyTimer = null;
    }
    if (this._copyHighlightTimer) {
      try { window.clearTimeout(this._copyHighlightTimer); } catch (_) {}
      this._copyHighlightTimer = null;
    }
     if (this._removeLangChooserListeners) {
       this._removeLangChooserListeners();
       this._removeLangChooserListeners = null;
     }
   }
 }
 
export { EditorJsCodeFlask as default }
