// Multilingual Translations Module
export const translations = {
    en: {
        title: "Screen Print Filter",
        upload: "Upload Image",
        processing: "Processing...",
        download: "Download",
        reset: "Reset",
        undo: "Undo",
        redo: "Redo"
    },
    zh: {
        title: "丝网印刷滤镜",
        upload: "上传图片",
        processing: "处理中...",
        download: "下载",
        reset: "重置",
        undo: "撤销",
        redo: "重做"
    },
    ja: {
        title: "スクリーン印刷フィルター",
        upload: "画像をアップロード",
        processing: "処理中...",
        download: "ダウンロード",
        reset: "リセット",
        undo: "元に戻す",
        redo: "やり直し"
    },
    de: {
        title: "Siebdruck-Filter",
        upload: "Bild hochladen",
        processing: "Verarbeitung...",
        download: "Herunterladen",
        reset: "Zurücksetzen",
        undo: "Rückgängig",
        redo: "Wiederholen"
    },
    es: {
        title: "Filtro de Impresión",
        upload: "Subir Imagen",
        processing: "Procesando...",
        download: "Descargar",
        reset: "Restablecer",
        undo: "Deshacer",
        redo: "Rehacer"
    },
    fr: {
        title: "Filtre d'Impression",
        upload: "Télécharger Image",
        processing: "Traitement...",
        download: "Télécharger",
        reset: "Réinitialiser",
        undo: "Annuler",
        redo: "Rétablir"
    },
    pt: {
        title: "Filtro de Impressão",
        upload: "Carregar Imagem",
        processing: "Processando...",
        download: "Baixar",
        reset: "Redefinir",
        undo: "Desfazer",
        redo: "Refazer"
    }
};

export function t(key, lang = 'en') {
    const keys = key.split('.');
    let value = translations[lang];
    for (const k of keys) {
        value = value?.[k];
    }
    return value || key;
}
