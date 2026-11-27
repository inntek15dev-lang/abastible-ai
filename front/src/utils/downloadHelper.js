import api from '../api';

/**
 * Fetches a protected report/file using Axios (Authorization: Bearer header)
 * and opens or downloads it via an in-memory Blob URL (no ?token= in URL).
 */
export async function openAuthenticatedBlob(endpoint, { downloadName = null, mimeType = null } = {}) {
    const response = await api.get(endpoint, { responseType: 'blob' });
    const contentType = mimeType || response.headers?.['content-type'] || 'application/octet-stream';
    const blob = new Blob([response.data], { type: contentType });
    const blobUrl = URL.createObjectURL(blob);

    if (downloadName) {
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = downloadName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
        return;
    }

    const win = window.open(blobUrl, '_blank', 'noopener,noreferrer');
    if (!win) {
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = 'documento';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
}

