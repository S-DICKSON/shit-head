FROM alpine:3.21

RUN apk add --no-cache bash jq opentofu sops age

COPY scripts/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

WORKDIR /infra

ENTRYPOINT ["/entrypoint.sh"]
CMD ["plan"]
