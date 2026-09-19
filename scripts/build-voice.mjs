import {build} from 'esbuild';
await build({entryPoints:['node_modules/kokoro-js/dist/kokoro.js'],bundle:true,platform:'browser',format:'esm',outfile:'build/vendor/kokoro.js',alias:{'@huggingface/transformers':'/vendor/ai/transformers.min.js'},external:['/vendor/ai/transformers.min.js'],minify:true});
