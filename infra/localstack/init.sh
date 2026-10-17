#!/bin/bash
# Creates the KMS key (alias/cetus) and the documents bucket used in development.
set -euo pipefail
KEY_ID=$(awslocal kms create-key --query KeyMetadata.KeyId --output text)
awslocal kms create-alias --alias-name alias/cetus --target-key-id "$KEY_ID"
awslocal s3 mb s3://cetus-documents
echo "LocalStack ready: alias/cetus -> $KEY_ID, bucket cetus-documents"
