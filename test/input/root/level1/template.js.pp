found: {{ param.nestedParam1 }}
overwritten: {{    param.nestedParam2.nestedParam3    }}
notFound: {{param.nestedParam2.nestedParam4}}
found: {{ value }}
array: {{ array[0] }},{{ array[2] }}
overwritten: {{ array[1] }}
notFound: {{ array[3] }}
templating: {param.nestedParam1},{param.nestedParam1}},{{{param.nestedParam1}}},{{{notFound}}}
templating2: {{param.nestedParam1
}}

one more line...