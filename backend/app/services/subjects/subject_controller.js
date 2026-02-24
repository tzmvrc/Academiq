import { SubjectModel } from "../../models/subject_model.js";

function generateSlug(text) {
    return text.toLowerCase().replace(/\s+/g, "-");
}

export const SubjectsController = {

    // GET /api/subjects/:topicId
    async getSubjectsByTopic(req, res) {
        try {
            const { topicId } = req.params;

            const subjects = await SubjectModel.getByTopic(topicId);

            res.json({ subjects });
        } catch (err) {
            console.error("Get Subjects Error:", err);
            res.status(500).json({ error: "Failed to fetch subjects" });
        }
    },

    // POST /api/subjects
    async createSubject(req, res) {
        try {
            const { name, topicId } = req.body;
            const userId = req.user.id;

            if (!name || !topicId) {
                return res.status(400).json({ error: "Name and topicId required" });
            }

            // Check if exists
            let subject = await SubjectModel.findByNameAndTopic(name, topicId);

            if (!subject) {
                subject = await SubjectModel.create({
                    name,
                    slug: generateSlug(name),
                    topicId,
                    userId,
                });
            }

            res.json({ subject });
        } catch (err) {
            console.error("Create Subject Error:", err);
            res.status(500).json({ error: "Failed to create subject" });
        }
    },
};