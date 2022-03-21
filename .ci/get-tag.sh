#!/bin/bash
set -a

line="$CI_COMMIT_TAG"

IFS='-' read -ra tag_list <<< "$line"

FOLDER=${tag_list[0]}
INC=${tag_list[1]}
NETWORKS=${tag_list[2]}

echo "FOLDER=$FOLDER" > ./tmp_src
echo "NETWORKS=$NETWORKS" >> ./tmp_src
