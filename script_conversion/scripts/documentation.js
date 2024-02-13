class Documentation {
    constructor(docText) {
        this.docText = docText;
        this.docWindow = document.querySelector(".documentation");
        this.previewButton = document.querySelector(".preview-icon");
        this.previewWindow = document.querySelector(".preview");
        this.editorButton = document.querySelector(".editor-icon");
        this.editorWindow = document.querySelector(".editor");
        this.closeButton = document.querySelector(".close-icon");
        this.addEventListeners();
        this.switchToPreview(); // Default to preview
    }

    getDocumentation() {
        return this.docText;
    }

    updateDocumentation(newDoc) {
        this.docText = newDoc;
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
        return marked.parse(this.docText);
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

        this.docWindow.querySelector(".editor").addEventListener("click", () => {
            this.switchToEditor();
        });

        this.closeButton.addEventListener("click", () => {
            this.setDocWindowOpen(false);
        });
    }
}