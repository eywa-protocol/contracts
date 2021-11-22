from jinja2 import Template
from os import getenv

networks = getenv("CI_COMMIT_TAG").split('-')[3].split(',')
action = getenv("CI_COMMIT_TAG").split('-')[2]

action = "eth-testnet-migrate" if action == "deploy" else "wrappers"

print(networks)
print(action)

j2 = open('.scripts/job_template.j2').read()
t = Template(j2)

with open('generated-config.yml', 'a') as ci_config:
    ci_config.write(t.render(networks=networks, action=action,
                            CI_COMMIT_TAG=getenv("CI_COMMIT_TAG"),
                            eywa_base_image=getenv("EYWA_BASE_IMAGE"),
                            eywa_base_tag=getenv("EYWA_BASE_TAG")
                            )
                  )
