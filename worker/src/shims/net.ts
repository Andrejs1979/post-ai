// Shim: @neondatabase/serverless uses WebSocket, not net
export default {}
export const Socket = class {}
export const createConnection = () => { throw new Error('net not available in Workers') }
export const connect = createConnection
