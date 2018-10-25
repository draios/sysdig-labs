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
