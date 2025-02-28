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

export type UploadFileRequest = {
  url: string
  file: File
}

export const uploadFile = async (request: UploadFileRequest) => {
  const response = await axios.put(request.url, request.file, {
    headers: {
      'Content-Type': request.file.type,
    },
  })

  return response
}

export const uploadFileToS3 = async (fileName: string, file: File) => {
  const { url } = await createSignedUrl({ fileName })

  await uploadFile({ url, file })
}

export const uploadFilesToS3 = async (files: FileList) => {
  const fileArray = Array.from(files)

  await Promise.all(fileArray.map((file) => uploadFileToS3(file.name, file)))
}
