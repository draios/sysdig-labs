#!/bin/bash

set -eux

kubectl delete -f image-scanning-admission-controller.yaml || true
kubectl delete ValidatingWebhookConfiguration validating-webhook-configuration || true
