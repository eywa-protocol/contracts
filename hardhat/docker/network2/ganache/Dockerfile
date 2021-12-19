FROM node:14-alpine
WORKDIR /app
RUN npm install -g ganache-cli
EXPOSE 8545
CMD ganache-cli -h 0.0.0.0 -p 8545 -i 1112 --chainId 1112 --db /chaindata \
  --account="0x72a21bf9881eff3ab6e4bd245074cdbb6631388e22318bd4f5df2752b69222cc,1000000000000000000000000" \
  --account="0x187994e6d93bb29e386fe7ab50232a6a2bea5d6f61046b803b9e9b8306b7d268,1000000000000000000000000"