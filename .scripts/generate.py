from jinja2 import Template
from os import getenv

networks = getenv("CI_COMMIT_TAG").split('-')[3]
action = getenv("CI_COMMIT_TAG").split('-')[2]

j2 = open('.scripts/job_template.j2').read()
t = Template(j2)

for network in networks:
    with open('generated-config.yml', 'a') as ci_config:
        ci_config.write(t.render(network=network, action=action))
