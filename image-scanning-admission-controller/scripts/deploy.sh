#!/bin/bash

set -e

if [[ -z "$ANCHORE_CLI_URL" ]]; then
	echo '$ANCHORE_CLI_URL is empty or unset'
	exit 1;
fi;

if [[ -z "$ANCHORE_CLI_USER" ]]; then
	echo '$ANCHORE_CLI_USER is empty or unset'
	exit 1;
fi;

if [[ -z "${ANCHORE_CLI_PASS+x}" ]]; then
	echo '${ANCHORE_CLI_PASS} is unset';
	exit 1;
fi;

sed 's@{{ANCHORE_CLI_URL}}@'"${ANCHORE_CLI_URL}"'@; s@{{ANCHORE_CLI_TOKEN}}@'"${ANCHORE_CLI_USER}"'@' image-scanning-admission-controller.yaml | kubectl apply -f -

set -ex
sleep 3
kubectl get all -n image-scan-k8s-webhook-system

