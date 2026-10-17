const VALID_TYPES=new Set(['image','video','product_video','audio']);
const LOCAL_INPUTS=new Set(['image','text','product_name']);
const NAME_TOKEN=/\{\{\s*product_name\s*\}\}/i;

export function templateSupport(template){
 const raw=template?.requiredInputTypes;
 const required=raw==null?[]:Array.isArray(raw)?raw:['unsupported'];
 const unsupported=required.filter(v=>typeof v!=='string'||!LOCAL_INPUTS.has(v));
 const hasToken=NAME_TOKEN.test(String(template?.promptTemplate??''));
 const needsProductName=required.includes('product_name')||hasToken;
 if(!VALID_TYPES.has(template?.generationType))return {supported:false,requiresProductName:false,reason:'This workflow is not available in Studio yet.'};
 if(unsupported.length)return {supported:false,requiresProductName:false,reason:'This workflow requires '+unsupported.map(v=>String(v).replaceAll('_',' ')).join(', ')+' input support not yet available through Studio.'};
 if(needsProductName&&!hasToken)return {supported:false,requiresProductName:false,reason:'This template asks for a product name but has no {{product_name}} placeholder in its prompt.'};
 return {supported:true,requiresProductName:needsProductName,reason:''};
}

export function prepareTemplatePrompt(template,productName=''){
 const support=templateSupport(template);
 if(!support.supported)throw Error('This workflow is not ready for Studio.');
 const prompt=String(template.promptTemplate??'');
 if(!support.requiresProductName)return prompt.slice(0,2000);
 const name=String(productName??'').trim().replace(/\s+/g,' ');
 if(!name)throw Error('Enter your product name before opening Studio.');
 if(name.length>80)throw Error('Product name must be 80 characters or fewer.');
 const filled=prompt.replace(/\{\{\s*product_name\s*\}\}/gi,()=>name);
 if(filled.length>2000)throw Error('The personalized prompt is too long for Studio. Ask the template owner to shorten it.');
 return filled;
}
