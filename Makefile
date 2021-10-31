
all:
	echo ${PATH}

deps:
	echo ${PATH}
	echo ${ACTION}

eth-testnet-migrate: deps 
	echo ${PATH}
	echo ${ACTION}
	echo ${NETWORKS}
	echo "echo $CI_COMMIT_TAG | cut -d '-' -f4"
