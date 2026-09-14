import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
const compat = await readFile(new URL('../compat.js', import.meta.url), 'utf8');
const atlas = await readFile(new URL('../atlas.js', import.meta.url), 'utf8');
class LegacySignal extends EventTarget { aborted = false; }
class LegacyController {
    signal = new LegacySignal();
    abort() { if (!this.signal.aborted) { this.signal.aborted = true; this.signal.dispatchEvent(new Event('abort')); } }
}
function legacy() {
    const context = vm.createContext({ AbortController: LegacyController, setTimeout, clearTimeout });
    vm.runInContext((compat + '\n' + atlas).replace(/^import .*\r?\n/gm, '').replace(/export /g, ''), context);
    return context;
}
test('legacy browser without timeout/any/throwIfAborted/reason/crypto can query and generate', async () => {
    const c = legacy();
    const result = await vm.runInContext(`(async () => {
        const balance = await request('/public/v1/balance', 'test', {fetcher: async () => ({ok:true,json:async()=>({available:{value:'1'}})})});
        let calls = 0;
        const image = await generate('test', {}, {interval:1, fetcher:async()=>({ok:true,json:async()=>({data:++calls===1?{id:'x',status:'processing'}:{status:'completed',outputs:['https://example.com/a.png']}})})});
        return {balance:balance.available.value,image:image.image,id:uniqueId()};
    })()`, c);
    assert.equal(result.balance, '1'); assert.equal(result.image, 'https://example.com/a.png'); assert.ok(result.id);
});
test('legacy parent cancellation and timeout retain errors and release timers', async () => {
    const c = legacy();
    assert.equal(vm.runInContext(`(() => { const p = new AbortController(); const s = abortScope(p.signal,10000); p.abort(); try { checkAborted(s.signal); } catch(e) { return e.name; } finally { s.dispose(); } })()`,c), 'AbortError');
    await assert.rejects(vm.runInContext(`generate('test',{}, {timeout:5,interval:50,fetcher:async()=>({ok:true,json:async()=>({id:'x',status:'processing'})})})`,c),{name:'TimeoutError'});
});
