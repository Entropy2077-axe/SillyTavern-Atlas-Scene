import { abortScope, checkAborted } from './compat.js';
export const API = 'https://api.atlascloud.ai';
export function unpack(body) {
    if (body.code != null && ![0, 200].includes(Number(body.code))) throw new Error(`Atlas API 错误 (${body.code})`);
    return body.data ?? body;
}
export async function request(path, key, { body, signal, fetcher = fetch } = {}) {
    if (!key?.trim()) throw new Error('请先填写 Atlas API Key');
    const scope = abortScope(signal, 60000);
    try {
        checkAborted(scope.signal);
        const response = await fetcher(API + path, {
            method: body ? 'POST' : 'GET',
            headers: { Authorization: `Bearer ${key.trim()}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
            body: body ? JSON.stringify(body) : undefined,
            signal: scope.signal,
            credentials: 'omit',
        });
        if (!response.ok) throw new Error(`Atlas HTTP ${response.status}${response.status === 401 ? '：Key 无效' : response.status === 402 ? '：余额不足' : ''}`);
        return unpack(await response.json());
    } catch (error) {
        if (scope.signal.aborted) throw scope.reason();
        throw error;
    } finally { scope.dispose(); }
}
export function imageOutput(data) {
    const value = data.outputs?.[0];
    if (typeof value !== 'string' || !value) throw new Error('Atlas 完成任务但未返回图片');
    if (/^https:\/\//i.test(value) || /^data:image\/(png|jpeg|webp);base64,/i.test(value)) return value;
    if (/^[A-Za-z0-9+/=\r\n]+$/.test(value)) {
        const clean = value.replace(/[\r\n]/g, '');
        const format = clean.startsWith('/9j/') ? 'jpeg' : clean.startsWith('UklGR') ? 'webp' : 'png';
        return `data:image/${format};base64,${clean}`;
    }
    throw new Error('Atlas 返回了不支持的图片格式');
}
export async function generate(key, body, { signal, onStatus = () => {}, fetcher = fetch, interval = 1800, timeout = 180000 } = {}) {
    const scope = abortScope(signal, timeout);
    const boundedSignal = scope.signal;
    try {
        let data = await request('/api/v1/model/generateImage', key, { body, signal: boundedSignal, fetcher });
        const id = data.id ?? data.prediction_id;
        while (true) {
            checkAborted(boundedSignal);
            const status = String(data.status ?? '').toLowerCase();
            onStatus(status);
            if (['failed', 'canceled', 'cancelled'].includes(status)) throw new Error(`Atlas 绘图失败 (${status})`);
            if (['completed', 'succeeded'].includes(status) || (!status && data.outputs?.length)) return { image: imageOutput(data), id };
            if (!id) throw new Error('Atlas 未返回任务 ID');
            await new Promise((resolve, reject) => {
                const abort = () => { clearTimeout(timer); reject(scope.reason()); };
                const timer = setTimeout(() => { boundedSignal.removeEventListener('abort', abort); resolve(); }, interval);
                boundedSignal.addEventListener('abort', abort, { once: true });
                if (boundedSignal.aborted) abort();
            });
            data = await request(`/api/v1/model/prediction/${encodeURIComponent(id)}`, key, { signal: boundedSignal, fetcher });
        }
    } catch (error) {
        if (scope.signal.aborted) throw scope.reason();
        throw error;
    } finally { scope.dispose(); }
}
export function sceneText(chat, index, count = 6) {
    return chat.slice(0, index + 1).filter(m => !m.is_system && m.mes).slice(-count)
        .map(m => `${m.name || (m.is_user ? 'User' : 'Character')}: ${String(m.mes).replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/<[^>]+>/g, '').slice(-3500)}`).join('\n');
}
