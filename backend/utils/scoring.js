import natural from "natural";

// Calculate pairwise cosine similarity between answers
function getSimilarityMatrix(answers) {
  const tfidf = new natural.TfIdf();
  answers.forEach(a => tfidf.addDocument(a));
  const matrix = answers.map((a, i) => {
    return answers.map((b, j) => {
      if (i === j) return 1;
      return tfidf.tfidf(b, i);
    });
  });
  return matrix;
}

export function calculateConfidenceScores(answers, models) {
  const similarityMatrix = getSimilarityMatrix(answers);
  // Average similarity for each answer
  const similarityAverages = similarityMatrix.map(row => {
    return row.reduce((sum, val) => sum + val, 0) / row.length;
  });
  // Length similarity (normalized)
  const avgLength = answers.reduce((sum, a) => sum + a.length, 0) / answers.length;
  const lengthScores = answers.map(a => 1 - Math.abs(a.length - avgLength) / avgLength);
  // Final score: weighted sum
  return answers.map((answer, i) => {
    const weight = models[i].weight;
    const score = (similarityAverages[i] * 0.7 + lengthScores[i] * 0.3) * weight;
    return {
      model: models[i].name,
      answer,
      score: Math.round(score * 100)
    };
  });
}
