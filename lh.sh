#!/usr/bin/env bash
set -e # Exit on error

echo "Running lighthouse tests..."

docker login --username $ARTIFACTORY_USER --password $ARTIFACTORY_PWD containers.schibsted.io
docker run -it --net=host --rm --cap-add=SYS_ADMIN containers.schibsted.io/smp-distribution/lighthouse-ci http://www.google.se --output=json