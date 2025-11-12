const fetch = require("node-fetch");

class cloudDBAdapter {
  constructor(url) {
    this.url = url;
  }

  async read() {
    let res = await fetch(this.url);
    if (!res.ok) throw new Error(`Error leyendo CloudDB: ${res.statusText}`);
    this.data = await res.json();
  }

  async write() {
    await fetch(this.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(this.data),
    });
  }
}

module.exports = cloudDBAdapter;
