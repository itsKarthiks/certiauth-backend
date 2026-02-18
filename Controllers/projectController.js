// TEMPORARY: Fake Database (Just an array)
let mockProjects = [
    {
        _id: "1",
        name: "Library System",
        description: "Manages books",
        status: "Completed",
        teamMember: "Gopal"
    },
    {
        _id: "2",
        name: "Portfolio Site",
        description: "Personal website",
        status: "Pending",
        teamMember: "George"
    }
];

// 1. Get All Projects
const getProjects = (req, res) => {
    // Later, this will be: await Project.find();
    res.status(200).json(mockProjects);
};

// 2. Create a Project
const createProject = (req, res) => {
    const { name, description, status } = req.body;
    
    // Simple Validation (Business Logic)
    if (!name || !description) {
        return res.status(400).json({ error: "Please fill in all fields" });
    }

    const newProject = {
        _id: Date.now().toString(), // Fake Random ID
        name,
        description,
        status: status || "Pending",
        teamMember: "You"
    };

    mockProjects.push(newProject); // Save to RAM
    res.status(201).json(newProject);
};

// 3. Delete a Project (Bonus Feature)
const deleteProject = (req, res) => {
    const { id } = req.params;
    mockProjects = mockProjects.filter((p) => p._id !== id);
    res.status(200).json({ message: "Project deleted" });
};

module.exports = { getProjects, createProject, deleteProject };