# Paramplate

[![license: MIT](https://img.shields.io/badge/license-MIT-orange.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/paramplate.svg)](https://www.npmjs.com/package/paramplate)

Paramplate is a node CLI tool for code generation. It takes in values from parameter files, parses the template files and produces output files with rendered strings. The benefit of the tool is that you can use centralized parameter files and template files for scaffolding which  reduces repetitive work and avoids manual errors. 

## How it works
Here is a basic setup.

``` bash
projct
|-- param.json
|-- input
    |-- template.yaml.pp
|-- output
```

project/param.json contains all the parameters.
```json
{
  "app": {
    "name": "app1"
  },
  "envs": [
    "dev",
    "staging",
    "prod"
  ]
}
```

project/input/template.yaml.pp is the template file.
```yaml
name: {{ app.name }}
envs:
  - {{ envs.[0] }}
  - {{ envs.[1] }}
  - {{ envs.[2] }}
```

Run the paramplate command.

```bash
npx paramplate --params project/param.json --src project/input --dest project/output
```

It generates a new file with values rendered: project/output/template.yaml
```yaml
name: app1
envs:
  - dev
  - staging
  - prod
```

The CLI does a few things here:
1. Read the param.json, flatten the objects and store them in a map.
2. Find the template file: template.yaml.pp which has the template file extension in the source directory.
3. Parse the template file, remove the template file extension and write to destintion directory.


## Install & Run
Prerequisites
* node installed
* create your parameter json files, template files and define input/output directories

Use npx
```bash
npx paramplate --params param.json --src /input --dest /output
```

Use npm
```bash
npm install paramplate -g
paramplate --params param.json --src /input --dest /output
```

## Cli arguments

#### --params
Required. Accept a list of json files which contain the parameters used for templating. The values in the parameter files are loaded by order and can be overwritten. For example
```bash
--params /home/project/param1.json,/home/project/param2.json
```

#### --src
Required. The source directory where the input files are read. For example,
```bash
--src /home/project/input
```

#### --dest
Required. The destination directory where the output files are written.
For example,
```bash
--dest /home/project/output
```

#### --ext
Optional. Define the template file extension. After the template file is parsed, the template file extension will be removed in the destination directory. The default value is ".pp". For example, the template file can be my-config.yaml.customExt. After being parsed, the file generated is my-config.yaml.
```bash
--ext .customExt
```

#### --debug
Optional. Turn on debug logging.
```bash
--debug
```

## Templating
All objects defined in the parameter json files are flattened and stored in a Map which are used to match the mustache styled template. Json objects and array are supported.

param.json
```json
{
  "app": {
    "name": "app1"
  },
  "envs": [
    "dev",
    "staging",
    "prod"
  ]
}
```

template.yaml.pp
```yaml
name: {{ app.name }}
envs:
  - {{ envs.[0] }}
  - {{ envs.[1] }}
  - {{ envs.[2] }}
```

## Overwrite parameters
If there is more than one parameter file, the parameters defined earlier can be overwritten by later values with the same key. For example,

param1.json
```json
{
  "param": {
    "nestedParam2": {
      "nestedParam3": "nestedParam3"
    }
  },
  "array": [
    "element1",
    "element2"
  ]
}
```

param2.json
```json
{
  "param": {
    "nestedParam2": {
      "nestedParam3": "overwritten"
    }
  },
  "array": [
    "element1",
    "overwritten",
  ],
}
```

If we import parameter files in this order
```
npx paramplate --params param1.json,param2.json ...
```

Two vaules are overwritten here.
```bash
{{ array.[1] }}  # overwritten
{{ param.nestedPram2.nestedPram3 }} # overwritten
```

## Development
```bash
# Build
npm run build
# Test
npm run test
```

## License

[MIT](LICENSE.txt)