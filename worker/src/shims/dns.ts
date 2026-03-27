// Shim: not used in Workers
export default {}
export const lookup = () => { throw new Error('dns not available in Workers') }
