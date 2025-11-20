import { authenticatedClient } from '../core/instance'
import type {
  CreateSignedUrlRequest,
  CreateSignedUrlResponse,
} from '../types/aws'

export const awsApi = {
  generateSignedUrl: (data: CreateSignedUrlRequest) =>
    authenticatedClient.post<CreateSignedUrlResponse>(
      'aws/s3/presigned-url',
      data,
    ),
}
