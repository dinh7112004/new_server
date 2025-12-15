const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  user_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    unique: true // Mỗi user chỉ có 1 giỏ hàng
  },
  items: [
    {
      product_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Product', 
        required: true 
      },
      name: { type: String, required: true },
      image: { type: String },
      size: { type: String, required: true },
      color: { type: String, required: true },
      quantity: { type: Number, required: true, min: 1 },
      price: { type: Number, required: true }
    }
  ]
}, {
  timestamps: true
});

module.exports = mongoose.model('Cart', cartSchema);
