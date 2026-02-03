export const safeRequest = async <T>(
    promise: PromiseLike<T>,
    timeout = 10000,
    errorMessage = 'A solicitação excedeu o tempo limite. Tente novamente.'
): Promise<T> => {
    let timeoutHandle: NodeJS.Timeout

    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error(errorMessage)), timeout)
    })

    return Promise.race([
        Promise.resolve(promise).then((result) => {
            clearTimeout(timeoutHandle)
            return result
        }),
        timeoutPromise.then(() => {
            clearTimeout(timeoutHandle)
            throw new Error('Unreachable')
        })
    ])
}
