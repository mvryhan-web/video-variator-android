// Agent B BASE #5: Product Video references must never silently reinterpret an
// optional advertising logo as a product/scene photo. The current Video adapter
// supports photo/first-frame/scene roles, NOT a separate ad-logo overlay.
// This browser-only preflight is a guardrail, not a guarantee of output fidelity.
export function inspectProductVideoHandoff(handoff){
 if(handoff?.source!=='product-video')return {allowed:true};
 const files=handoff.files,meta=handoff.meta;
 if(handoff.kind!=='video'||!Array.isArray(files)||!meta||typeof meta!=='object'||
    Array.isArray(meta)||typeof meta.hasLogo!=='boolean'||files.length<1||files.length>4)
  return {allowed:false,reason:'PRODUCT_VIDEO_REFERENCE_ROLES_INVALID'};
 if(meta.hasLogo===true)
  return {allowed:false,reason:'PRODUCT_VIDEO_LOGO_OVERLAY_UNSUPPORTED'};
 // Only the three original product photos may reach the Video scene-reference
 // parser. Four files without an explicit logo flag is inconsistent metadata.
 if(files.length>3)return {allowed:false,reason:'PRODUCT_VIDEO_REFERENCE_ROLES_INVALID'};
 return {allowed:true};
}
