found: nestedParam1
overwritten: overwritten
notFound: {{param.nestedParam2.nestedParam4}}
found: value
array: element1,additionalValue
overwritten: overwritten
notFound: {{ array[3] }}
templating: {param.nestedParam1},{param.nestedParam1}},{nestedParam1},{{{notFound}}}
templating2: {{param.nestedParam1
}}

one more line...