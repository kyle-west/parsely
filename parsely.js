const path = require('path')
const fs = require('fs')

if (!process.argv[2]) {
  console.log("No theme file specified. Exiting.")
  console.log("  Usage:\tnode parsley.js /path/to/theme/file.json [/additional/theme/files.json ...]")
  process.exit(1)
}

const WARNING_GENERATED_FILE_MSG = '// THIS FILE IS GENERATED DO NOT MODIFY IT'

function cssVarRule(name, value) {
  return `${name}: ${value};`
}

function cssVarName(path) {
  return `--${path.join('-')}`
}

function generateThemeGlobs (inFile) {
  const filePath = path.resolve('.', inFile)
  console.log("READING", filePath)
  const theme = require(filePath)
  
  const flatMap = []
  
  function walkTree (node, path = []) {
    Object.entries(node).forEach(([key, value]) => {
      if (typeof value === 'string') {
        flatMap.push({ path: [...path, key], value })
      } else {
        walkTree(node[key], [...path, key])
      }
    })
  }
  
  walkTree(theme)
  
  function formatMap(flatMap) {
    const cssRules = []
    flatMap.forEach(flat => {
      let name = cssVarName(flat.path);
      let rule = cssVarRule(name, flat.value)
      cssRules.push(rule);
      let path = `theme.${flat.path.join('.')}`;
      eval(`${path} = "var(${name})"`)
    })
    return [`${WARNING_GENERATED_FILE_MSG}
import { css } from '@emotion/core'

export default css\`
  ${cssRules.join('\n  ')}
\`
`, theme]
  }
  
  
  return formatMap(flatMap)
} 

function publish(filename, outFolder, data) {
  fs.mkdir(outFolder, { recursive: true }, (err) => {
    if (err) throw err;
    let path = `${outFolder}/${filename}`
    fs.writeFile(path, data, (err) => {
      if (err) throw err;
      console.log(`"${path}" created.`)
    })
  });
}

// Actually iterate over the given theme files and generate the parsed data
const inFiles = process.argv.slice(2)
const outFolder = './dist'
let defaultThemeValues = null;
const themeGlobs = []

inFiles.forEach(inFile => {
  const outFilename = inFile.replace('.json', '.js');
  const [css, js] = generateThemeGlobs(inFile);
  defaultThemeValues = defaultThemeValues || js;
  publish(outFilename, outFolder, css)
  themeGlobs.push(outFilename.replace('.js', ''))
})

publish('index.js', outFolder, `${WARNING_GENERATED_FILE_MSG}
${themeGlobs.map(globName => `export { default as ${globName} } from './${globName}'`).join('\n')}

export const theme = ${JSON.stringify(defaultThemeValues, null, 2)}
`)