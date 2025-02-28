import axios from 'axios'

export type CreateSignedUrlRequest = {
  fileName: string
}

export type CreateSignedUrlResponse = {
  url: string
}

export const createSignedUrl = async (request: CreateSignedUrlRequest) => {
  const response = await axios.post<CreateSignedUrlResponse>(
    `${import.meta.env.PUBLIC_API_URL}/aws/s3/presigned-url`,
    request,
  )

  return response.data
}
