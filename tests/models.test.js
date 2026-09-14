import {test} from 'node:test';
import assert from 'node:assert/strict';
import {imageModels, generationBody} from '../models.js';
test('catalog excludes video and image editing and deduplicates',()=>{
 const item={model:'a',type:'Image',categories:['TEXT-TO-IMAGE']};
 assert.deepEqual(imageModels([item,item,{model:'b',type:'Video',categories:['TEXT-TO-VIDEO']},{model:'c',type:'Image',categories:['IMAGE-TO-IMAGE']}]),[{id:'a',name:'a'}]);
});
test('unrelated models do not receive z-image parameters',()=>{
 assert.deepEqual(generationBody({model:'other',size:'1024*1024'},'scene'),{model:'other',prompt:'scene'});
 assert.equal(generationBody({model:'z-image/turbo',size:'1024*1024'},'scene').size,'1024*1024');
});
