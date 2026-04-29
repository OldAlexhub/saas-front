// Settings service invoicing endpoints removed
const err = () => { throw new Error('Invoicing settings service not available.'); };
export const getInvoiceSettings = err;
export const updateInvoiceSettings = err;

export default { getInvoiceSettings, updateInvoiceSettings };
