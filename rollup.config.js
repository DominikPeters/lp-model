import terser from '@rollup/plugin-terser';

export default [
	{
		input: 'model.js',
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
		]
	},
];
