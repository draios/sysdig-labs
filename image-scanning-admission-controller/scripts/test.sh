#!/bin/bash

set -exu

nginx_deployment="nginx"
apache_deployment="apache-structs2"

kubectl delete deployment $nginx_deployment $apache_deployment || true

# pod should be brought up (depends on the associated policy)
kubectl run --image=nginx $nginx_deployment

# pod cannot be created due to high/critical vulnerability has been found (depends on the associated policy)
kubectl run --image=kaizheh/apache-struts2-cve-2017-5638 $apache_deployment

sleep 5

kubectl get deployments
