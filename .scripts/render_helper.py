import json
from os import getenv

networks = getenv("CI_COMMIT_TAG").split('-')[3].split(',')

with open('/app/hardhat/helper-hardhat-config.json.example') as f:
    data = json.load(f)

for net in networks:
    new_file = f"/contracts/networks_env/env_{net}.json"
    with open(new_file) as f:
        new_addresses = json.load(f)

    for address in new_addresses:
        if address in data[net]:
            try:
                data[net][address] = new_addresses[address]
                #0x0000000000000000000000000000000000000000
            except Exception as e:
                print(e)

    with open('/contracts/helper-hardhat-config.json', 'w') as f:
        json.dump(data, f, indent=4)
