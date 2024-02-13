class Documentation {
    docText = "";
    docWindowContainer = null;
    docWindow = null;
    previewButton = null;
    previewWindow = null;
    editorButton = null;
    editorWindow = null;
    closeButton = null;

    constructor() {
        this.createDocumentationWindow();
        this.switchToPreview(); // Default to 
        this.clearDocumentation();
    }

    createDocumentationWindow() {
        this.docWindowContainer = document.createElement("div");
        this.docWindowContainer.classList.add("documentation-container");

        this.docWindow = document.createElement("div");
        this.docWindow.classList.add("documentation");

        this.toolbar = document.createElement("div");
        this.toolbar.classList.add("documentation-toolbar");

        this.previewButton = document.createElement("div");
        this.previewButton.classList.add("preview-button");
        this.previewButton.innerHTML = '<img class="icon-0 preview-icon" src="assets/article.svg" alt="preview icon"><h2>preview</h2>';

        this.editorButton = document.createElement("div");
        this.editorButton.classList.add("editor-button");
        this.editorButton.innerHTML = '<img class="icon-0 editor-icon" src="assets/edit.svg" alt="editor icon"><h2>edit</h2>';
        
        this.closeButton = document.createElement("div");
        this.closeButton.innerHTML = '<img class="icon-0 close-icon close-button" src="assets/close.svg" alt="close icon">';

        this.toolbar.appendChild(this.previewButton);
        this.toolbar.appendChild(this.editorButton);
        this.toolbar.appendChild(this.closeButton);

        this.editorWindow = document.createElement("textarea");
        this.editorWindow.classList.add("editor");

        this.previewWindow = document.createElement("div");
        this.previewWindow.classList.add("preview");

        this.docWindow.appendChild(this.toolbar);
        this.docWindow.appendChild(this.editorWindow);
        this.docWindow.appendChild(this.previewWindow);

        this.docWindowContainer.appendChild(this.docWindow);
        document.body.insertBefore(this.docWindowContainer, document.body.firstChild);
    }

    deleteDocumentationWindow() {
        this.docWindowContainer.remove();
    }

    clearDocumentation() {
        this.docText = "";
        this.updateEditorWindow();
        this.updatePreviewWindow();
    }

    getDocumentation() {
        return this.docText;
    }

    updateDocumentation(newDoc) {
        this.docText = newDoc || "";
        this.updateEditorWindow();
        this.updatePreviewWindow();
    }

    updateEditorWindow() {
        this.editorWindow.value = this.docText;
    }

    updatePreviewWindow() {
        this.previewWindow.innerHTML = this.getParsedDocumentation();
    }

    getParsedDocumentation() {
        return DOMPurify.sanitize(marked.parse(this.docText));
    }

    setDocWindowOpen(mode) {
        if (mode) {
            this.docWindow.classList.add("active");
            this.updateDocumentation(this.docText);
            document.querySelector(".application-container").classList.add("as-background")
            return
        }
        this.docWindow.classList.remove("active");
        document.querySelector(".application-container").classList.remove("as-background")
    }

    switchToEditor() {
        this.previewWindow.classList.remove("active");
        this.editorWindow.classList.add("active");
        this.previewButton.classList.remove("active");
        this.editorButton.classList.add("active");
    }

    switchToPreview() {
        this.previewWindow.classList.add("active");
        this.editorWindow.classList.remove("active");
        this.previewButton.classList.add("active");
        this.editorButton.classList.remove("active");
    }

    addEventListeners() {
        this.editorWindow.addEventListener("change", () => {
            this.docText = this.editorWindow.value;
            this.updatePreviewWindow();
        });

        this.previewButton.addEventListener("click", () => {
            this.switchToPreview();
        });

        this.editorButton.addEventListener("click", () => {
            this.switchToEditor();
        });

        this.editorWindow.addEventListener("click", () => {
            this.switchToEditor();
        });

        this.closeButton.addEventListener("click", () => {
            this.setDocWindowOpen(false);
        });
    }
}