#! /bin/bash


mkdir -p /contracts/networks_env
MODE=${1}
FILENAME=${2}
if [[ "$MODE" =~ ^(create)$ ]]
then
 rm ./${FILENAME} 2> /dev/null
fi

i=0
for pass in "${@:3}"
do
    # update or create
    if [[ "$MODE" =~ ^(create)$ ]]
    then
cat << EOF > ${FILENAME}
${pass}
EOF
     else
cat << EOF > ${FILENAME}
${pass}
EOF
    fi

    i=$((i+1))
done
