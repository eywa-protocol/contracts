import json
import sys

net_name = sys.argv[1]
with open('/app/.script/helper-hardhat-config.j2') as f:
    data = json.load(f)


new_file = data[net_name]["env_file"][0]
with open(new_file) as f:
    new_addresses = f.readlines()

for address in new_addresses:
    name = address.split('=')[0]
    addr = address.split('=')[1].strip()
    data[net_name][name] = addr

with open('/contracts/helper-hardhat-config.json', 'w') as f:
    json.dump(data, f, indent=4)
