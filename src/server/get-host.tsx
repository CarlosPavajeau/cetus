import { createServerFn } from "@tanstack/react-start";
import { getHeader, getHeaders } from "@tanstack/react-start/server";

export const getServerhost = createServerFn({ method: 'GET' }).handler(async () => {
    const host = getHeader('Host')!

    console.log('[INFO]: Request headers')
    console.log(getHeaders())

    return {
        host
    }
})