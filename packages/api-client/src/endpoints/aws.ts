import { defineResource } from '../core/define-resource'
import type { EndpointDefinition } from '../core/types'
import type {
  CreateSignedUrlRequest,
  CreateSignedUrlResponse,
} from '../types/aws'

const definitions = {
  generateSignedUrl: {
    method: 'POST',
    path: 'aws/s3/presigned-url',
  } as EndpointDefinition<CreateSignedUrlResponse, CreateSignedUrlRequest>,
}

export const awsApi = defineResource(definitions)
