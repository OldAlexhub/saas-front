// Invoice service removed — accounting feature disabled
const err = () => { throw new Error('Accounting/invoice service is not available.'); };
export const listInvoices = err;
export const createInvoice = err;
export const getInvoice = err;
export const addPayment = err;
export const sendInvoice = err;
export const sendBatch = err;
export const createBatch = err;
export const updateInvoice = err;
export const deleteInvoice = err;

export default { listInvoices, createInvoice, getInvoice, addPayment, sendInvoice, sendBatch, createBatch, updateInvoice, deleteInvoice };
