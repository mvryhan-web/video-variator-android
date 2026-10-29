import fs from 'node:fs/promises';
import path from 'node:path';
import {finalizePresentation} from '/root/.codex/skills/builtins/presentations/container_tools/artifact_tool_utils.mjs';
const ROOT=path.dirname(new URL(import.meta.url).pathname),SKILL='/root/.codex/skills/builtins/presentations';
for(const file of (await fs.readdir(path.join(ROOT,'.build'))).filter(x=>x.endsWith('.pptx')&&(!process.env.STYLE||x.startsWith(process.env.STYLE+'_')))){
 const mobile=file.includes('Mobile');
 const r=await finalizePresentation({workspaceDir:ROOT,candidatePath:path.join(ROOT,'.build',file),finalPath:path.join(ROOT,'Buyer',file),pythonExecutable:process.env.CODEX_PRIMARY_RUNTIME_PYTHON,integrityValidatorPath:SKILL+'/container_tools/inspect_presentation_package_integrity.py',layoutValidatorPath:SKILL+'/container_tools/inspect_presentation_layout_geometry.py',layoutArgs:['--expected-slide-size-emu',mobile?'4572000,8128000':'4572000,6400800','--validate-heading-fit'],explicitTotalSlideCount:3,requiredNativeTableOwnerSlides:[],requiredNativeChartOwnerSlides:[],fontPolicy:{basis:'design',families:['Nimbus Roman','Nimbus Sans','P052','C059','URW Gothic','Z003']},verifyArtifactToolImport:true,receiptPath:path.join(ROOT,'.build',file+'.validation.json')});
 console.log(file,JSON.stringify(r));
}
