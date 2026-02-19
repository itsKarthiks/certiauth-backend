const express = require('express');
const router = express.Router();
const { getProjects, createProject, deleteProject } = require('../controllers/projectController');

// Clean Routes
router.get('/', getProjects);
router.post('/', createProject);
router.delete('/:id', deleteProject);

module.exports = router;