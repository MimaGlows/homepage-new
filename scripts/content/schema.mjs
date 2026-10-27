// One small JSON Schema vocabulary, shared by file validation and Studio forms.
const text = (maxLength = 200) => ({ type: 'string', maxLength });
const bool = { type: 'boolean' };
const integer = (minimum = 0, maximum = 10000) => ({ type: 'integer', minimum, maximum });
const id = { type: 'string', pattern: '^[a-z0-9][a-z0-9._:-]{0,79}$' };
const url = { type: 'string', format: 'public-url', maxLength: 2000 };
const image = { type: 'string', format: 'image-path', maxLength: 240 };
const date = { type: 'string', format: 'date-time' };
const object = (properties, required = []) => ({ type: 'object', properties, required, additionalProperties: false });
const array = (items, maxItems = 500) => ({ type: 'array', items, maxItems });
export const modules = ['navigation', 'friends', 'music', 'blog', 'social', 'characters'];
export const moduleFor = { navigation: 'navigation', friend: 'friends', music: 'music', blog: 'blog', social: 'social', character: 'characters' };
export const moduleSchema = object({
 enabled: bool, showInFocus: bool, showInArchive: bool, displayLimit: integer(1,128),
 sorting: { enum: ['manual','newest','title'] }, syncEnabled: bool, refreshInterval: integer(1,8760),
 fallbackBehavior: { enum: ['cache','manual','hide'] }
});
export const siteSchema = object({
 $schema: text(200), schemaVersion: { const: 1 }, title: {...text(100),minLength:1}, name: {...text(60),minLength:1}, description: text(240),
 registration: object({ text: text(80), url }, ['text','url']),
 navigation: array(object({ id: { enum: ['blog','minecraft','stronghold'] }, title: text(40), url, order: integer() }, ['id','title','url','order']),3),
 defaults: object({ mode: { enum: ['focus','archive'] }, theme: { enum: ['day','night'] }, intro: bool, particles: bool, parallax: bool }, ['mode','theme','intro','particles','parallax']),
 moduleOrder: array({ enum: modules },6), modules: object(Object.fromEntries(modules.map(key=>[key,moduleSchema])), modules)
}, ['schemaVersion','title','name','description','registration','navigation','defaults','moduleOrder','modules']);
export const linkSchema = object({ platform: { enum: ['apple','netease','youtube','lastfm','listenbrainz','other'] }, url, platformId: text(120), confirmed: bool }, ['platform','url']);
export const recordSchema = object({
 id, type: { enum: Object.keys(moduleFor) }, title: {...text(180),minLength:1}, description: text(800), image, thumbnail:image, imageLarge:image, url,
 published: bool, featured: bool, pinned: bool, archived: bool, order: integer(),
 modes: array({ enum: ['focus','archive'] },2), tags: array(text(50),20), group: text(60), updatedAt: date,
 bodyFile: { type:'string', pattern:'^[a-z0-9][a-z0-9/-]*\\.md$', maxLength:180 },
 source: object({ url, imageUrl:url, attribution: text(240), license: text(240), retrievedAt: date }, ['url']),
 relations: array(object({ targetId: id, label: text(100), public: bool },['targetId','label']),50),
 artworks: array(object({ image, caption: text(200), sourceUrl: url, attribution:text(240), public:bool },['image']),30),
 articleLinks: array(object({ title:text(120), url },['title','url']),30),
 artist: text(200), album: text(200), isrc:{type:'string',pattern:'^[A-Z]{2}[A-Z0-9]{3}[0-9]{7}$'}, duration:integer(1,86400), version:text(120),
 platformLinks: array(linkSchema,12), lastPlayedAt:date, publishedAt:date,
 canonicalId:id, mergeLocked:bool, neverMergeWith:array(id,128)
},['id','type','title']);
export const recordsSchema = object({ $schema:text(), schemaVersion:{const:1}, items:array(recordSchema) },['schemaVersion','items']);
export const overrideSchema = object({ $schema:text(), schemaVersion:{const:1}, items:array(object({ id, patch: object(Object.fromEntries(Object.entries(recordSchema.properties).filter(([key])=>!['id','type'].includes(key)))) },['id','patch'])) },['schemaVersion','items']);
export const tombstoneSchema = object({ $schema:text(), schemaVersion:{const:1}, ids:array(id,5000) },['schemaVersion','ids']);
export const eventSchema = object({ id, trackId:id, playedAt:date, platform:{enum:['apple','netease','youtube','lastfm','listenbrainz','manual']}, sourceId:text(200) },['id','trackId','playedAt','platform']);
export const cacheSchema = object({ schemaVersion:{const:1}, source:text(200), lastAttemptAt:date, lastSuccessfulAt:date, error:text(600), items:array(recordSchema), playEvents:array(eventSchema,10000), matches:array(object({trackId:id,platformLinks:array(linkSchema,12),method:{enum:['id','isrc','metadata']},matchedAt:date},['trackId','platformLinks','method','matchedAt'])) },['schemaVersion','source','items']);
export const syncSchema = object({ $schema:text(), schemaVersion:{const:1}, sources:array(object({ id, module:{enum:modules.filter(x=>x!=='navigation')}, adapter:{enum:['rss','friends-html','listenbrainz','lastfm','apple-catalog','netease-import','youtube-import','x-manual']}, enabled:bool, url, username:text(100), tokenEnv:{type:'string',pattern:'^[A-Z][A-Z0-9_]{1,80}$'}, refreshHours:integer(1,8760), maxItems:integer(1,100),storefront:{type:'string',pattern:'^[a-z]{2}$'},importFile:{type:'string',pattern:'^imports/[a-z0-9][a-z0-9_-]*\\.json$'} },['id','module','adapter','enabled']),30) },['schemaVersion','sources']);

export function validate(value, schema, path = '$', errors = []) {
 const fail = message => errors.push(`${path}: ${message}`);
 if (schema.const !== undefined && value !== schema.const) fail(`必须为 ${JSON.stringify(schema.const)}`);
 if (schema.enum && !schema.enum.includes(value)) fail(`应为 ${schema.enum.join(' / ')}`);
 if (schema.type) {
  const actual=Array.isArray(value)?'array':value===null?'null':typeof value;
  const expected=schema.type==='integer'?'number':schema.type;
  if(actual!==expected){fail(`应为 ${schema.type}`);return errors;}
 }
 if(typeof value==='string') {
  if(schema.minLength && value.trim().length<schema.minLength)fail('不能为空');
  if(schema.maxLength && value.length>schema.maxLength)fail(`最多 ${schema.maxLength} 字符`);
  if(schema.pattern && !new RegExp(schema.pattern).test(value))fail('格式不正确');
  if(schema.format==='date-time' && (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,19)!==value.slice(0,19)))fail('应为 ISO 日期时间，例如 2026-10-26T00:00:00Z');
  if(schema.format==='public-url') { try {const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password)throw 0;}catch{fail('应为不含账号密码的完整 HTTPS 链接');} }
  if(schema.format==='image-path' && !/^\/(assets|media)\/[a-zA-Z0-9/_-]+\.(webp|avif|png|jpe?g|svg)$/.test(value))fail('图片须为 /assets/ 或 /media/ 下的本地图片路径');
 }
 if(typeof value==='number') {
  if(!Number.isFinite(value)||(schema.type==='integer'&&!Number.isInteger(value)))fail('应为有限整数');
  if(schema.minimum!==undefined&&value<schema.minimum)fail(`不能小于 ${schema.minimum}`);
  if(schema.maximum!==undefined&&value>schema.maximum)fail(`不能大于 ${schema.maximum}`);
 }
 if(Array.isArray(value)) {
  if(schema.maxItems!==undefined&&value.length>schema.maxItems)fail(`最多 ${schema.maxItems} 项`);
  value.forEach((item,index)=>validate(item,schema.items,`${path}[${index}]`,errors));
 }
 if(value&&typeof value==='object'&&!Array.isArray(value)) {
  for(const key of schema.required||[])if(!(key in value))errors.push(`${path}.${key}: 缺少必填字段`);
  for(const [key,item]of Object.entries(value)){
   if(schema.properties?.[key])validate(item,schema.properties[key],`${path}.${key}`,errors);
   else if(schema.additionalProperties===false)errors.push(`${path}.${key}: 未知字段，请检查拼写`);
  }
 }
 return errors;
}
export const defaults = record => ({ description:'', image:'/assets/placeholder.svg', published:true, featured:false, pinned:false, archived:false, order:100, modes:['focus','archive'], tags:[], ...record });
export const moduleDefaults = value => ({enabled:true,showInFocus:true,showInArchive:true,displayLimit:12,sorting:'manual',syncEnabled:false,refreshInterval:24,fallbackBehavior:'cache',...value});
