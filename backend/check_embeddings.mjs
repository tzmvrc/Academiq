import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function checkEmbeddings() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/academiq', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    const db = mongoose.connection.db;
    const forumsCollection = db.collection('forums');

    // Count forums with embeddings
    const withEmbeddings = await forumsCollection.countDocuments({ 
      embedding: { $exists: true, $ne: null } 
    });

    // Count forums without embeddings
    const withoutEmbeddings = await forumsCollection.countDocuments({ 
      embedding: { $exists: false } 
    });

    // Count forums with null embeddings
    const nullEmbeddings = await forumsCollection.countDocuments({ 
      embedding: null 
    });

    // Get a sample embedding
    const sampleWithEmbedding = await forumsCollection.findOne({ 
      embedding: { $exists: true, $ne: null } 
    });

    console.log('=== EMBEDDING STATUS ===');
    console.log('Forums with embeddings:', withEmbeddings);
    console.log('Forums without embeddings field:', withoutEmbeddings);
    console.log('Forums with null embeddings:', nullEmbeddings);
    console.log('Total forums:', withEmbeddings + withoutEmbeddings + nullEmbeddings);
    console.log('');
    console.log('=== SAMPLE EMBEDDING ===');
    if (sampleWithEmbedding) {
      console.log('Forum ID:', sampleWithEmbedding._id);
      console.log('Embedding type:', typeof sampleWithEmbedding.embedding);
      console.log('Is array:', Array.isArray(sampleWithEmbedding.embedding));
      if (Array.isArray(sampleWithEmbedding.embedding)) {
        console.log('Array length:', sampleWithEmbedding.embedding.length);
        console.log('First 5 values:', sampleWithEmbedding.embedding.slice(0, 5));
        console.log('Data type of first element:', typeof sampleWithEmbedding.embedding[0]);
      } else {
        console.log('Embedding value (first 100 chars):', JSON.stringify(sampleWithEmbedding.embedding).substring(0, 100));
      }
    } else {
      console.log('No forums with embeddings found');
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkEmbeddings();
