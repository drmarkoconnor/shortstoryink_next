import {test} from 'node:test'
import assert from 'node:assert/strict'
import {safeSourceUrl,validateCommonplace} from '../lib/commonplace/validation'
test('commonplace validates length, attribution, craft and safe return links',()=>{
 const input={id:'00000000-0000-4000-8000-000000000001',passage:'A particular detail.',source:'My observation',sourceUrl:'/app/course/begin-again',note:'Why this matters',tag:'Noticing'}
 assert.equal(validateCommonplace(input),null)
 for(const link of ['javascript:alert(1)','//evil.test','/app/course\\evil','https://user:pass@example.com'])assert.equal(safeSourceUrl(link),'')
 assert.equal(safeSourceUrl('https://example.org/story'),'https://example.org/story')
 for(const change of [{passage:''},{passage:'x'.repeat(4001)},{source:''},{note:'x'.repeat(4001)},{tag:'fake'},{id:'fake'},{sourceUrl:'javascript:alert(1)'}])assert.ok(validateCommonplace({...input,...change}))
})
