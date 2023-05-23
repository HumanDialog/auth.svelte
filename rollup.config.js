import svelte from "rollup-plugin-svelte";
import resolve from "@rollup/plugin-node-resolve";
import sveltePreprocess from "svelte-preprocess";
import typescript from "@rollup/plugin-typescript";
import execute from "rollup-plugin-execute";
import pkg from "./package.json";
    

    
export default {
        input: 'src/index.ts',
        output: [
            { 
                file: pkg.module, 
                format: 'es', 
                sourcemap: true 
            },
            { 
                file: pkg.main, 
                format: 'umd', 
                name: 'auth.svelte',
                sourcemap: true,
                plugins: [
                // we only want to run this once, so we'll just make it part of this output's plugins
                execute([
                    "tsc --outDir ./dist --declaration",
                    "node scripts/preprocess.js",
                ]),
                ],
            }
        ],
        plugins: [
            svelte({ preprocess: sveltePreprocess() }),
            resolve(),
            typescript(),
        ],
};