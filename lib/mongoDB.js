const { MongoClient } = require("mongodb");

class mongoDBAdapter {
  constructor(url) {
    this.url = url;
    this.client = new MongoClient(this.url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    this.collectionName = "botData";
  }

  async read() {
    await this.client.connect();
    const db = this.client.db();
    const collection = db.collection(this.collectionName);
    const doc = await collection.findOne({ _id: "main" });
    this.data = doc ? doc.data : {};
  }

  async write() {
    const db = this.client.db();
    const collection = db.collection(this.collectionName);
    await collection.updateOne(
      { _id: "main" },
      { $set: { data: this.data } },
      { upsert: true },
    );
  }
}

module.exports = mongoDBAdapter;
