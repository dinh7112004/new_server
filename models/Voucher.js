const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Voucher = new Schema({
  code: { type: String, required: true },
  discount: { type: Number, required: true },
  expiration_date: { type: Date, required: true },
});

module.exports = mongoose.model('Voucher', Voucher);