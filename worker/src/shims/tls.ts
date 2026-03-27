// Shim: @neondatabase/serverless uses WebSocket, not tls
export default {}
export const connect = () => { throw new Error('tls not available in Workers') }
