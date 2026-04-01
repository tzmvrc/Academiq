import { Router } from 'express';
import {
  getUserProfile,
  updateUserProfile,
  getUserStats,
} from '../services/profile/profile_controller.js';

const router = Router();

router.get('/ping', (req, res) => res.json({ message: 'profile router works' }));


router.get('/:id', getUserProfile);
router.put('/:id', updateUserProfile);
router.get('/:id/stats', getUserStats);

export default router;