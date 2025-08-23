export const isEmail = (v) => /.+@.+\..+/.test(v);
export const notEmpty = (v) => typeof v === 'string' && v.trim().length > 0;