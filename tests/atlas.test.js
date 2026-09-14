import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generate,request,imageOutput,sceneText} from '../atlas.js';
const reply=data=>({ok:true,json:async()=>({code:200,data})});
test('submit once, poll through processing and retrieve image',async()=>{
 const calls=[]; const responses=[{id:'job 1',status:'created'},{status:'processing'},{status:'completed',outputs:['https://example.com/a.png']}];
 const result=await generate('test-key',{model:'z-image/turbo',prompt:'scene'},{interval:1,fetcher:async(url,options)=>{calls.push({url,options});return reply(responses.shift());}});
 assert.equal(result.image,'https://example.com/a.png'); assert.equal(calls.length,3);
 assert.equal(calls[0].options.method,'POST'); assert.ok(calls[1].url.endsWith('/prediction/job%201'));
});
test('failed prediction is terminal without resubmission',async()=>{
 let calls=0; await assert.rejects(generate('test',{}, {fetcher:async()=>{calls++;return reply({id:'x',status:'failed'});}}),/失败/); assert.equal(calls,1);
});
test('HTTP authentication errors and application errors surface',async()=>{
 await assert.rejects(request('/x','test',{fetcher:async()=>({ok:false,status:401})}),/401/);
 await assert.rejects(request('/x','test',{fetcher:async()=>({ok:true,json:async()=>({code:400,message:'secret'})})}),/400/);
});
test('abort stops polling',async()=>{
 const controller=new AbortController(); let calls=0;
 await assert.rejects(generate('test',{}, {signal:controller.signal,fetcher:async()=>{calls++;controller.abort();return reply({id:'x',status:'processing'});}}),{name:'AbortError'});
 assert.equal(calls,1);
});
test('timeout is bounded',async()=>{
 await assert.rejects(generate('test',{}, {timeout:10,interval:50,fetcher:async()=>reply({id:'x',status:'processing'})}),{name:'TimeoutError'});
});
test('invalid output and empty completed output are rejected',()=>{
 assert.throws(()=>imageOutput({outputs:['javascript:alert(1)']})); assert.throws(()=>imageOutput({outputs:[]}));
 assert.equal(imageOutput({outputs:['YWJj']}),'data:image/png;base64,YWJj');
 assert.equal(imageOutput({outputs:['/9j/AA==']}),'data:image/jpeg;base64,/9j/AA==');
});
test('context ends at triggering message and excludes system/thinking',()=>{
 const chat=[{mes:'secret',is_system:true},{name:'A',mes:'<think>hidden</think>forest'},{name:'B',mes:'future'}];
 assert.equal(sceneText(chat,1),'A: forest');
});
