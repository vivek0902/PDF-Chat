import { QdrantClient } from "@qdrant/js-client-rest";

const client = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

async function resetCollection() {
  let vectorsConfig = { size: 768, distance: "Cosine" };

  try {
    const existing = await client.getCollection("documents");
    const existingVectors = existing?.config?.params?.vectors;
    if (existingVectors) {
      vectorsConfig = existingVectors;
    }
  } catch {}

  try {
    await client.deleteCollection("documents");
    console.log("Deleted collection: documents");
  } catch (error) {
    console.log("Delete skipped:", error?.message || "not found");
  }

  await client.createCollection("documents", {
    vectors: vectorsConfig,
  });

  const info = await client.getCollection("documents");
  console.log("Created collection: documents");
  console.log("Status:", info?.status || "ok");
  console.log("Points count:", info?.points_count ?? 0);
}

resetCollection().catch((error) => {
  console.error(error);
  process.exit(1);
});
