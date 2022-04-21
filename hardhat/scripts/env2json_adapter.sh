#! /bin/bash

FILE=${1}

#echo $(cat $FILE)
JSON_STRING=$( printf '%s\n' $(cat $FILE) | jq -nR '

def parse: capture("(?<y>[^=]*)=(?<value>.*)");

reduce inputs as $line ({};
   ($line | parse) as $p
   | .[$p.y] = ($p.value) )
')

#echo res = ${jq | res}
printf '%s\n' "$JSON_STRING" > ${FILE}.json
echo ${FILE}.json
