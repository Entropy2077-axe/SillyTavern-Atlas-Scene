import { API, unpack } from './atlas.js';
import { abortScope } from './compat.js';
export function imageModels(data) {
    if (!Array.isArray(data)) throw new Error('模型目录格式不正确');
    return [...new Map(data.filter(m => m.type === 'Image' && m.categories?.includes('TEXT-TO-IMAGE') && m.model)
        .map(m => [m.model, { id: m.model, name: m.displayName || m.model }])).values()]
        .sort((a, b) => a.id.localeCompare(b.id));
}
export async function fetchModels(fetcher = fetch) {
    const scope = abortScope(null, 60000);
    try {
        const response = await fetcher(`${API}/api/v1/models`, { signal: scope.signal, credentials: 'omit' });
        if (!response.ok) throw new Error(`模型目录 HTTP ${response.status}`);
        const models = imageModels(unpack(await response.json()));
        if (!models.length) throw new Error('目录没有返回文生图模型');
        return models;
    } finally { scope.dispose(); }
}
export function generationBody(options, prompt) {
    const body = { model: options.model, prompt };
    // Other Atlas models have different parameter schemas; use their server defaults.
    if (options.model === 'z-image/turbo') Object.assign(body, {
        size: options.size, seed: -1, prompt_extend: false, enable_base64_output: true, enable_sync_mode: false,
    });
    return body;
}
