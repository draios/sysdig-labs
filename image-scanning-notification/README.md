# image-scanning-notifications

Send an email with the result of the latest image scanning.

## How?

Make sure you have `node` and `npm` installed (preferrably the latest version).

Then, install the tool:

```
npm ci
```

And finally, send the email:

```
node index \
  --sysdig-url https://secure.sysdig.com/ \
  --sysdig-token xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx \
  --sender notifications@sysdig.com \
  --recipient davide@sysdig.com \
  --image sha256:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx \
  --smtp-host email-smtp.example.com \
  --smtp-port 587 \
  --smtp-user xxxxxxxxx \
  --smtp-pass xxxxxxxxx
```

You can find your API token at https://secure.sysdig.com/#/settings/user (or your onprem Sysdig deployment URL).

Also, make sure you specify the repository tag digest in the `image` parameter.

## How about Jenkins?

Yes, you can!

Here's an example of Jenkins pipeline:

```
pipeline {
    agent {
        dockerfile {
            label 'builder'
        }
    }
    environment {
        SYSDIG_TOKEN = "xxx"
        IMAGE_ID     = "sha256:990e1f57798f433364379cf2583702d843defb7630d8d1bb12dcdc6ce3d91ddb"
    }

    stages {
        stage('Prepare image scanning notification') {
            steps {
                git url: "https://github.com/draios/sysdig-labs", branch: "master", credentialsId: "github-jenkins-user-token"

                sh "cd image-scanning-notification && npm ci"
            }
        }
        
        stage('Scanning') {
            steps {
                echo "Scanning image ${IMAGE_ID}..."
                sh "sleep 3"
                echo "Done!"
            }
        }

        stage('Send image scanning notification') {
            environment {
                SMTP_HOST    = "email-smtp.example.com"
                SMTP_PORT    = 587
                SENDER       = "notifications@sysdig.com"
                RECIPIENT    = "davide@sysdig.com"
            }
            steps {
                withCredentials(
                    [
                        usernamePassword(
                            credentialsId: 'smtp',
                            usernameVariable: 'SMTP_USER',
                            passwordVariable: 'SMTP_PASS')
                    ]
                ) {
                    sh("cd image-scanning-notification && \
                        node index.js \
                        --sysdig-url https://secure.sysdig.com/  \
                        --sysdig-token ${SYSDIG_TOKEN} \
                        --image ${IMAGE_ID} \
                        --sender ${SENDER} \
                        --recipient ${RECIPIENT} \
                        --smtp-host ${SMTP_HOST} \
                        --smtp-port ${SMTP_PORT} \
                        --smtp-user ${SMTP_USER} \
                        --smtp-pass ${SMTP_PASS}")
                }
            }
        }
    }
}
```

Done!
