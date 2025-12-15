const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    image: { type: String },
    images: [{ type: String }],


    description: [
      {
        field: String,
        value: String,
      },
    ],
    import_price: { type: Number, required: true },//giá nhập
    price: { type: Number, required: true },
    quantity: { type: Number, default: 0 },
    sold: { type: Number, default: 0 },

    category: { type: String },
    brand: { type: String },

    // sizes, sử dụng variations
    variations: [
      {
        color: { type: String, required: true },
        size: { type: String, required: true },
        quantity: { type: Number, required: true, min: 0 },
      }
    ],

    status: { type: String, default: "Đang bán" },

    is_featured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ProductSchema.index({ price: 1 });
ProductSchema.index({ sold: -1 });

module.exports = mongoose.model("Product", ProductSchema);
