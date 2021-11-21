import json
from os import getenv

networks = getenv("CI_COMMIT_TAG").split('-')[3].split(',')

with open('/app/.scripts/helper-hardhat-config.j2') as f:
    data = json.load(f)


for net in networks:
    new_file = data[net]["env_file"][0]
    with open(new_file) as f:
        new_addresses = f.readlines()

    for address in new_addresses:
        try:
            name = address.split('=')[0]
        except:
            name = False

        try:
            addr = address.split('=')[1].strip()
        except:
            addr = False

        if addr:
            data[net][name] = addr

    with open('/contracts/helper-hardhat-config.json', 'w') as f:
        json.dump(data, f, indent=4)
