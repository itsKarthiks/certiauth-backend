const express = require('express');
const router = express.Router();
const Project = require('../models/Project'); // This links to the file you just made above

// GET all projects
router.get('/', async (req, res) => {
    try {
        const projects = await Project.find();
        res.json(projects);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST a new project
router.post('/', async (req, res) => {
    const project = new Project({
        name: req.body.name,
        status: req.body.status,
        description: req.body.description
    });
    try {
        const newProject = await project.save();
        res.status(201).json(newProject);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// @route   PUT /api/projects/:id
// @desc    Update a project (Change status or fix typos)
router.put('/:id', async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: "Project not found" });

        // Only update fields that are actually sent
        if (req.body.name) project.name = req.body.name;
        if (req.body.status) project.status = req.body.status;
        if (req.body.description) project.description = req.body.description;

        const updatedProject = await project.save();
        res.json(updatedProject);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// @route   DELETE /api/projects/:id
// @desc    Delete a project completely
router.delete('/:id', async (req, res) => {
    try {
        const project = await Project.findByIdAndDelete(req.params.id);
        if (!project) return res.status(404).json({ message: "Project not found" });

        res.json({ message: "Project deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;