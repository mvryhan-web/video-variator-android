// BASE #50: platform discovery flags do not control paid AI generation.
// Preserve unset/dev preview default, but explicit invalid values disable.
export function platformFeatureEnabled(name,env=process.env){
 const value=env[name];
 return value==='true'||(env.NODE_ENV!=='production'&&value===undefined);
}
