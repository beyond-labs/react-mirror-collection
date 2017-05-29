import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import babel from 'rollup-plugin-babel'

export default {
  entry: 'src/index.js',
  format: 'cjs',
  plugins: [
    commonjs({
      include: 'node_modules/**'
    }),
    resolve(),
    babel({
      exclude: 'node_modules/**',
      presets: [['env', {modules: false}]],
      plugins: ['external-helpers']
    })
  ],
  external: ['react-mirror', 'invariant', 'most'],
  dest: 'index.js',
  sourceMap: true
}
