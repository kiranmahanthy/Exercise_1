#!/usr/bin/env bash
set -euo pipefail

# Build Docker image and run tests
IMAGE_NAME=exercise-1-test

docker build -t "$IMAGE_NAME" .
docker run --rm "$IMAGE_NAME"
