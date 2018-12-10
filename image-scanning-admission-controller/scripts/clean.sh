#!/bin/bash

set -eux

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

sed 's@{{.ANCHORE_USER}}@'"${ANCHORE_CLI_USER}"'@; s@{{.ANCHORE_URL}}@'"${ANCHORE_CLI_URL}"'@' image-scan-admission-webhook.yaml | kubectl delete -f -
kubectl delete ValidatingWebhookConfiguration validating-webhook-configuration || true
