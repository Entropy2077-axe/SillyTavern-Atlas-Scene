import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {checkAborted,uniqueId} from '../compat.js';
import {loreText,characterText} from '../scene-context.js';
import {generationBody} from '../models.js';
import {sceneText} from '../atlas.js';
const source=(await readFile(new URL('../index.js',import.meta.url),'utf8')).replace(/^import .*\r?\n/gm,'');
function harness(generator, initial = {}) {
 const handlers={}, nodes=new Map();
 const panel={querySelector(s){if(!nodes.has(s))nodes.set(s,{addEventListener(type, fn){this[type]=fn;},append(){},textContent:''});return nodes.get(s);},querySelectorAll(){return [];}};
 let uploads=0,saves=0,attachments=0;
 const context={chat:[{name:'User',is_user:true,mes:'Enter the tavern'},{name:'Character',mes:'The candles flicker.'}],extensionSettings:{atlas_scene:{enabled:true,refine:false,...initial}},event_types:{APP_READY:'ready',CHARACTER_MESSAGE_RENDERED:'reply',USER_MESSAGE_RENDERED:'user',CHAT_CHANGED:'change',WORLD_INFO_ACTIVATED:'lore',GENERATION_STARTED:'start'},eventSource:{on:(e,f)=>handlers[e]=f},getRequestHeaders:()=>({}),appendMediaToMessage:()=>attachments++,saveChat:async()=>saves++,saveSettingsDebounced(){}};
 const sandbox={SillyTavern:{getContext:()=>context},document:{getElementById:id=>id==='atlas-scene-settings'?null:{append(){}},createElement:tag=>tag==='div'?panel:{}},generate:generator,request:async()=>({}),sceneText,loreText,characterText,generationBody,fetchModels:async()=>[{id:"z-image/turbo",name:"Turbo"}],checkAborted,uniqueId,setTimeout,clearTimeout,AbortController,crypto:globalThis.crypto,$:()=>({}),fetch:async()=>{uploads++;return{ok:true,json:async()=>({path:'/user/images/atlas.png'})};}};
 vm.createContext(sandbox); vm.runInContext(source,sandbox); vm.runInContext('init(); if (!key) key="test";',sandbox);
 return {context,handlers,nodes,run:code=>vm.runInContext(code,sandbox),stats:()=>({uploads,saves,attachments})};
}
test('render event deduplicates and attaches image to original message',async()=>{
 let calls=0;const h=harness(async()=>{calls++;return{image:'data:image/png;base64,YWJj',id:'one'};});
 h.handlers.reply(1);h.handlers.reply(1);await h.run('drain()');
 assert.equal(calls,1);assert.equal(h.context.chat[1].extra.media[0].url,'/user/images/atlas.png');assert.equal(h.context.chat[0].extra,undefined);
 h.handlers.reply(1);await h.run('drain()');assert.equal(calls,1);assert.equal(h.stats().saves,1);
});
test('chat switch prevents stale result attaching or uploading',async()=>{
 let finish;const h=harness(()=>new Promise(r=>finish=r));h.handlers.reply(1);const done=h.run('drain()');
 h.handlers.change();h.context.chat=[{mes:'new chat'}];finish({image:'data:image/png;base64,YWJj'});await done;
 assert.deepEqual(h.stats(),{uploads:0,saves:0,attachments:0});
});
test('edited message discards in-flight result',async()=>{
 let finish;const h=harness(()=>new Promise(r=>finish=r));h.handlers.reply(1);const done=h.run('drain()');
 h.context.chat[1].mes='edited';finish({image:'data:image/png;base64,YWJj'});await done;assert.equal(h.stats().attachments,0);
});
test('extension messages and opening greetings never trigger',async()=>{
 let calls=0;const h=harness(async()=>{calls++;});h.handlers.reply(1,'extension');h.handlers.reply(1,'first_message');await h.run('drain()');assert.equal(calls,0);
});
test('immediate mode attaches to user message without quiet generation',async()=>{
 const h=harness(async()=>({image:'data:image/png;base64,YWJj'}));h.run('settings.trigger="user"; settings.refine=true;');
 h.handlers.user(0);await h.run('drain()');assert.equal(h.stats().attachments,1);assert.ok(h.context.chat[0].extra.media);
});

test('saved Key restores and can be saved or cleared',()=>{
 const h=harness(async()=>({}));
 h.nodes.get('#atlas-key').input({target:{value:'new-test-key'}});
 h.nodes.get('#atlas-save-key').onclick();
 assert.equal(h.context.extensionSettings.atlas_scene.apiKey,'new-test-key');
 h.nodes.get('#atlas-clear-key').onclick();
 assert.equal(h.context.extensionSettings.atlas_scene.apiKey,'');
});
test('activated lore and character card reach image prompt and clear across chats',async()=>{
 let prompt='';const h=harness(async(k,b)=>{prompt=b.prompt;return{image:'data:image/png;base64,YWJj'};});
 h.context.characters=[{name:'Ada',data:{description:'green eyes'}}];h.context.characterId=0;
 h.handlers.lore([{content:'Ada wears a silver cloak.'}]);h.handlers.reply(1);await h.run('drain()');
 assert.match(prompt,/silver cloak/);assert.match(prompt,/green eyes/);
 h.handlers.change();assert.equal(h.run('activatedLore'),'');
});
test('model directory selection persists model ID',async()=>{
 const h=harness(async()=>({}));await h.nodes.get('#atlas-models').onclick();
 assert.equal(h.context.extensionSettings.atlas_scene.models[0].id,'z-image/turbo');
 h.nodes.get('#atlas-model-list').onchange({target:{value:'vendor/image'}});
 assert.equal(h.context.extensionSettings.atlas_scene.model,'vendor/image');
});

test('saved key is restored on initialization',()=>{const h=harness(async()=>({}),{apiKey:'saved-test'});assert.equal(h.nodes.get('#atlas-key').value,'saved-test');assert.equal(h.run('key'),'saved-test');});
