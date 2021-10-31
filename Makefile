export a = $(echo $CI_COMMIT_TAG | cut -d '-' -f4")
export TAG = CI_COMMIT_TAG

all: 
	echo ${PATH}

deps:
	echo ${PATH}
	echo ${ACTION}

eth-testnet-migrate: deps 
	echo ${PATH}
	echo ${ACTION}
	echo ${NETWORKS}
	echo ${a}
	echo ${TAG}
