// Configuración del entorno de pruebas unitarias: Karma (ejecutor) + Jasmine (framework de pruebas).
// Karma levanta un navegador real (Chrome/Edge sin ventana), webpack + Babel compilan el JSX
// y karma-coverage (Istanbul) mide la cobertura del código fuente.
const fs = require('fs')
const path = require('path')

// Usa Chrome si está instalado; si no, Edge (también es Chromium)
if (!process.env.CHROME_BIN) {
  const candidatos = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  ]
  const encontrado = candidatos.find((c) => fs.existsSync(c))
  if (encontrado) process.env.CHROME_BIN = encontrado
}

module.exports = function (config) {
  config.set({
    frameworks: ['jasmine', 'webpack'],

    files: [{ pattern: 'src/test/entrada.js', watched: false }],
    preprocessors: { 'src/test/entrada.js': ['webpack'] },

    webpack: {
      mode: 'development',
      devtool: 'inline-source-map',
      resolve: { extensions: ['.js', '.jsx'] },
      module: {
        rules: [
          // Igual que Vite: permite importar sin escribir la extensión (./api en vez de ./api.js)
          { test: /\.m?jsx?$/, resolve: { fullySpecified: false } },
          {
            test: /\.jsx?$/,
            exclude: /node_modules/,
            use: {
              loader: 'babel-loader',
              options: {
                babelrc: false,
                configFile: false,
                presets: [['@babel/preset-env', { targets: { chrome: '120' } }], ['@babel/preset-react', { runtime: 'automatic' }]],
                // Instrumenta el código de la app (no las pruebas) para medir cobertura
                plugins: [['istanbul', { exclude: ['**/*.spec.js', '**/*.spec.jsx', 'src/test/**'] }]],
              },
            },
          },
          // Estilos e imágenes no se prueban: se cargan como recursos vacíos
          { test: /\.css$/, type: 'asset/source' },
          { test: /\.(png|svg|jpe?g)$/, type: 'asset/inline' },
        ],
      },
    },

    reporters: ['progress', 'kjhtml', 'coverage'],
    coverageReporter: {
      dir: path.join(__dirname, 'coverage'),
      reporters: [{ type: 'html', subdir: 'html' }, { type: 'text-summary' }, { type: 'text', subdir: '.', file: 'resumen.txt' }, { type: 'json-summary', subdir: '.' }],
    },

    client: {
      jasmine: { random: false },
      clearContext: false, // deja visible el reporte HTML de Jasmine en el navegador
    },

    browsers: ['ChromeHeadless'],
    browserNoActivityTimeout: 60000,
    singleRun: false,
  })
}
