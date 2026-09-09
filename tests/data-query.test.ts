import test from 'node:test'
import assert from 'node:assert/strict'
import { DataQuery, type ExecuteSql } from '../lib/data/query'

test('SQL values remain parameters and unsafe identifiers are rejected', async () => {
	const calls: {sql:string;values:unknown[]}[]=[]
	const execute: ExecuteSql=async(sql,values)=>{calls.push({sql,values});return {rows:[]}}
	const hostile="x'); DROP TABLE profiles; --"
	await new DataQuery('submissions',execute).select('id, title').eq('title',hostile).order('created_at',{ascending:false}).limit(10)
	assert.equal(calls.length,1);assert.ok(!calls[0].sql.includes(hostile));assert.equal(calls[0].values[0],hostile)
	assert.throws(()=>new DataQuery('submissions;delete from profiles',execute))
	assert.throws(()=>new DataQuery('submissions',execute).select('id,(select password from users)'))
	assert.throws(()=>new DataQuery('submissions',execute).or('id.eq.x OR true'))
	assert.throws(()=>new DataQuery('submissions',execute).limit(-1))
})

test('JSON arrays, text arrays and missing defaults keep their storage semantics', async () => {
	const calls: {sql:string;values:unknown[]}[]=[]
	const execute: ExecuteSql=async(sql,values)=>{calls.push({sql,values});return {rows:[{id:'one'}]}}
	await new DataQuery('teacher_documents',execute).insert({title:'Draft',body:[{text:'line'}]}).select('id').single()
	assert.deepEqual(calls[0].values,['Draft','[{"text":"line"}]'])
	await new DataQuery('feedback_summaries',execute).update({next_steps:['one','two'],summary:undefined}).eq('id','one')
	assert.deepEqual(calls[1].values,[['one','two'],'one']);assert.ok(!calls[1].sql.includes('summary" ='))
})

test('empty sets are false and unfiltered mutations fail without executing', async () => {
	let sql=''; let calls=0
	const execute:ExecuteSql=async(q)=>{sql=q;calls++;return {rows:[]}}
	await new DataQuery('profiles',execute).select('id').in('id',[])
	assert.match(sql,/WHERE false/)
	const result=await new DataQuery('profiles',execute).delete()
	assert.ok(result.error);assert.equal(calls,1)
})

test('optional/single cardinality, counts and repeated await retain the contract', async () => {
	let calls=0
	const query=new DataQuery('profiles',async()=>{calls++;return {rows:[{id:'a'},{id:'b'}]}}).maybeSingle()
	assert.equal((await query).error?.code,'PGRST116');await query;assert.equal(calls,1)
	assert.equal((await new DataQuery('profiles',async()=>({rows:[]})).maybeSingle()).data,null)
	assert.equal((await new DataQuery('profiles',async()=>({rows:[]})).single()).error?.code,'PGRST116')
	const count=await new DataQuery('profiles',async()=>({rows:[{total:7}]})).select('id',{count:'exact',head:true})
	assert.equal(count.count,7);assert.equal(count.data,null)
})

test('upserts keep conflict targets and duplicate suppression parameterised',async()=>{
	let statement=''
	await new DataQuery('workshop_members',async(sql)=>{statement=sql;return {rows:[]}}).upsert([{workshop_id:'g',profile_id:'w'}],{onConflict:'workshop_id,profile_id',ignoreDuplicates:true})
	assert.match(statement,/ON CONFLICT \("workshop_id", "profile_id"\) DO NOTHING/)
})
