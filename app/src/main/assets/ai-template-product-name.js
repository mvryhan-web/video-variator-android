const VALID_TYPES=new Set(['image','video','product_video','audio']);
const LOCAL_INPUTS=new Set(['image','text','product_name']);
const NAME_TOKEN=/\{\{\s*product_name\s*\}\}/i;
const STUDIO_PROMPT_LIMIT=2000;

export function templateSupport(template){
 const raw=template?.requiredInputTypes;
 const required=raw==null?[]:Array.isArray(raw)?raw:['unsupported'];
 const unsupported=required.filter(v=>typeof v!=='string'||!LOCAL_INPUTS.has(v));
 const hasToken=NAME_TOKEN.test(String(template?.promptTemplate??''));
 const needsProductName=required.includes('product_name')||hasToken;
 if(!VALID_TYPES.has(template?.generationType))return {supported:false,requiresProductName:false,reason:'This workflow is not available in Studio yet.'};
 if(!String(template?.promptTemplate??'').trim())return {supported:false,requiresProductName:false,reason:'This template has no prompt. Ask the template owner to complete it.'};
 if(unsupported.length)return {supported:false,requiresProductName:false,reason:'This workflow requires '+unsupported.map(v=>String(v).replaceAll('_',' ')).join(', ')+' input support not yet available through Studio.'};
 if(needsProductName&&!hasToken)return {supported:false,requiresProductName:false,reason:'This template asks for a product name but has no {{product_name}} placeholder in its prompt.'};
 // Never advertise a usable workflow whose full prepared prompt would be silently truncated.
 if(!needsProductName&&String(template?.promptTemplate??'').length>STUDIO_PROMPT_LIMIT)return {supported:false,requiresProductName:false,reason:'This template prompt exceeds the 2,000-character Studio limit. Ask the template owner to shorten it.'};
 // Even the shortest valid one-character product name must fit; otherwise every use would fail.
 if(needsProductName&&String(template?.promptTemplate??'').replace(/\{\{\s*product_name\s*\}\}/gi,'X').length>STUDIO_PROMPT_LIMIT)return {supported:false,requiresProductName:false,reason:'This personalized template is too long for Studio, even with a short product name. Ask the template owner to shorten it.'};
 return {supported:true,requiresProductName:needsProductName,reason:''};
}

export function prepareTemplatePrompt(template,productName=''){
 const support=templateSupport(template);
 if(!support.supported)throw Error('This workflow is not ready for Studio.');
 const prompt=String(template.promptTemplate??'');
 if(!support.requiresProductName)return prompt;
 const name=String(productName??'').trim().replace(/\s+/g,' ');
 if(!name)throw Error('Enter your product name before opening Studio.');
 if(name.length>80)throw Error('Product name must be 80 characters or fewer.');
 const filled=prompt.replace(/\{\{\s*product_name\s*\}\}/gi,()=>name);
 if(filled.length>STUDIO_PROMPT_LIMIT)throw Error('The personalized prompt is too long for Studio. Ask the template owner to shorten it.');
 return filled;
}
