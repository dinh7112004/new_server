const Staff = require('../models/Staff');

const staffController = {
  create: async (req, res) => {
    const { name, email, password, role } = req.body;
    const staff = new Staff({ name, email, password, role });
    await staff.save();
    res.status(201).json(staff);
  },
  get: async (req, res) => {
    const staff = await Staff.find();
    res.status(200).json(staff);
  },
  update: async (req, res) => {
    const { id } = req.params;
    const { name, email, password, role } = req.body;
    const staff = await Staff.findByIdAndUpdate(id, { name, email, password, role }, { new: true });
    res.status(200).json(staff);
  },
  delete: async (req, res) => {
    const { id } = req.params;
    await Staff.findByIdAndDelete(id);
    res.status(200).json({ message: 'Staff deleted successfully' });
  },
  getById: async (req, res) => {
    const { id } = req.params;
    const staff = await Staff.findById(id);
    res.status(200).json(staff);
  },
  getByEmail: async (req, res) => {
    const { email } = req.params;
    const staff = await Staff.findOne({ email });
    res.status(200).json(staff);
  },
  getByRole: async (req, res) => {
    const { role } = req.params;
    const staff = await Staff.find({ role });
    res.status(200).json(staff);
  },
};


exports.create = staffController.create;
exports.get = staffController.get;
exports.update = staffController.update;
exports.delete = staffController.delete;
exports.getById = staffController.getById;
exports.getByEmail = staffController.getByEmail;
exports.getByRole = staffController.getByRole;