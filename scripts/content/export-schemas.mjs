import { writeFile, mkdir } from 'node:fs/promises';
import { siteSchema, recordsSchema, overrideSchema, tombstoneSchema, syncSchema } from './schema.mjs';
await mkdir('content/schemas',{recursive:true});
for(const [name,schema]of Object.entries({site:siteSchema,records:recordsSchema,overrides:overrideSchema,tombstones:tombstoneSchema,sync:syncSchema}))await writeFile(`content/schemas/${name}.schema.json`,JSON.stringify({$schema:'https://json-schema.org/draft/2020-12/schema',...schema},null,2)+'\n');
