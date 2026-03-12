import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';

export default [
	{
		input: 'src/model.ts',
		output: [
			{
				name: 'LPModel',
				file: 'dist/lp-model.min.js',
				format: 'umd',
				plugins: [terser()], // minify the output
				sourcemap: true
			},
			{
				name: 'LPModel',
				file: 'dist/lp-model.js',
				format: 'umd'
			},
			{ // ES module
				name: 'LPModel',
				file: 'dist/lp-model.es.js',
				format: 'es'
			}
		],
		plugins: [typescript()]
	},
];
