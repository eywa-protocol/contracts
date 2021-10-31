
all:
	echo ${PATH}
	a=$(echo $CI_COMMIT_TAG | cut -d '-' -f4")

deps:
	echo ${PATH}
	echo ${ACTION}

eth-testnet-migrate: deps 
	echo ${PATH}
	echo ${ACTION}
	echo ${NETWORKS}
	echo ${a}
