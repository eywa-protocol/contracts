import json
import sys

net_name = sys.argv[1]
with open('/app/.scripts/helper-hardhat-config.j2') as f:
    data = json.load(f)


new_file = data[net_name]["env_file"][0]
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
        data[net_name][name] = addr

with open('/contracts/helper-hardhat-config.json', 'w') as f:
    json.dump(data, f, indent=4)
