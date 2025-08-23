import { Router } from 'express';
import bcrypt from 'bcrypt';
import { isEmail, notEmpty } from '../utils/validation.js';
import { createUser } from '../models/userModel.js';
import { verifyToken, requireAdmin } from '../middleware/authMiddleware.js';


const router = Router();


// POST /api/admin/users (Admin create user)
router.post('/users', verifyToken, requireAdmin, async (req, res) => {
try {
const { first_name, last_name, username, email, password, role = 'client' } = req.body;


if (![first_name, last_name, username, email, password].every(notEmpty) || !isEmail(email)) {
return res.status(400).json({ message: 'Invalid fields' });
}


const password_hash = await bcrypt.hash(password, 10);
const user = await createUser({ first_name, last_name, username, email, password_hash, role });
res.status(201).json(user);
} catch (e) {
if (e.code === '23505') { // unique_violation
return res.status(409).json({ message: 'Username or email already exists' });
}
console.error(e);
res.status(500).json({ message: 'Server error' });
}
});


export default router;