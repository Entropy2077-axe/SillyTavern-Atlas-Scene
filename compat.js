// Avoid newer AbortSignal methods and secure-context-only randomUUID.
const reasons = new WeakMap();
function namedError(name, message) {
    const error = new Error(message); error.name = name; return error;
}
export function abortReason(signal) {
    return reasons.get(signal) || signal.reason || namedError('AbortError', '任务已停止');
}
export function checkAborted(signal) {
    if (signal?.aborted) throw abortReason(signal);
}
export function abortScope(parent, timeout) {
    const controller = new AbortController();
    const abort = reason => {
        if (controller.signal.aborted) return;
        reasons.set(controller.signal, reason);
        controller.abort();
    };
    const forward = () => abort(abortReason(parent));
    if (parent?.aborted) forward();
    else parent?.addEventListener('abort', forward, { once: true });
    const timer = setTimeout(() => abort(namedError('TimeoutError', '请求超时')), timeout);
    return {
        signal: controller.signal,
        reason: () => abortReason(controller.signal),
        dispose() { clearTimeout(timer); parent?.removeEventListener('abort', forward); },
    };
}
export function uniqueId() {
    // File name uniqueness only; this is not a security token.
    return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}
