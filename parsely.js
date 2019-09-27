const inFile = process.argv[2]
const outFolder = process.argv[3] || './dist'

if (!inFile) {
  console.log("No theme file specified. Exiting.")
  console.log("  Usage:\tnode parsley.js /path/to/theme.json [/path/to/dist/output]")
  process.exit(1)
}

const fs = require('fs')
const theme = require(inFile)

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


function cssVarRule(name, value) {
  return `${name}: ${value};`
}

function cssVarName(path) {
  return `--${path.join('-')}`
}

function walkMap(flatMap) {
  const cssRules = []
  flatMap.forEach(flat => {
    let name = cssVarName(flat.path);
    let rule = cssVarRule(name, flat.value)
    cssRules.push(rule);
    let path = `theme.${flat.path.join('.')}`;
    eval(`${path} = "var(${name})"`)
  })
  return [`:root {
  ${cssRules.join('\n  ')} 
}
`, `import 'theme-constants.css'

export default ${JSON.stringify(theme, null, 2)}`]
}


let [css, js] = walkMap(flatMap)

function publish(filename, data) {
  fs.mkdir(outFolder, { recursive: true }, (err) => {
    if (err) throw err;
    let path = `${outFolder}/${filename}`
    fs.writeFile(path, data, (err) => {
      if (err) throw err;
      console.log(`"${path}" created.`)
    })
  });
}

publish('theme-constants.css', css)
publish('theme.js', js)