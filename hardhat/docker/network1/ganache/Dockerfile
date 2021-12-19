FROM node:14-alpine
WORKDIR /app
RUN npm install -g ganache-cli
EXPOSE 7545
CMD ganache-cli -h 0.0.0.0 -p 7545 -i 1111 --chainId 1111 --db /chaindata \
  --account="0x60cc6f7a3b09e5080dc86cc0fd80e29545683ad4336012b221998b448d2d57bb,1000000000000000000000000" \
  --account="0x187994e6d93bb29e386fe7ab50232a6a2bea5d6f61046b803b9e9b8306b7d268,1000000000000000000000000"