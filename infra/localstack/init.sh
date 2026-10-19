#!/bin/bash
# Creates the KMS key (alias/cetus) and the documents bucket used in development.
set -euo pipefail
KEY_ID=$(awslocal kms create-key --query KeyMetadata.KeyId --output text)
awslocal kms create-alias --alias-name alias/cetus --target-key-id "$KEY_ID"
# Object Lock enabled like production; development sets no retention, so objects stay deletable.
awslocal s3api create-bucket --bucket cetus-documents --object-lock-enabled-for-bucket
echo "LocalStack ready: alias/cetus -> $KEY_ID, bucket cetus-documents"
