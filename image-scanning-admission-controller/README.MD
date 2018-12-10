## Prerequiste
- k8s cluster is ready and kubeconfig(~/.kube/config) is properly configured that can be leveraged by kubectl tool
- Have the following enviroment variables setup: 
  - ANCHORE_CLI_URL
  - ANCHORE_CLI_USER
  - ANCHORE_CLI_PASS

## Deploy Image Scan Admission Webhook
run `make deploy`

## Clean Image Scan Admission Webhook from Cluster
run `make clean`

## Test
run `make test`
