import { loadProject } from './project.mjs';
try { const p=await loadProject();for(const warning of p.warnings)console.warn(`提示 ${warning}`);console.log(`内容校验通过：${p.files.length} 个文件、${p.records.length} 条内容；自动与人工数据分离。`); }
catch(error){console.error(error.message);process.exitCode=1;}
