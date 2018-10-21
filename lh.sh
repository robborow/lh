#!/usr/bin/env bash
set -e # Exit on error

echo "Running lighthouse tests..."

echo "TRAVIS_PULL_REQUEST"
echo "$TRAVIS_PULL_REQUEST"


echo "TRAVIS_PULL_REQUEST_SHA"
echo "$TRAVIS_PULL_REQUEST_SHA"

echo "TRAVIS_PULL_REQUEST_SLUG"
echo "$TRAVIS_PULL_REQUEST_SLUG"

echo "$DOCKER_PWD" | docker login --username $DOCKER_USER --password-stdin
docker run -it --net=host --rm --cap-add=SYS_ADMIN robborow/lighthouse-ci http://www.google.se --quite --output=json > report.json
npm run lighthouse-audit performance=90