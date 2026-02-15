FROM alpine:3.21

RUN apk add --no-cache bash curl jq opentofu openssh-client \
  && curl -1sLf 'https://dl.cloudsmith.io/public/infisical/infisical-cli/setup.alpine.sh' | bash \
  && apk add --no-cache infisical

WORKDIR /infra

ENTRYPOINT ["/bin/bash", "-c"]
CMD ["tofu plan"]
