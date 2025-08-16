import { api } from '@/api/client'

export type CreateSignedUrlRequest = {
  fileName: string
}

export type CreateSignedUrlResponse = {
  url: string
}

export const createSignedUrl = async (request: CreateSignedUrlRequest) => {
  const response = await api.post<CreateSignedUrlResponse>(
    '/aws/s3/presigned-url',
    request,
  )

  return response.data
}

export type UploadFileRequest = {
  url: string
  file: File
}

export const uploadFile = async (request: UploadFileRequest) => {
  const response = await fetch(request.url, {
    method: 'PUT',
    body: request.file,
  })

  return response
}

type UploadFileToS3Request = {
  fileName: string
  file: File
}

export const uploadFileToS3 = async ({
  fileName,
  file,
}: UploadFileToS3Request) => {
  const { url } = await createSignedUrl({ fileName })

  await uploadFile({ url, file })
}

export const uploadFilesToS3 = async (files: FileList) => {
  const fileArray = Array.from(files)

  await Promise.all(
    fileArray.map((file) => uploadFileToS3({ fileName: file.name, file })),
  )
}
